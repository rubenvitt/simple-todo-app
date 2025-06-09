import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card, Typography, Badge, Spin } from 'antd';
import { TaskCard } from './TaskCard';
import type { TaskWithAssignee, TaskStatus } from '@simple-todo-app/shared';

const { Title } = Typography;

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  color: string;
  tasks: TaskWithAssignee[];
  loading?: boolean;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  color,
  tasks,
  loading = false,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full transition-all duration-200 ${
        isOver ? 'scale-105' : ''
      }`}
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

        <div className="flex-1 overflow-y-auto space-y-3">
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
            tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))
          )}
        </div>
      </Card>
    </div>
  );
};