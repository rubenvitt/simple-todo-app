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
      className={`flex flex-col h-full transition-all duration-200 
        w-[400px] min-[1280px]:w-full
        flex-shrink-0 min-[1280px]:flex-shrink
        snap-center min-[1280px]:snap-none
        ${isOver ? 'transform scale-[1.02]' : ''
      }`}
    >
      <Card
        className={`h-full ${isOver ? 'shadow-xl border-2' : 'shadow'} bg-white border-gray-200`}
        style={{ 
          borderColor: isOver ? color : '#e5e7eb',
          borderRadius: '8px',
        }}
        bodyStyle={{ 
          padding: '12px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <Title level={5} className="!mb-0 font-medium text-gray-700">
              {title}
            </Title>
          </div>
          <Badge
            count={tasks.length}
            style={{ 
              backgroundColor: color,
              fontSize: '12px',
            }}
            showZero
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spin size="large" />
            </div>
          ) : tasks.length === 0 ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center text-gray-400 transition-all duration-200"
              style={{
                borderColor: isOver ? color : '#e5e7eb',
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