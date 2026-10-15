import React, { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  TouchSensor,
  KeyboardSensor,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useSwipeable } from 'react-swipeable';
import { LeftOutlined, RightOutlined, ExpandOutlined, CompressOutlined } from '@ant-design/icons';
import { TaskCard } from './TaskCard';
import { MobileKanbanColumn } from './MobileKanbanColumn';
import type { Task, TaskWithAssignee, TaskStatus } from '@simple-todo-app/shared';

interface MobileKanbanBoardProps {
  tasks: TaskWithAssignee[];
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onTaskReorder: (taskId: string, newOrder: number, newStatus?: TaskStatus) => Promise<void>;
  loading?: boolean;
}

const TASK_STATUSES: Array<{ status: TaskStatus; title: string; color: string }> = [
  { status: 'TODO', title: 'Todo', color: '#1890ff' },
  { status: 'IN_PROGRESS', title: 'Doing', color: '#faad14' },
  { status: 'DONE', title: 'Done', color: '#52c41a' },
];

export const MobileKanbanBoard: React.FC<MobileKanbanBoardProps> = ({
  tasks,
  onTaskStatusChange,
  onTaskReorder,
  loading = false,
}) => {
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null);
  const [currentColumnIndex, setCurrentColumnIndex] = useState(0);
  const [isHorizontalMode, setIsHorizontalMode] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Longer delay for mobile to prevent conflicts with swipe
        tolerance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.order - b.order);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback handled in columns
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id.toString();
    
    const isDroppedOnColumn = TASK_STATUSES.some(({ status }) => status === overId);
    
    if (isDroppedOnColumn) {
      const newStatus = overId as TaskStatus;
      if (activeTask.status !== newStatus) {
        await onTaskStatusChange(activeTask.id, newStatus);
      }
      return;
    }

    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) return;

    if (activeTask.id === overTask.id) return;

    const activeStatus = activeTask.status;
    const overStatus = overTask.status;

    if (activeStatus === overStatus) {
      const tasksInColumn = getTasksByStatus(activeStatus);
      const activeIndex = tasksInColumn.findIndex((t) => t.id === activeTask.id);
      const overIndex = tasksInColumn.findIndex((t) => t.id === overTask.id);

      if (activeIndex !== overIndex) {
        const reorderedTasks = arrayMove(tasksInColumn, activeIndex, overIndex);
        const newOrder = reorderedTasks.findIndex((t) => t.id === activeTask.id);
        await onTaskReorder(activeTask.id, newOrder);
      }
    } else {
      const newOrder = overTask.order;
      await onTaskReorder(activeTask.id, newOrder, overStatus);
    }
  };

  const scrollToColumn = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const columnWidth = container.clientWidth * 0.85; // 85% of viewport width per column
      const scrollPosition = index * columnWidth;
      
      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
      setCurrentColumnIndex(index);
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const columnWidth = container.clientWidth * 0.85;
      const scrollLeft = container.scrollLeft;
      const newIndex = Math.round(scrollLeft / columnWidth);
      
      if (newIndex !== currentColumnIndex && newIndex >= 0 && newIndex < TASK_STATUSES.length) {
        setCurrentColumnIndex(newIndex);
      }
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [currentColumnIndex]);

  const canGoLeft = currentColumnIndex > 0;
  const canGoRight = currentColumnIndex < TASK_STATUSES.length - 1;

  // Swipe gesture handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (canGoRight) {
        scrollToColumn(currentColumnIndex + 1);
      }
    },
    onSwipedRight: () => {
      if (canGoLeft) {
        scrollToColumn(currentColumnIndex - 1);
      }
    },
    trackMouse: false,
    trackTouch: true,
    delta: 10,
    preventScrollOnSwipe: false,
    touchEventOptions: { passive: true },
  });

  const renderHorizontalMode = () => (
    <div className="flex flex-col h-full">
      {/* Navigation Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <button
          onClick={() => scrollToColumn(currentColumnIndex - 1)}
          disabled={!canGoLeft}
          className={`p-2 rounded-full transition-colors ${
            canGoLeft 
              ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100' 
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <LeftOutlined className="text-lg" />
        </button>
        
        <div className="flex items-center gap-2">
          {TASK_STATUSES.map((status, index) => (
            <button
              key={status.status}
              onClick={() => scrollToColumn(index)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                index === currentColumnIndex 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {status.title}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsHorizontalMode(false)}
            className="p-2 rounded-full text-gray-600 hover:bg-gray-50 active:bg-gray-100"
            title="Vertical mode"
          >
            <CompressOutlined className="text-lg" />
          </button>
          <button
            onClick={() => scrollToColumn(currentColumnIndex + 1)}
            disabled={!canGoRight}
            className={`p-2 rounded-full transition-colors ${
              canGoRight 
                ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100' 
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <RightOutlined className="text-lg" />
          </button>
        </div>
      </div>

      {/* Scrollable Kanban Container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
        {...swipeHandlers}
      >
        <div className="flex h-full min-w-max">
          {TASK_STATUSES.map(({ status, title, color }, index) => {
            const columnTasks = getTasksByStatus(status);
            return (
              <div
                key={status}
                className="flex-shrink-0 px-2"
                style={{
                  width: '85vw',
                  scrollSnapAlign: 'start'
                }}
              >
                <SortableContext
                  items={columnTasks.map((task: Task) => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <MobileKanbanColumn
                    title={title}
                    status={status}
                    color={color}
                    tasks={columnTasks}
                    loading={loading}
                    isActive={index === currentColumnIndex}
                  />
                </SortableContext>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderVerticalMode = () => (
    <div className="flex flex-col h-full">
      {/* Mode Toggle Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800">Kanban Board</h3>
        <button
          onClick={() => setIsHorizontalMode(true)}
          className="p-2 rounded-full text-gray-600 hover:bg-gray-50 active:bg-gray-100"
          title="Horizontal mode"
        >
          <ExpandOutlined className="text-lg" />
        </button>
      </div>

      {/* Vertical Columns */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {TASK_STATUSES.map(({ status, title, color }) => {
          const columnTasks = getTasksByStatus(status);
          return (
            <SortableContext
              key={status}
              items={columnTasks.map((task: Task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <MobileKanbanColumn
                title={title}
                status={status}
                color={color}
                tasks={columnTasks}
                loading={loading}
                isActive={true}
              />
            </SortableContext>
          );
        })}
      </div>
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {isHorizontalMode ? renderHorizontalMode() : renderVerticalMode()}

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 scale-105">
            <TaskCard task={activeTask} isDragOverlay />
          </div>
        ) : null}
      </DragOverlay>

      {/* Optimized styles for mobile performance */}
      <style jsx>{`
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
        
        /* Hardware acceleration for smooth scrolling */
        .overflow-x-auto {
          transform: translateZ(0);
          will-change: transform;
        }
        
        /* Optimize touch interactions */
        .overflow-x-auto * {
          touch-action: manipulation;
        }
        
        /* Reduce repaints during animations */
        .transition-all {
          will-change: transform, opacity;
        }
      `}</style>
    </DndContext>
  );
};