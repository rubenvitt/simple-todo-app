import React, { useState, useMemo } from 'react';
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
import { Switch, Typography } from 'antd';
import { PermissionAwareTaskCard } from './PermissionAwareTaskCard';
import { FixedPermissionAwareKanbanColumn } from './FixedPermissionAwareKanbanColumn';
import { FixedVirtualizedKanbanColumn } from './FixedVirtualizedKanbanColumn';
import { DragDropTestDebugger, useDragDropDebugger } from './DragDropTestDebugger';
import { VirtualizedListPerformanceMonitor, useVirtualScrollPerformance } from '../ui';
import { usePermissions, useMobileDetection } from '../../hooks';
import type { TaskWithAssignee, TaskStatus } from '@simple-todo-app/shared';

const { Text } = Typography;

interface VirtualizedPermissionAwareKanbanBoardProps {
  tasks: TaskWithAssignee[];
  listId: string;
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onTaskReorder?: (taskId: string, newOrder: number, newStatus?: TaskStatus) => Promise<void>;
  onEditTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  loading?: boolean;
  enableSwipeGestures?: boolean;
  virtualScrollThreshold?: number;
  columnHeight?: number;
  estimatedTaskHeight?: number;
  showVirtualScrollToggle?: boolean;
}

const TASK_STATUSES: Array<{ status: TaskStatus; title: string; color: string }> = [
  { status: 'BACKLOG', title: 'Backlog', color: '#8c8c8c' },
  { status: 'TODO', title: 'Todo', color: '#1890ff' },
  { status: 'IN_PROGRESS', title: 'Doing', color: '#faad14' },
  { status: 'REVIEW', title: 'Review', color: '#722ed1' },
  { status: 'DONE', title: 'Done', color: '#52c41a' },
];

export const VirtualizedPermissionAwareKanbanBoard: React.FC<VirtualizedPermissionAwareKanbanBoardProps> = ({
  tasks,
  listId,
  onTaskStatusChange,
  onTaskReorder: _onTaskReorder,
  onEditTask,
  onDeleteTask,
  loading = false,
  enableSwipeGestures: _enableSwipeGestures = false,
  virtualScrollThreshold = 3, // Reduziert für einfachere Tests
  columnHeight = 600,
  estimatedTaskHeight = 120,
  showVirtualScrollToggle = true,
}) => {
  const [activeTask, setActiveTask] = useState<TaskWithAssignee | null>(null);
  const [forceVirtualScrolling, setForceVirtualScrolling] = useState(false);
  const permissions = usePermissions({ listId });
  const performanceMonitor = useVirtualScrollPerformance();
  const dragDropDebugger = useDragDropDebugger();
  const { isMobile } = useMobileDetection();

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

  // Determine if virtual scrolling should be used for a specific column
  const shouldUseVirtualScrolling = (columnTasks: TaskWithAssignee[]) => {
    return forceVirtualScrolling || columnTasks.length >= virtualScrollThreshold;
  };

  // Calculate stats for virtual scrolling decision
  const virtualScrollStats = useMemo(() => {
    const stats = TASK_STATUSES.map(({ status, title }) => {
      const columnTasks = tasksByStatus[status] || [];
      const willUseVirtual = shouldUseVirtualScrolling(columnTasks);
      return {
        status,
        title,
        count: columnTasks.length,
        willUseVirtual,
      };
    });

    const totalTasks = stats.reduce((sum, stat) => sum + stat.count, 0);
    const virtualColumns = stats.filter(stat => stat.willUseVirtual).length;

    return {
      columns: stats,
      totalTasks,
      virtualColumns,
      allVirtual: virtualColumns === TASK_STATUSES.length,
      anyVirtual: virtualColumns > 0,
    };
  }, [tasksByStatus, forceVirtualScrolling, virtualScrollThreshold]);

  const handleDragStart = (event: DragStartEvent) => {
    if (!permissions.canEdit) {
      return;
    }
    
    const task = tasks.find(t => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!permissions.canEdit) return;
    
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
        // Visual feedback for cross-column drag
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!permissions.canEdit) {
      setActiveTask(null);
      return;
    }

    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) {
      return;
    }

    const taskId = active.id as string;
    let newStatus = over.id as string;

    // Check if it's directly a column status (check all 5 status types)
    const isDirectColumnDrop = TASK_STATUSES.some(status => status.status === newStatus);
    
    if (!isDirectColumnDrop) {
      // If dropped on another task, find the status of that task's column
      const targetTask = tasks.find(t => t.id === newStatus);
      if (targetTask) {
        newStatus = targetTask.status;
      } else {
        return; // Exit if we can't determine the target
      }
    }

    // Execute status change
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      try {
        await onTaskStatusChange(taskId, newStatus as TaskStatus);
      } catch (error) {
        console.error('Error changing task status:', error);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Virtual Scrolling Controls and Stats */}
      {showVirtualScrollToggle && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={forceVirtualScrolling}
                onChange={setForceVirtualScrolling}
                size="small"
              />
              <Text strong>Virtual Scrolling</Text>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {forceVirtualScrolling 
                ? 'Forced ON for all columns' 
                : `Auto (≥${virtualScrollThreshold} tasks)`
              }
              {process.env.NODE_ENV === 'development' && (
                <>
                  <span>|</span>
                  <button
                    onClick={performanceMonitor.toggleMonitoring}
                    className="text-blue-600 hover:text-blue-800 underline text-xs"
                  >
                    {performanceMonitor.isMonitoring ? 'Hide' : 'Show'} Performance
                  </button>
                  <span>|</span>
                  <button
                    onClick={dragDropDebugger.toggle}
                    className="text-green-600 hover:text-green-800 underline text-xs"
                  >
                    {dragDropDebugger.isActive ? 'Hide' : 'Show'} Drag Debug
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 text-xs">
            {virtualScrollStats.columns.map(({ status, title, count, willUseVirtual }) => (
              <div 
                key={status}
                className={`px-2 py-1 rounded ${
                  willUseVirtual 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {title}: {count} {willUseVirtual ? '(Virtual)' : '(Normal)'}
              </div>
            ))}
            <div className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
              Total: {virtualScrollStats.totalTasks}
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* GLOBALER SortableContext für ALLE Tasks - ermöglicht Cross-Column Drag & Drop */}
        <SortableContext
          items={tasks.map(task => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={`grid h-full ${
            isMobile 
              ? 'grid-cols-1 compact-kanban-mobile' 
              : 'md:grid-cols-3 lg:grid-cols-5 compact-kanban'
          }`}>
            {TASK_STATUSES.map(({ status, title, color }) => {
              const columnTasks = tasksByStatus[status] || [];
              const useVirtualScrolling = shouldUseVirtualScrolling(columnTasks);
              
              return useVirtualScrolling ? (
                <FixedVirtualizedKanbanColumn
                  key={status}
                  title={title}
                  status={status}
                  color={color}
                  tasks={columnTasks}
                  loading={loading}
                  height={columnHeight}
                  estimatedItemSize={estimatedTaskHeight}
                  onTaskClick={onEditTask}
                />
              ) : (
                <FixedPermissionAwareKanbanColumn
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

      {/* Development Tools */}
      <VirtualizedListPerformanceMonitor
        isActive={performanceMonitor.isMonitoring}
        onMetricsUpdate={performanceMonitor.onMetricsUpdate}
      />
      
      <DragDropTestDebugger
        isActive={dragDropDebugger.isActive}
        onToggle={dragDropDebugger.toggle}
      />
    </div>
  );
};