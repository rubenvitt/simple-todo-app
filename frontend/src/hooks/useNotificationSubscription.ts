import { useCallback } from 'react';
import { useWebSocket, useWebSocketMessage } from './';

interface Notification {
  id: string;
  userId: string;
  type: 'task_assigned' | 'task_completed' | 'list_shared' | 'invitation_received' | 'comment_added';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

interface NotificationUpdate {
  id: string;
  read: boolean;
  updatedAt: string;
}

interface UseNotificationSubscriptionOptions {
  onNotificationReceived?: (notification: Notification) => void;
  onNotificationUpdated?: (update: NotificationUpdate) => void;
  onNotificationDeleted?: (notificationId: string) => void;
  enabled?: boolean;
}

export const useNotificationSubscription = (
  wsHook: ReturnType<typeof useWebSocket>,
  options: UseNotificationSubscriptionOptions
) => {
  const { 
    onNotificationReceived, 
    onNotificationUpdated, 
    onNotificationDeleted, 
    enabled = true 
  } = options;

  const handleNotificationReceived = useCallback((notification: Notification) => {
    onNotificationReceived?.(notification);
  }, [onNotificationReceived]);

  const handleNotificationUpdated = useCallback((update: NotificationUpdate) => {
    onNotificationUpdated?.(update);
  }, [onNotificationUpdated]);

  const handleNotificationDeleted = useCallback((data: { id: string }) => {
    onNotificationDeleted?.(data.id);
  }, [onNotificationDeleted]);

  const notificationReceivedSubscription = useWebSocketMessage<Notification>(wsHook, {
    eventType: 'notification:received',
    onMessage: handleNotificationReceived,
    enabled: enabled && !!onNotificationReceived,
    autoAcknowledge: true,
    messageHistory: true,
    maxHistorySize: 50
  });

  const notificationUpdatedSubscription = useWebSocketMessage<NotificationUpdate>(wsHook, {
    eventType: 'notification:updated',
    onMessage: handleNotificationUpdated,
    enabled: enabled && !!onNotificationUpdated,
    autoAcknowledge: true
  });

  const notificationDeletedSubscription = useWebSocketMessage<{ id: string }>(wsHook, {
    eventType: 'notification:deleted',
    onMessage: handleNotificationDeleted,
    enabled: enabled && !!onNotificationDeleted,
    autoAcknowledge: true
  });

  return {
    markAsRead: (notificationId: string) => {
      if (wsHook.isConnected) {
        wsHook.send('notification:mark_read', { id: notificationId });
      }
    },
    markAllAsRead: () => {
      if (wsHook.isConnected) {
        wsHook.send('notification:mark_all_read', {});
      }
    },
    deleteNotification: (notificationId: string) => {
      if (wsHook.isConnected) {
        wsHook.send('notification:delete', { id: notificationId });
      }
    },
    subscriptions: {
      notificationReceived: notificationReceivedSubscription,
      notificationUpdated: notificationUpdatedSubscription,
      notificationDeleted: notificationDeletedSubscription
    }
  };
};