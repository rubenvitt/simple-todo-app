import React, { useState, useMemo } from 'react';
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
import { TaskCard } from './TaskCard';
import { VirtualizedKanbanColumn } from './VirtualizedKanbanColumn';
import type { Task, TaskWithAssignee, TaskStatus } from '@simple-todo-app/shared';

interface VirtualizedKanbanBoardProps {
  tasks: TaskWithAssignee[];
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onTaskReorder: (taskId: string, newOrder: number, newStatus?: TaskStatus) => Promise<void>;
  onTaskClick?: (taskId: string) => void;
  loading?: boolean;
  columnHeight?: number;
  estimatedTaskHeight?: number;
  enableVirtualScrolling?: boolean;
  virtualScrollThreshold?: number; // Minimum number of tasks per column to enable virtual scrolling
}

const TASK_STATUSES: Array<{ status: TaskStatus; title: string; color: string }> = [
  { status: 'BACKLOG', title: 'Backlog', color: '#8c8c8c' },
  { status: 'TODO', title: 'Todo', color: '#1890ff' },
  { status: 'IN_PROGRESS', title: 'Doing', color: '#faad14' },
  { status: 'REVIEW', title: 'Review', color: '#722ed1' },
  { status: 'DONE', title: 'Done', color: '#52c41a' },
];

export const VirtualizedKanbanBoard: React.FC<VirtualizedKanbanBoardProps> = ({
  tasks,
  onTaskStatusChange,
  onTaskReorder,
  onTaskClick,
  loading = false,
  columnHeight = 600,
  estimatedTaskHeight = 120,
  enableVirtualScrolling = true,
  virtualScrollThreshold = 20,
}) => {
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement threshold
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoize task grouping by status for better performance
  const tasksByStatus = useMemo(() => {
    const groups: Record<TaskStatus, TaskWithAssignee[]> = {
      BACKLOG: [],
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
    };

    tasks.forEach((task) => {
      if (groups[task.status]) {
        groups[task.status].push(task);
      }
    });

    // Sort tasks by order within each status
    Object.keys(groups).forEach((status) => {
      groups[status as TaskStatus].sort((a, b) => a.order - b.order);
    });

    return groups;
  }, [tasks]);

  const getTasksByStatus = (status: TaskStatus) => {
    return tasksByStatus[status] || [];
  };

  // Determine if virtual scrolling should be used for a specific column
  const shouldUseVirtualScrolling = (tasks: TaskWithAssignee[]) => {
    return enableVirtualScrolling && tasks.length >= virtualScrollThreshold;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // We can add visual feedback here if needed
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id.toString();
    
    // Check if dropping on a column
    const isDroppedOnColumn = TASK_STATUSES.some(({ status }) => status === overId);
    
    if (isDroppedOnColumn) {
      const newStatus = overId as TaskStatus;
      if (activeTask.status !== newStatus) {
        await onTaskStatusChange(activeTask.id, newStatus);
      }
      return;
    }

    // Check if reordering within the same column or moving to different task
    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) return;

    // If same task, do nothing
    if (activeTask.id === overTask.id) return;

    const activeStatus = activeTask.status;
    const overStatus = overTask.status;

    if (activeStatus === overStatus) {
      // Reordering within same column
      const tasksInColumn = getTasksByStatus(activeStatus);
      const activeIndex = tasksInColumn.findIndex((t) => t.id === activeTask.id);
      const overIndex = tasksInColumn.findIndex((t) => t.id === overTask.id);

      if (activeIndex !== overIndex) {
        const reorderedTasks = arrayMove(tasksInColumn, activeIndex, overIndex);
        const newOrder = reorderedTasks.findIndex((t) => t.id === activeTask.id);
        await onTaskReorder(activeTask.id, newOrder);
      }
    } else {
      // Moving to different column
      const newOrder = overTask.order;
      await onTaskReorder(activeTask.id, newOrder, overStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 h-full">
        {TASK_STATUSES.map(({ status, title, color }) => {
          const columnTasks = getTasksByStatus(status);
          const useVirtualScrolling = shouldUseVirtualScrolling(columnTasks);
          
          return (
            <SortableContext
              key={status}
              items={columnTasks.map((task: Task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {useVirtualScrolling ? (
                <VirtualizedKanbanColumn
                  title={`${title} (Virtual)`}
                  status={status}
                  color={color}
                  tasks={columnTasks}
                  loading={loading}
                  height={columnHeight}
                  estimatedItemSize={estimatedTaskHeight}
                  onTaskClick={onTaskClick}
                />
              ) : (
                <div
                  className="flex flex-col h-full transition-all duration-200"
                  style={{ height: columnHeight }}
                >
                  <div 
                    className="text-sm text-gray-500 mb-2 px-2"
                    title="Normale Ansicht - Virtual Scrolling wird ab 20 Tasks aktiviert"
                  >
                    {title} ({columnTasks.length} Tasks)
                  </div>
                  {/* Fallback zur normalen KanbanColumn für wenige Tasks */}
                  <div className="flex-1 overflow-y-auto space-y-3 px-2">
                    {columnTasks.map((task) => (
                      <div 
                        key={task.id}
                        onDoubleClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
                        style={{ cursor: onTaskClick ? 'pointer' : 'default' }}
                      >
                        <TaskCard 
                          task={task}
                        />
                      </div>
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="border-2 border-dashed rounded-lg p-8 text-center text-gray-400">
                        <p className="mb-0">Keine Aufgaben</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </SortableContext>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 scale-105">
            <TaskCard task={activeTask} isDragOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};