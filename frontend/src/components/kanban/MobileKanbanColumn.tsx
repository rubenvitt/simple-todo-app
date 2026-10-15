import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Card, Typography, Badge, Button, Spin } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, CaretDownOutlined } from '@ant-design/icons';
import { TaskCard } from './TaskCard';
import type { TaskWithAssignee, TaskStatus } from '@simple-todo-app/shared';

const { Title } = Typography;

interface MobileKanbanColumnProps {
  title: string;
  status: TaskStatus;
  color: string;
  tasks: TaskWithAssignee[];
  loading?: boolean;
  isActive?: boolean;
}

export const MobileKanbanColumn: React.FC<MobileKanbanColumnProps> = ({
  title,
  status,
  color,
  tasks,
  loading = false,
  isActive = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      ref={setNodeRef}
      className={`h-full transition-all duration-300 ${
        isOver ? 'scale-102' : ''
      } ${isActive ? 'opacity-100' : 'opacity-90'}`}
    >
      <Card
        className={`h-full ${isOver ? 'shadow-xl border-2' : 'shadow-md'}`}
        style={{ 
          borderColor: isOver ? color : undefined,
          backgroundColor: isOver ? `${color}08` : undefined,
          transform: isActive ? 'scale(1.02)' : 'scale(1)',
        }}
        bodyStyle={{ 
          padding: '12px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Collapsible Header */}
        <div 
          className="flex items-center justify-between mb-3 cursor-pointer active:bg-gray-50 rounded-lg p-2 -m-2"
          onClick={toggleCollapse}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <Title level={5} className="!mb-0 text-base">
              {title}
            </Title>
            <Badge
              count={tasks.length}
              style={{ backgroundColor: color }}
              showZero
              size="small"
            />
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              type="text"
              size="small"
              icon={isCollapsed ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              className="p-1"
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
            />
            <CaretDownOutlined 
              className={`text-gray-400 transition-transform duration-200 ${
                isCollapsed ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* Collapsible Content */}
        <div 
          className={`flex-1 overflow-hidden transition-all duration-300 ${
            isCollapsed ? 'max-h-0 opacity-0' : 'max-h-full opacity-100'
          }`}
        >
          <div className="h-full overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spin size="large" />
              </div>
            ) : tasks.length === 0 ? (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center text-gray-400 transition-colors duration-200"
                style={{
                  borderColor: isOver ? color : '#d9d9d9',
                  backgroundColor: isOver ? `${color}10` : 'transparent',
                }}
              >
                <p className="mb-0 text-sm">
                  {isOver ? '📥 Hier ablegen...' : 'Keine Aufgaben'}
                </p>
              </div>
            ) : (
              <>
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                
                {/* Additional drop zone when dragging */}
                {isOver && (
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center text-sm transition-colors duration-200"
                    style={{
                      borderColor: color,
                      backgroundColor: `${color}10`,
                      color: color,
                    }}
                  >
                    📥 Aufgabe hier ablegen
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Stats when collapsed */}
        {isCollapsed && tasks.length > 0 && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            {tasks.length} Aufgabe{tasks.length !== 1 ? 'n' : ''}
          </div>
        )}
      </Card>
    </div>
  );
};