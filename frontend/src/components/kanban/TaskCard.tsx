import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Tag, Avatar, Typography, Space, Tooltip, Dropdown } from 'antd';
import {
  ClockCircleOutlined,
  UserOutlined,
  FlagOutlined,
  CalendarOutlined,
  MoreOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import type { TaskWithAssignee } from '@simple-todo-app/shared';
import { ShareButton } from '../sharing/ShareButton';
import { ShareModal } from '../sharing/ShareModal';
import { useHaptics } from '../../hooks/useHaptics';

const { Text, Paragraph } = Typography;

interface TaskCardProps {
  task: TaskWithAssignee;
  isDragOverlay?: boolean;
}

const PRIORITY_COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  URGENT: '#dc2626',
};

const PRIORITY_LABELS = {
  LOW: 'Niedrig',
  MEDIUM: 'Mittel',
  HIGH: 'Hoch',
  URGENT: 'Dringend',
};

const PRIORITY_ICONS = {
  LOW: '🟢',
  MEDIUM: '🟡',
  HIGH: '🟠',
  URGENT: '🔴',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, isDragOverlay = false }) => {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const { dragDropFeedback, tapFeedback, longPressFeedback, isEnabled } = useHaptics();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isDragOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDueDate = (dueDate: Date | string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} Tage überfällig`, color: '#ff4d4f' };
    } else if (diffDays === 0) {
      return { text: 'Heute fällig', color: '#faad14' };
    } else if (diffDays === 1) {
      return { text: 'Morgen fällig', color: '#1890ff' };
    } else {
      return { text: `In ${diffDays} Tagen`, color: '#52c41a' };
    }
  };

  const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null;

  // Haptic feedback handlers
  const handleDragStart = () => {
    if (isEnabled) {
      dragDropFeedback();
    }
  };

  const handleCardClick = () => {
    if (isEnabled) {
      tapFeedback();
    }
  };

  const handleLongPress = () => {
    if (isEnabled) {
      longPressFeedback();
    }
  };

  // Transform task data for sharing
  const shareableTask = {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority?.toLowerCase() as 'low' | 'medium' | 'high',
    status: task.status?.toLowerCase() as 'todo' | 'in_progress' | 'done' | 'backlog',
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    assignee: task.assignee ? {
      id: task.assignee.id,
      name: task.assignee.name,
      email: task.assignee.email
    } : undefined,
    tags: task.tags,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt)
  };

  // Quick share data for ShareButton
  const quickShareData = {
    title: `Task: ${task.title}`,
    text: `${task.title}${task.description ? `\n\n${task.description}` : ''}`,
    url: `${window.location.origin}/tasks/${task.id}`
  };

  // Dropdown menu items
  const menuItems = [
    {
      key: 'share-quick',
      icon: <ShareAltOutlined />,
      label: (
        <ShareButton
          data={quickShareData}
          variant="icon"
          size="sm"
          className="!p-0 !bg-transparent !text-current !border-0 hover:!bg-transparent"
          showStatus={false}
        />
      ),
      onClick: (e: any) => {
        e.domEvent?.stopPropagation();
      }
    },
    {
      key: 'share-advanced',
      icon: <ShareAltOutlined />,
      label: 'Advanced Share...',
      onClick: () => setShareModalOpen(true)
    }
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing ${isDragOverlay ? 'shadow-2xl' : ''}`}
    >
      <Card
        size="small"
        className={`transition-all duration-200 hover:shadow-lg hover:scale-102 ${
          isDragging ? 'shadow-xl opacity-95' : 'shadow-sm'
        } bg-white border border-gray-200 hover:border-gray-300`}
        bodyStyle={{ padding: '12px' }}
        onClick={handleCardClick}
        onTouchStart={handleDragStart}
        onMouseDown={handleDragStart}
        onContextMenu={handleLongPress}
        style={{ borderRadius: '8px' }}
      >
        <div className="space-y-2">
          {/* Title, Priority, and Menu */}
          <div className="flex items-start justify-between gap-3">
            <Text strong className="flex-1 text-sm lg:text-base leading-tight lg:leading-relaxed text-gray-800">
              {task.title}
            </Text>
            <div className="flex items-center gap-1">
              <Tag
                color={PRIORITY_COLORS[task.priority]}
                className="text-xs border-0 font-medium"
                style={{ padding: '2px 8px', marginRight: 0 }}
              >
                {PRIORITY_ICONS[task.priority]} {PRIORITY_LABELS[task.priority]}
              </Tag>
              
              {/* Task Actions Menu */}
              <Dropdown
                menu={{ items: menuItems }}
                trigger={['click']}
                placement="bottomRight"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  aria-label="Task actions"
                >
                  <MoreOutlined className="text-gray-400" />
                </button>
              </Dropdown>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <Paragraph
              className="!mb-0 text-xs lg:text-sm text-gray-600 leading-snug lg:leading-relaxed"
              ellipsis={{ rows: 2, tooltip: task.description }}
            >
              {task.description}
            </Paragraph>
          )}

          {/* Due Date */}
          {dueDateInfo && (
            <div className="flex items-center gap-2 mt-2">
              <CalendarOutlined
                className="text-sm"
                style={{ color: dueDateInfo.color }}
              />
              <Text
                className="text-xs lg:text-sm font-medium"
                style={{ color: dueDateInfo.color }}
              >
                {dueDateInfo.text}
              </Text>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags.slice(0, 3).map((tag, index) => (
                <Tag key={index} className="text-xs px-2 py-0 bg-blue-50 text-blue-700 border-blue-200">
                  {tag}
                </Tag>
              ))}
              {task.tags.length > 3 && (
                <Tooltip title={task.tags.slice(3).join(', ')}>
                  <Tag className="text-xs px-2 py-0 bg-gray-50 text-gray-700 border-gray-200">
                    +{task.tags.length - 3}
                  </Tag>
                </Tooltip>
              )}
            </div>
          )}

          {/* Footer with assignee and timestamps */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100">
            {/* Assignee */}
            {task.assignee ? (
              <Tooltip title={task.assignee.name}>
                <Avatar
                  size={24}
                  src={task.assignee.profileImage}
                  icon={<UserOutlined />}
                  className="bg-blue-500 border border-white shadow-sm"
                >
                  {task.assignee.name?.charAt(0)?.toUpperCase()}
                </Avatar>
              </Tooltip>
            ) : (
              <Avatar size="small" icon={<UserOutlined />} className="bg-gray-400" />
            )}

            {/* Created date */}
            <Space className="text-xs text-gray-400">
              <ClockCircleOutlined />
              <Text className="text-xs text-gray-400">
                {new Date(task.createdAt).toLocaleDateString('de-DE', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </Space>
          </div>
        </div>
      </Card>
      
      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        content={{
          type: 'task',
          data: shareableTask
        }}
      />
    </div>
  );
};