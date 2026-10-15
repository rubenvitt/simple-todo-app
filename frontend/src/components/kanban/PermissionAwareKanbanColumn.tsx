import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card, Typography, Badge, Spin } from 'antd';
import { PermissionAwareTaskCard } from './PermissionAwareTaskCard';
import { SwipeableTaskCard } from './SwipeableTaskCard';
import { usePermissions } from '../../hooks';
import type { TaskWithAssignee, TaskStatus } from '@simple-todo-app/shared';

const { Title } = Typography;

interface PermissionAwareKanbanColumnProps {
  title: string;
  status: TaskStatus;
  color: string;
  tasks: TaskWithAssignee[];
  listId: string;
  loading?: boolean;
  onEditTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  enableSwipeGestures?: boolean;
}

export const PermissionAwareKanbanColumn: React.FC<PermissionAwareKanbanColumnProps> = ({
  title,
  status,
  color,
  tasks,
  listId,
  loading = false,
  onEditTask,
  onDeleteTask,
  enableSwipeGestures = true,
}) => {
  const permissions = usePermissions({ listId });
  
  // Only allow dropping if user can edit
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled: !permissions.canEdit,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full transition-all duration-200 ${
        isOver && permissions.canEdit ? 'scale-105' : ''
      }`}
    >
      <Card
        className={`h-full ${isOver && permissions.canEdit ? 'shadow-lg border-2' : 'shadow-sm'}`}
        style={{ 
          borderColor: isOver && permissions.canEdit ? color : undefined,
          backgroundColor: isOver && permissions.canEdit ? `${color}08` : undefined,
        }}
        bodyStyle={{ 
          padding: '16px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <Title level={5} className="!mb-0">
              {title}
            </Title>
          </div>
          <Badge
            count={tasks.length}
            style={{ backgroundColor: color }}
            showZero
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spin size="large" />
            </div>
          ) : tasks.length === 0 ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center text-gray-400 transition-colors duration-200 h-full min-h-[150px] flex items-center justify-center"
              style={{
                borderColor: isOver && permissions.canEdit ? color : '#d9d9d9',
                backgroundColor: isOver && permissions.canEdit ? `${color}10` : 'transparent',
              }}
            >
              <p className="mb-0">
                {isOver && permissions.canEdit ? 'Hier ablegen...' : 'Keine Aufgaben'}
              </p>
            </div>
          ) : (
            <>
              {tasks.map((task) => 
                enableSwipeGestures ? (
                  <SwipeableTaskCard 
                    key={task.id} 
                    task={task} 
                    listId={listId}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    enableSwipe={permissions.canEdit}
                  />
                ) : (
                  <PermissionAwareTaskCard 
                    key={task.id} 
                    task={task} 
                    listId={listId}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                  />
                )
              )}
              {/* Empty drop zone at bottom for better UX */}
              <div 
                className="h-4 transition-colors duration-200"
                style={{
                  backgroundColor: isOver && permissions.canEdit ? `${color}08` : 'transparent',
                }}
              />
            </>
          )}
        </div>
      </Card>
    </div>
  );
};