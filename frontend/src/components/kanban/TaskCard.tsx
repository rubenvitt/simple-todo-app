import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Tag, Avatar, Typography, Space, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  UserOutlined,
  FlagOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { TaskWithAssignee } from '@simple-todo-app/shared';

const { Text, Paragraph } = Typography;

interface TaskCardProps {
  task: TaskWithAssignee;
  isDragOverlay?: boolean;
}

const PRIORITY_COLORS = {
  LOW: '#52c41a',
  MEDIUM: '#faad14',
  HIGH: '#ff4d4f',
  URGENT: '#f5222d',
};

const PRIORITY_LABELS = {
  LOW: 'Niedrig',
  MEDIUM: 'Mittel',
  HIGH: 'Hoch',
  URGENT: 'Dringend',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, isDragOverlay = false }) => {
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
        className={`transition-all duration-200 hover:shadow-md ${
          isDragging ? 'shadow-lg' : 'shadow-sm'
        }`}
        bodyStyle={{ padding: '12px' }}
      >
        <div className="space-y-3">
          {/* Title and Priority */}
          <div className="flex items-start justify-between gap-2">
            <Text strong className="flex-1 text-sm leading-tight">
              {task.title}
            </Text>
            <Tag
              color={PRIORITY_COLORS[task.priority]}
              className="text-xs border-0 ml-2"
            >
              <FlagOutlined className="mr-1" />
              {PRIORITY_LABELS[task.priority]}
            </Tag>
          </div>

          {/* Description */}
          {task.description && (
            <Paragraph
              className="!mb-0 text-xs text-gray-600"
              ellipsis={{ rows: 2, tooltip: task.description }}
            >
              {task.description}
            </Paragraph>
          )}

          {/* Due Date */}
          {dueDateInfo && (
            <div className="flex items-center gap-1">
              <CalendarOutlined
                className="text-xs"
                style={{ color: dueDateInfo.color }}
              />
              <Text
                className="text-xs"
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
                <Tag key={index} className="text-xs px-1 py-0">
                  {tag}
                </Tag>
              ))}
              {task.tags.length > 3 && (
                <Tooltip title={task.tags.slice(3).join(', ')}>
                  <Tag className="text-xs px-1 py-0">
                    +{task.tags.length - 3}
                  </Tag>
                </Tooltip>
              )}
            </div>
          )}

          {/* Footer with assignee and timestamps */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {/* Assignee */}
            {task.assignee ? (
              <Tooltip title={task.assignee.name}>
                <Avatar
                  size="small"
                  src={task.assignee.profileImage}
                  icon={<UserOutlined />}
                  className="bg-blue-500"
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
    </div>
  );
};