import React, { useState } from 'react';
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
// import { Typography } from 'antd';
import { TaskCard } from './TaskCard';
import { KanbanColumn } from './KanbanColumn';
import type { Task, TaskWithAssignee, TaskStatus } from '@simple-todo-app/shared';

// const { Title } = Typography;

interface KanbanBoardProps {
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

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onTaskStatusChange,
  onTaskReorder,
  loading = false,
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        {TASK_STATUSES.map(({ status, title, color }) => {
          const columnTasks = getTasksByStatus(status);
          return (
            <SortableContext
              key={status}
              items={columnTasks.map((task: Task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <KanbanColumn
                title={title}
                status={status}
                color={color}
                tasks={columnTasks}
                loading={loading}
              />
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