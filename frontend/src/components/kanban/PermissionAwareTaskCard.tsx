import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Tag, Avatar, Typography, Space, Tooltip, Button, Popconfirm } from 'antd';
import {
  ClockCircleOutlined,
  UserOutlined,
  FlagOutlined,
  CalendarOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { TaskWithAssignee } from '@simple-todo-app/shared';
import { PermissionGuard } from '../../hooks';

const { Text, Paragraph } = Typography;

interface PermissionAwareTaskCardProps {
  task: TaskWithAssignee;
  listId: string;
  isDragOverlay?: boolean;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
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

export const PermissionAwareTaskCard: React.FC<PermissionAwareTaskCardProps> = ({ 
  task, 
  listId,
  isDragOverlay = false,
  onEdit,
  onDelete,
}) => {
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      size="small"
      className={`task-card ${isDragOverlay ? 'task-card-overlay' : ''} cursor-grab active:cursor-grabbing hover:shadow-md`}
      hoverable
      actions={[
        <PermissionGuard key="edit" listId={listId} requires="edit">
          <Tooltip title="Bearbeiten">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(task.id);
              }}
            />
          </Tooltip>
        </PermissionGuard>,
        
        <PermissionGuard key="delete" listId={listId} requires="edit">
          <Popconfirm
            title="Task löschen?"
            description="Sind Sie sicher, dass Sie diese Aufgabe löschen möchten?"
            onConfirm={(e) => {
              e?.stopPropagation();
              onDelete?.(task.id);
            }}
            okText="Ja"
            cancelText="Nein"
          >
            <Tooltip title="Löschen">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Popconfirm>
        </PermissionGuard>,
      ]}
    >
      <div className="space-y-2">
        {/* Title */}
        <Paragraph 
          className="!mb-1 font-medium" 
          ellipsis={{ rows: 2, tooltip: task.title }}
        >
          {task.title}
        </Paragraph>

        {/* Description */}
        {task.description && (
          <Paragraph 
            className="!mb-2 text-gray-600" 
            ellipsis={{ rows: 3, tooltip: task.description }}
          >
            {task.description}
          </Paragraph>
        )}

        {/* Priority */}
        <Space size="small" wrap>
          <Tag
            color={PRIORITY_COLORS[task.priority]}
            icon={<FlagOutlined />}
          >
            {PRIORITY_LABELS[task.priority]}
          </Tag>
        </Space>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-2">
          <Space size="small">
            {task.assignee && (
              <Tooltip title={`Zugewiesen an: ${task.assignee.name}`}>
                <Avatar size="small" icon={<UserOutlined />} />
              </Tooltip>
            )}
            
            {task.dueDate && (
              <Tooltip title={`Fällig: ${new Date(task.dueDate).toLocaleDateString()}`}>
                <Tag icon={<CalendarOutlined />} color="blue">
                  {new Date(task.dueDate).toLocaleDateString()}
                </Tag>
              </Tooltip>
            )}
          </Space>

          <Tooltip title={`Erstellt: ${new Date(task.createdAt).toLocaleDateString()}`}>
            <Text type="secondary" className="text-xs">
              <ClockCircleOutlined className="mr-1" />
              {new Date(task.createdAt).toLocaleDateString()}
            </Text>
          </Tooltip>
        </div>
      </div>
    </Card>
  );
};