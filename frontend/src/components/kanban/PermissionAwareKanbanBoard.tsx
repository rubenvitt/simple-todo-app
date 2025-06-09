import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
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
} from '@dnd-kit/sortable';
import { PermissionAwareTaskCard } from './PermissionAwareTaskCard';
import { PermissionAwareKanbanColumn } from './PermissionAwareKanbanColumn';
import { usePermissions } from '../../hooks';
import type { TaskWithAssignee, TaskStatus } from '@simple-todo-app/shared';

interface PermissionAwareKanbanBoardProps {
  tasks: TaskWithAssignee[];
  listId: string;
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onTaskReorder?: (taskId: string, newOrder: number, newStatus?: TaskStatus) => Promise<void>;
  onEditTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  loading?: boolean;
}

const TASK_STATUSES: Array<{ status: TaskStatus; title: string; color: string }> = [
  { status: 'TODO', title: 'Todo', color: '#1890ff' },
  { status: 'IN_PROGRESS', title: 'Doing', color: '#faad14' },
  { status: 'DONE', title: 'Done', color: '#52c41a' },
];

export const PermissionAwareKanbanBoard: React.FC<PermissionAwareKanbanBoardProps> = ({
  tasks,
  listId,
  onTaskStatusChange,
  onTaskReorder: _onTaskReorder,
  onEditTask,
  onDeleteTask,
  loading = false,
}) => {
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null);
  const permissions = usePermissions({ listId });

  // Debug permissions
  console.log('🔐 Permissions debug:', { 
    listId, 
    canEdit: permissions.canEdit, 
    canView: permissions.canView,
    userPermission: permissions.userPermission 
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    console.log('🎯 Drag start:', { activeId: event.active.id, canEdit: permissions.canEdit });
    if (!permissions.canEdit) {
      console.log('❌ Drag blocked: No edit permission');
      return;
    }
    
    const task = tasks.find(t => t.id === event.active.id);
    if (task) {
      console.log('✅ Drag started for task:', task.title);
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!permissions.canEdit) return;
    console.log('🔄 Drag over:', { activeId: event.active.id, overId: event.over?.id });
    
    // Provide feedback for cross-column dragging
    const { active, over } = event;
    if (!over) return;
    
    const activeTask = tasks.find(t => t.id === active.id);
    const overId = over.id as string;
    
    // Check if we're dragging over a different column
    const isOverColumn = TASK_STATUSES.some(status => status.status === overId);
    const isOverTask = tasks.some(t => t.id === overId);
    
    if (activeTask && (isOverColumn || isOverTask)) {
      let targetStatus = overId;
      if (isOverTask) {
        const targetTask = tasks.find(t => t.id === overId);
        targetStatus = targetTask?.status || overId;
      }
      
      if (activeTask.status !== targetStatus) {
        console.log('✨ Cross-column drag detected:', { 
          from: activeTask.status, 
          to: targetStatus 
        });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log('🏁 Drag end:', { 
      activeId: event.active.id, 
      overId: event.over?.id, 
      canEdit: permissions.canEdit 
    });

    if (!permissions.canEdit) {
      console.log('❌ Drag end blocked: No edit permission');
      setActiveTask(null);
      return;
    }

    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) {
      console.log('⚠️ Drag end: No drop target or same position');
      return;
    }

    const taskId = active.id as string;
    let newStatus = over.id as string;

    console.log('🔄 Status change attempt:', { taskId, overId: newStatus });

    // First check if it's directly a column status
    const isDirectColumnDrop = TASK_STATUSES.some(status => status.status === newStatus);
    
    if (isDirectColumnDrop) {
      console.log('✅ Direct column drop detected:', newStatus);
    } else {
      // If dropped on another task, find the status of that task's column
      const targetTask = tasks.find(t => t.id === newStatus);
      if (targetTask) {
        newStatus = targetTask.status;
        console.log('🔄 Dropped on task, using column status:', { targetTaskStatus: newStatus });
      } else {
        console.log('⚠️ Could not find target task for ID:', newStatus);
        console.log('📋 Available tasks:', tasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
        return; // Exit if we can't determine the target
      }
    }

    // Execute status change
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      console.log('✅ Executing status change:', { 
        taskTitle: task.title, 
        oldStatus: task.status, 
        newStatus 
      });
      try {
        await onTaskStatusChange(taskId, newStatus as TaskStatus);
        console.log('✅ Status change successful');
      } catch (error) {
        console.error('❌ Error changing task status:', error);
      }
    } else if (!task) {
      console.log('⚠️ Task not found:', taskId);
    } else {
      console.log('⚠️ No status change needed (same status):', { current: task.status, target: newStatus });
    }
  };

  // Group tasks by status
  const tasksByStatus = TASK_STATUSES.reduce((acc, statusInfo) => {
    acc[statusInfo.status] = tasks.filter(task => task.status === statusInfo.status);
    return acc;
  }, {} as Record<TaskStatus, TaskWithAssignee[]>);

  // Group tasks by status for sortable context

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Single SortableContext for all tasks to enable cross-column dragging */}
      <SortableContext
        items={tasks.map(task => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
          {TASK_STATUSES.map(({ status, title, color }) => {
            const columnTasks = tasksByStatus[status] || [];
            
            return (
              <PermissionAwareKanbanColumn
                key={status}
                title={title}
                status={status}
                color={color}
                tasks={columnTasks}
                listId={listId}
                loading={loading}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
              />
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeTask && (
          <PermissionAwareTaskCard 
            task={activeTask} 
            listId={listId}
            isDragOverlay 
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};