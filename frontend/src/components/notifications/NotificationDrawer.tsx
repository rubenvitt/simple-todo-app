import React, { useState } from 'react';
import { Drawer, List, Button, Space, Typography, Select, Empty, Skeleton, message, Segmented } from 'antd';
import { 
  CheckOutlined,
  FilterOutlined 
} from '@ant-design/icons';
import { NotificationItem } from './NotificationItem';
import { 
  useNotifications, 
  useMarkAsRead, 
  useMarkAsUnread, 
  useMarkAllAsRead,
  useDeleteNotification,
  useFilteredNotifications 
} from '../../hooks';
import { NotificationType } from '../../services/notifications.service';
import { useTranslation } from '../../hooks/useTranslation';

const { Title, Text } = Typography;

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

const notificationTypeOptions = [
  { label: 'All', value: undefined },
  { label: 'General', value: 'GENERAL' },
  { label: 'Task Assignment', value: 'TASK_ASSIGNMENT' },
  { label: 'Task Status', value: 'TASK_STATUS_CHANGE' },
  { label: 'List Shared', value: 'LIST_SHARED' },
  { label: 'Invitations', value: 'INVITATION_RECEIVED' },
  { label: 'List Updates', value: 'LIST_UPDATE' },
];

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ open, onClose }) => {
  const { t } = useTranslation('common');
  const [filter, setFilter] = useState<{
    type?: NotificationType;
    readStatus?: boolean;
  }>({});
  
  const { data, isLoading, isFetching } = useNotifications({
    limit: 50,
    ...filter,
    sortOrder: 'desc',
  });

  const markAsRead = useMarkAsRead();
  const markAsUnread = useMarkAsUnread();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead.mutateAsync(id);
    } catch {
      message.error(t('notifications.markAsReadError'));
    }
  };

  const handleMarkAsUnread = async (id: string) => {
    try {
      await markAsUnread.mutateAsync(id);
    } catch {
      message.error(t('notifications.markAsUnreadError'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification.mutateAsync(id);
      message.success(t('notifications.deleteSuccess'));
    } catch {
      message.error(t('notifications.deleteError'));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync();
      message.success(t('notifications.markAllAsReadSuccess'));
    } catch {
      message.error(t('notifications.markAllAsReadError'));
    }
  };

  // Apply user preference filtering to notifications
  const filteredNotifications = useFilteredNotifications(data?.notifications ?? []);
  const unreadCount = filteredNotifications.filter(n => !n.readStatus).length;

  return (
    <Drawer
      title={
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              {t('notifications.title')}
            </Title>
            {unreadCount > 0 && (
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={handleMarkAllAsRead}
                loading={markAllAsRead.isPending}
              >
                {t('notifications.markAllAsRead')}
              </Button>
            )}
          </div>
          <Space wrap>
            <Segmented
              options={[
                { label: t('notifications.all'), value: 'all' },
                { label: t('notifications.unread'), value: 'unread' },
                { label: t('notifications.read'), value: 'read' },
              ]}
              value={filter.readStatus === undefined ? 'all' : filter.readStatus ? 'read' : 'unread'}
              onChange={(value) => {
                const readStatus = value === 'all' ? undefined : value === 'read' ? true : false;
                setFilter({ ...filter, readStatus });
              }}
            />
            <Select
              placeholder={t('notifications.filterByType')}
              allowClear
              style={{ width: 180 }}
              value={filter.type}
              onChange={(value) => setFilter({ ...filter, type: value })}
              options={notificationTypeOptions}
              suffixIcon={<FilterOutlined />}
            />
          </Space>
        </Space>
      }
      placement="right"
      width={400}
      onClose={onClose}
      open={open}
      styles={{
        body: { padding: 0 },
      }}
    >
      {isLoading ? (
        <div style={{ padding: 16 }}>
          <Skeleton active />
          <Skeleton active />
          <Skeleton active />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Empty 
          description={t('notifications.empty')}
          style={{ marginTop: 100 }}
        />
      ) : (
        <List
          dataSource={filteredNotifications}
          loading={isFetching && !isLoading}
          renderItem={(notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onMarkAsUnread={handleMarkAsUnread}
              onDelete={handleDelete}
            />
          )}
          style={{ 
            height: 'calc(100vh - 160px)', 
            overflow: 'auto',
            padding: '0 8px',
          }}
        />
      )}
      
      {data && data.totalPages > 1 && (
        <div style={{ 
          padding: 16, 
          borderTop: '1px solid #f0f0f0',
          textAlign: 'center' 
        }}>
          <Text type="secondary">
            {t('notifications.showingCount', { 
              count: filteredNotifications.length, 
              total: data.total 
            })}
          </Text>
        </div>
      )}
    </Drawer>
  );
};