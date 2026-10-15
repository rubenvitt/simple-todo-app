import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card, Typography, Badge, Spin } from 'antd';
import { TaskCard } from './TaskCard';
import { usePermissions } from '../../hooks';
import type { TaskWithAssignee, TaskStatus } from '@simple-todo-app/shared';

const { Title } = Typography;

interface FixedPermissionAwareKanbanColumnProps {
  title: string;
  status: TaskStatus;
  color: string;
  tasks: TaskWithAssignee[];
  listId: string;
  loading?: boolean;
  onEditTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

export const FixedPermissionAwareKanbanColumn: React.FC<FixedPermissionAwareKanbanColumnProps> = ({
  title,
  status,
  color,
  tasks,
  listId,
  loading = false,
  onEditTask,
  onDeleteTask: _onDeleteTask,
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
            <Badge 
              size="small" 
              count="D&D" 
              style={{ backgroundColor: '#52c41a', fontSize: '10px' }}
              title="Drag & Drop enabled"
            />
          </div>
          <Badge
            count={tasks.length}
            style={{ backgroundColor: color }}
            showZero
          />
        </div>

        {/* Task List Area */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spin size="large" />
            </div>
          ) : tasks.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center text-gray-400 transition-colors duration-200 ${
                !permissions.canEdit ? 'opacity-50' : ''
              }`}
              style={{
                borderColor: isOver && permissions.canEdit ? color : '#d9d9d9',
                backgroundColor: isOver && permissions.canEdit ? `${color}10` : 'transparent',
              }}
            >
              <p className="mb-0">
                {!permissions.canEdit 
                  ? 'Keine Berechtigung zum Bearbeiten' 
                  : isOver 
                    ? 'Hier ablegen...' 
                    : 'Keine Aufgaben'
                }
              </p>
            </div>
          ) : (
            // Tasks mit Drag & Drop - verwendet globalen SortableContext vom Board
            tasks.map((task) => (
              <div 
                key={task.id}
                onDoubleClick={permissions.canEdit && onEditTask ? () => onEditTask(task.id) : undefined}
                style={{ 
                  cursor: permissions.canEdit && onEditTask ? 'pointer' : 'default',
                  opacity: permissions.canView ? 1 : 0.5,
                }}
                className="transition-opacity duration-200"
              >
                <TaskCard 
                  task={task}
                />
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};