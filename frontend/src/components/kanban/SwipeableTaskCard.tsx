import React, { useRef, useState, useCallback } from 'react';
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
  WarningOutlined,
} from '@ant-design/icons';
import type { TaskWithAssignee } from '@simple-todo-app/shared';
import { PermissionGuard } from '../../hooks';
import { useTouchGestureManager } from '../../hooks/useTouchGestureManager';

const { Text, Paragraph } = Typography;

interface SwipeableTaskCardProps {
  task: TaskWithAssignee;
  listId: string;
  isDragOverlay?: boolean;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  enableSwipe?: boolean;
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

export const SwipeableTaskCard: React.FC<SwipeableTaskCardProps> = ({ 
  task, 
  listId,
  isDragOverlay = false,
  onEdit,
  onDelete,
  enableSwipe = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dragDisabled, setDragDisabled] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isDragOverlay || dragDisabled,
  });

  const handleSwipeLeft = useCallback(() => {
    if (!enableSwipe) return;
    
    if (swipeOffset >= 120) { // Delete threshold
      onDelete?.(task.id);
    } else {
      // Reset swipe
      setSwipeOffset(0);
      setIsDeleting(false);
    }
  }, [enableSwipe, swipeOffset, onDelete, task.id]);

  const handleDragStart = useCallback(() => {
    // Reset any active swipe when drag starts
    if (swipeOffset > 0) {
      setSwipeOffset(0);
      setIsDeleting(false);
    }
  }, [swipeOffset]);

  const handleDragMove = useCallback((deltaX: number, deltaY: number) => {
    // Only handle swipe if it's a clear horizontal movement
    if (Math.abs(deltaX) > Math.abs(deltaY) * 2 && deltaX < 0 && enableSwipe) {
      const offset = Math.min(Math.abs(deltaX), 140);
      setSwipeOffset(offset);
      
      // Set deleting state at threshold
      if (offset >= 120 && !isDeleting) {
        setIsDeleting(true);
      } else if (offset < 120 && isDeleting) {
        setIsDeleting(false);
      }
      
      // Disable drag when swiping
      if (!dragDisabled) {
        setDragDisabled(true);
      }
    }
  }, [enableSwipe, isDeleting, dragDisabled]);

  const handleDragEnd = useCallback(() => {
    // Re-enable drag after gesture ends
    if (dragDisabled) {
      setTimeout(() => setDragDisabled(false), 100);
    }
  }, [dragDisabled]);

  const {
    gestureData,
    eventHandlers,
    resetGesture,
  } = useTouchGestureManager({
    onSwipeLeft: handleSwipeLeft,
    onDragStart: handleDragStart,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    swipeThreshold: 30,
    dragThreshold: 8,
    enableHaptics: true,
    disabled: isDragOverlay,
  });

  const resetSwipe = useCallback(() => {
    setSwipeOffset(0);
    setIsDeleting(false);
    resetGesture();
  }, [resetGesture]);

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const swipeStyle = enableSwipe ? {
    transform: `translateX(-${swipeOffset}px)`,
    transition: swipeOffset === 0 ? 'transform 0.3s ease-out' : 'none',
  } : {};

  const combinedStyle = {
    ...dragStyle,
    ...swipeStyle,
    // Add touch-action optimization
    touchAction: gestureData.isDrag ? 'none' : gestureData.isSwipe ? 'pan-y' : 'manipulation',
  };

  const deleteProgress = swipeOffset / 120;

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent click when swiping
    if (swipeOffset > 0) {
      e.preventDefault();
      e.stopPropagation();
      resetSwipe();
      return;
    }
    
    // Don't interfere with button clicks
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.ant-btn')) {
      return;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete Background */}
      {enableSwipe && swipeOffset > 0 && (
        <div 
          className={`absolute inset-0 flex items-center justify-end pr-4 transition-colors duration-200 ${
            isDeleting 
              ? 'bg-red-500 text-white' 
              : 'bg-red-100 text-red-600'
          }`}
          style={{
            right: Math.max(0, swipeOffset - 120),
          }}
        >
          <div className="flex items-center gap-2">
            <WarningOutlined 
              className={`transition-transform duration-200 ${
                isDeleting ? 'scale-125' : 'scale-100'
              }`}
            />
            <span className="font-medium">
              {isDeleting ? 'Loslassen zum Löschen' : 'Weiter swipen'}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white bg-opacity-30">
            <div 
              className="h-full bg-white transition-all duration-100"
              style={{ width: `${deleteProgress * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Task Card */}
      <Card
        ref={(node) => {
          setNodeRef(node);
          if (cardRef.current !== node) {
            cardRef.current = node;
          }
        }}
        style={combinedStyle}
        {...attributes}
        {...(enableSwipe ? eventHandlers : {})}
        {...(gestureData.isDrag ? listeners : {})}
        size="small"
        className={`task-card relative z-10 ${isDragOverlay ? 'task-card-overlay' : ''} ${
          gestureData.isDrag ? 'cursor-grabbing' : 'cursor-grab'
        } hover:shadow-md transition-shadow duration-200`}
        hoverable
        onClick={handleCardClick}
        actions={[
          <PermissionGuard key="edit" listId={listId} requires="edit">
            <Tooltip title="Bearbeiten">
              <Button
                type="text"
                size="large"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🎯 Edit button clicked for task:', task.id);
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
                  size="large"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
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

      {/* Gesture State Debug Info (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-1 left-1 text-xs bg-black bg-opacity-50 text-white p-1 rounded pointer-events-none">
          {gestureData.state}
        </div>
      )}

      {/* Swipe Hint (only show when idle) */}
      {enableSwipe && swipeOffset === 0 && gestureData.state === 'IDLE' && (
        <div className="absolute top-2 right-2 opacity-30 pointer-events-none">
          <Text className="text-xs">← Swipe</Text>
        </div>
      )}

      {/* Performance monitoring styles */}
      <style jsx>{`
        .task-card {
          will-change: transform;
          backface-visibility: hidden;
          transform-style: preserve-3d;
        }
        
        .task-card-overlay {
          z-index: 1000;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
};