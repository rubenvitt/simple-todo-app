import React from 'react';
import { Badge, Button } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useUnreadNotificationsCount } from '../../hooks/useNotifications';
import { useNotificationFiltering } from '../../hooks';

interface NotificationBadgeProps {
  onClick: () => void;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ onClick }) => {
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const { shouldShowInApp } = useNotificationFiltering();

  // If in-app notifications are disabled, don't show the badge
  if (!shouldShowInApp) {
    return null;
  }

  return (
    <Badge count={unreadCount} size="small" overflowCount={99}>
      <Button
        type="text"
        icon={<BellOutlined />}
        onClick={onClick}
        style={{
          fontSize: '16px',
          width: 40,
          height: 40,
        }}
      />
    </Badge>
  );
};