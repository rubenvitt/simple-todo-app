import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { Notification } from '../services/notifications.service';
import { message } from 'antd';

const NOTIFICATIONS_KEY = 'notifications';
const UNREAD_COUNT_KEY = 'unreadNotificationsCount';

interface NotificationWebSocketEvent {
  notification: Notification;
  timestamp: string;
}

export const useNotificationWebSocket = () => {
  const queryClient = useQueryClient();
  const { wsHook } = useWebSocketContext();
  const { subscribe, isConnected } = wsHook;

  // Handle new notification events
  const handleNewNotification = useCallback((data: NotificationWebSocketEvent) => {
    const { notification } = data;
    
    // Invalidate and refetch notification queries
    queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
    
    // Show toast notification
    message.info({
      content: notification.title,
      duration: 4,
    });
  }, [queryClient]);

  // Handle notification updates (read status changes, etc.)
  const handleNotificationUpdate = useCallback((data: NotificationWebSocketEvent) => {
    const { notification } = data;
    
    // Update specific notification in cache if it exists
    queryClient.setQueriesData(
      { queryKey: [NOTIFICATIONS_KEY] },
      (oldData: any) => {
        if (!oldData?.notifications) return oldData;
        
        return {
          ...oldData,
          notifications: oldData.notifications.map((n: Notification) =>
            n.id === notification.id ? notification : n
          ),
        };
      }
    );
    
    // Invalidate unread count
    queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
  }, [queryClient]);

  // Handle notification deletion
  const handleNotificationDelete = useCallback((data: { notificationId: string }) => {
    const { notificationId } = data;
    
    // Remove notification from cache
    queryClient.setQueriesData(
      { queryKey: [NOTIFICATIONS_KEY] },
      (oldData: any) => {
        if (!oldData?.notifications) return oldData;
        
        return {
          ...oldData,
          notifications: oldData.notifications.filter((n: Notification) => n.id !== notificationId),
          total: Math.max(0, oldData.total - 1),
        };
      }
    );
    
    // Invalidate unread count
    queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
  }, [queryClient]);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeNew = subscribe('notification:new', handleNewNotification);
    const unsubscribeUpdate = subscribe('notification:updated', handleNotificationUpdate);
    const unsubscribeDelete = subscribe('notification:deleted', handleNotificationDelete);

    return () => {
      unsubscribeNew();
      unsubscribeUpdate();
      unsubscribeDelete();
    };
  }, [isConnected, subscribe, handleNewNotification, handleNotificationUpdate, handleNotificationDelete]);

  return {
    isConnected,
  };
};