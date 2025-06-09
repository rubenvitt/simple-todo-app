import React from 'react';
import { List, Typography, Space, Button, theme, Badge } from 'antd';
import { 
  CheckCircleOutlined, 
  UserAddOutlined, 
  FileTextOutlined,
  ShareAltOutlined,
  MailOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { Notification, NotificationType } from '../../services/notifications.service';
import { formatDistanceToNow } from 'date-fns';

const { Text, Paragraph } = Typography;

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread: (id: string) => void;
  onDelete: (id: string) => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'TASK_ASSIGNMENT':
      return <UserAddOutlined style={{ color: '#1890ff' }} />;
    case 'TASK_STATUS_CHANGE':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'LIST_SHARED':
      return <ShareAltOutlined style={{ color: '#722ed1' }} />;
    case 'INVITATION_RECEIVED':
      return <MailOutlined style={{ color: '#fa8c16' }} />;
    case 'INVITATION_ACCEPTED':
      return <UserAddOutlined style={{ color: '#52c41a' }} />;
    case 'LIST_UPDATE':
      return <FileTextOutlined style={{ color: '#1890ff' }} />;
    case 'GENERAL':
    default:
      return <InfoCircleOutlined style={{ color: '#8c8c8c' }} />;
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
}) => {
  const { token } = theme.useToken();

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { 
    addSuffix: true 
  });

  return (
    <List.Item
      style={{
        padding: '12px 16px',
        backgroundColor: notification.readStatus ? 'transparent' : token.colorBgTextHover,
        borderRadius: token.borderRadius,
        marginBottom: 8,
        transition: 'all 0.3s',
        cursor: 'pointer',
      }}
      actions={[
        <Button
          key="toggle-read"
          type="text"
          size="small"
          icon={notification.readStatus ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            if (notification.readStatus) {
              onMarkAsUnread(notification.id);
            } else {
              onMarkAsRead(notification.id);
            }
          }}
        />,
        <Button
          key="delete"
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
        />,
      ]}
    >
      <List.Item.Meta
        avatar={
          <div style={{ fontSize: 20, marginTop: 4 }}>
            {!notification.readStatus && (
              <Badge dot status="processing" offset={[-5, 5]}>
                {getNotificationIcon(notification.type)}
              </Badge>
            )}
            {notification.readStatus && getNotificationIcon(notification.type)}
          </div>
        }
        title={
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Text strong={!notification.readStatus}>
              {notification.title}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {timeAgo}
            </Text>
          </Space>
        }
        description={
          <Paragraph 
            ellipsis={{ rows: 2 }} 
            style={{ 
              margin: 0,
              color: notification.readStatus ? token.colorTextSecondary : token.colorText,
            }}
          >
            {notification.message}
          </Paragraph>
        }
      />
    </List.Item>
  );
};