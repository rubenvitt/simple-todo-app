import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { notificationsService, QueryNotificationsParams, PaginatedNotifications } from '../services/notifications.service';

const NOTIFICATIONS_KEY = 'notifications';
const UNREAD_COUNT_KEY = 'unreadNotificationsCount';

export const useNotifications = (params?: QueryNotificationsParams, options?: UseQueryOptions<PaginatedNotifications>) => {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, params],
    queryFn: () => notificationsService.getNotifications(params),
    ...options,
  });
};

export const useUnreadNotificationsCount = () => {
  return useQuery({
    queryKey: [UNREAD_COUNT_KEY],
    queryFn: notificationsService.getUnreadCount,
    refetchInterval: 60000, // Refetch every minute as backup
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
    },
  });
};

export const useMarkAsUnread = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: notificationsService.markAsUnread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: notificationsService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: notificationsService.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
    },
  });
};