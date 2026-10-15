import React from 'react';
import { Button, Tooltip } from 'antd';
import { MobileOutlined, DesktopOutlined } from '@ant-design/icons';
import { PermissionAwareKanbanBoard } from './PermissionAwareKanbanBoard';
import { VirtualizedPermissionAwareKanbanBoard } from './VirtualizedPermissionAwareKanbanBoard';
import { MobileKanbanBoard } from './MobileKanbanBoard';
import { useResponsiveKanban } from '../../hooks/useResponsiveKanban';
import type { TaskWithAssignee, TaskStatus } from '@simple-todo-app/shared';

interface ResponsiveKanbanBoardProps {
  tasks: TaskWithAssignee[];
  listId: string;
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onTaskReorder?: (taskId: string, newOrder: number, newStatus?: TaskStatus) => Promise<void>;
  onEditTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  loading?: boolean;
  showModeToggle?: boolean;
  forceMode?: 'mobile' | 'desktop' | null;
  enableVirtualScrolling?: boolean;
  virtualScrollThreshold?: number;
}

export const ResponsiveKanbanBoard: React.FC<ResponsiveKanbanBoardProps> = ({
  tasks,
  listId,
  onTaskStatusChange,
  onTaskReorder,
  onEditTask,
  onDeleteTask,
  loading = false,
  showModeToggle = true,
  forceMode = null,
  enableVirtualScrolling = false,
  virtualScrollThreshold = 20,
}) => {
  const { isMobile, isTouch, toggleMode } = useResponsiveKanban({
    mobileBreakpoint: 768,
    forceMode,
  });

  const commonProps = {
    tasks,
    listId,
    onTaskStatusChange,
    onTaskReorder,
    onEditTask,
    onDeleteTask,
    loading,
  };

  return (
    <div className="relative">
      {/* Mode Toggle Button */}
      {showModeToggle && !forceMode && (
        <div className="absolute top-0 right-0 z-10">
          <Tooltip title={`Switch to ${isMobile ? 'Desktop' : 'Mobile'} view`}>
            <Button
              type="text"
              size="small"
              icon={isMobile ? <DesktopOutlined /> : <MobileOutlined />}
              onClick={toggleMode}
              className="opacity-70 hover:opacity-100 transition-opacity"
            />
          </Tooltip>
        </div>
      )}

      {/* Responsive Kanban Board */}
      {isMobile ? (
        <div className="mobile-kanban-container">
          <MobileKanbanBoard {...commonProps} />
        </div>
      ) : (
        <div className="desktop-kanban-container">
          {enableVirtualScrolling ? (
            <VirtualizedPermissionAwareKanbanBoard 
              {...commonProps}
              virtualScrollThreshold={virtualScrollThreshold}
              showVirtualScrollToggle={true}
            />
          ) : (
            <PermissionAwareKanbanBoard 
              {...commonProps}
            />
          )}
        </div>
      )}

      {/* Device Info (Debug) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded text-xs z-50">
          Mode: {isMobile ? 'Mobile' : 'Desktop'} | Touch: {isTouch ? 'Yes' : 'No'}
        </div>
      )}

      <style>{`
        .mobile-kanban-container {
          padding: 0;
        }
        
        .desktop-kanban-container {
          min-height: 500px;
        }
        
        @media (max-width: 768px) {
          .desktop-kanban-container .ant-card-actions {
            padding: 8px 12px;
          }
          
          .desktop-kanban-container .ant-btn {
            min-width: 44px;
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
};