import React, { useMemo, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, Typography, Badge, Spin } from 'antd';
import { TaskCard } from './TaskCard';
import { VirtualizedList, useScrollPosition } from '../ui';
import type { TaskWithAssignee, TaskStatus } from '@simple-todo-app/shared';

const { Title } = Typography;

interface VirtualizedDragDropKanbanColumnProps {
  title: string;
  status: TaskStatus;
  color: string;
  tasks: TaskWithAssignee[];
  loading?: boolean;
  height?: number;
  estimatedItemSize?: number;
  onTaskClick?: (taskId: string) => void;
  enableDragDrop?: boolean;
}

export const VirtualizedDragDropKanbanColumn: React.FC<VirtualizedDragDropKanbanColumnProps> = ({
  title,
  status,
  color,
  tasks,
  loading = false,
  height = 600,
  estimatedItemSize = 120,
  onTaskClick,
  enableDragDrop = true,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const { saveScrollPosition, getScrollPosition } = useScrollPosition();
  const scrollKey = `kanban-column-${status}`;

  // Berechne verfügbare Höhe für die Liste (Card-Header + Padding berücksichtigen)
  const availableHeight = height - 120; // Ungefähre Höhe für Header + Padding

  // Erstelle Task IDs für SortableContext
  const taskIds = useMemo(() => tasks.map(task => task.id), [tasks]);

  // Drag-enabled Task Renderer
  const renderDragTask = useCallback((task: TaskWithAssignee, _index: number) => {
    return (
      <div 
        className="mb-3 last:mb-0" 
        onDoubleClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
        style={{ cursor: onTaskClick ? 'pointer' : 'default' }}
      >
        <TaskCard 
          key={task.id} 
          task={task}
        />
      </div>
    );
  }, [onTaskClick]);

  // Non-drag Task Renderer (fallback)
  const renderSimpleTask = useCallback((task: TaskWithAssignee, _index: number) => {
    return (
      <div 
        className="mb-3 last:mb-0" 
        onDoubleClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
        style={{ cursor: onTaskClick ? 'pointer' : 'default' }}
      >
        <TaskCard 
          key={task.id} 
          task={task}
        />
      </div>
    );
  }, [onTaskClick]);

  // Generiere eindeutige Keys für Tasks
  const getTaskKey = useMemo(() => {
    return (index: number, task: TaskWithAssignee) => task.id;
  }, []);

  // Wrapper für Drag & Drop mit Virtual Scrolling
  const VirtualListWithDragDrop = useCallback(() => {
    if (!enableDragDrop) {
      return (
        <VirtualizedList
          items={tasks}
          height={availableHeight}
          estimatedItemSize={estimatedItemSize}
          onItemRender={renderSimpleTask}
          getItemKey={getTaskKey}
          className="kanban-virtualized-list"
          overscanCount={3}
          bufferSize={5}
          onScrollPositionChange={(offset) => saveScrollPosition(scrollKey, offset)}
          initialScrollOffset={getScrollPosition(scrollKey)}
          optimizeForMobile={true}
          throttleScrollEvents={true}
        />
      );
    }

    return (
      <SortableContext
        items={taskIds}
        strategy={verticalListSortingStrategy}
      >
        <VirtualizedList
          items={tasks}
          height={availableHeight}
          estimatedItemSize={estimatedItemSize}
          onItemRender={renderDragTask}
          getItemKey={getTaskKey}
          className="kanban-virtualized-list drag-enabled"
          overscanCount={3}
          bufferSize={5}
          onScrollPositionChange={(offset) => saveScrollPosition(scrollKey, offset)}
          initialScrollOffset={getScrollPosition(scrollKey)}
          optimizeForMobile={true}
          throttleScrollEvents={true}
        />
      </SortableContext>
    );
  }, [
    enableDragDrop,
    tasks,
    availableHeight,
    estimatedItemSize,
    renderSimpleTask,
    renderDragTask,
    getTaskKey,
    taskIds,
    saveScrollPosition,
    scrollKey,
    getScrollPosition,
  ]);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full transition-all duration-200 ${
        isOver ? 'scale-105' : ''
      }`}
      style={{ height }}
    >
      <Card
        className={`h-full ${isOver ? 'shadow-lg border-2' : 'shadow-sm'}`}
        style={{ 
          borderColor: isOver ? color : undefined,
          backgroundColor: isOver ? `${color}08` : undefined,
        }}
        bodyStyle={{ 
          padding: '16px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <Title level={5} className="!mb-0">
              {title}
            </Title>
            {enableDragDrop && (
              <Badge 
                size="small" 
                count="DnD" 
                style={{ backgroundColor: '#52c41a', fontSize: '10px' }}
              />
            )}
          </div>
          <Badge
            count={tasks.length}
            style={{ backgroundColor: color }}
            showZero
          />
        </div>

        {/* Task List Area */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spin size="large" />
            </div>
          ) : tasks.length === 0 ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center text-gray-400 transition-colors duration-200"
              style={{
                borderColor: isOver ? color : '#d9d9d9',
                backgroundColor: isOver ? `${color}10` : 'transparent',
              }}
            >
              <p className="mb-0">
                {isOver ? 'Hier ablegen...' : 'Keine Aufgaben'}
              </p>
            </div>
          ) : (
            <VirtualListWithDragDrop />
          )}
        </div>
      </Card>
    </div>
  );
};