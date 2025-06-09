import { apiClient } from './api.service';

export type NotificationType = 
  | 'GENERAL'
  | 'TASK_ASSIGNMENT'
  | 'TASK_STATUS_CHANGE'
  | 'LIST_SHARED'
  | 'INVITATION_RECEIVED'
  | 'INVITATION_ACCEPTED'
  | 'LIST_UPDATE';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  readStatus: boolean;
  createdAt: string;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryNotificationsParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  readStatus?: boolean;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export const notificationsService = {
  getNotifications: async (params?: QueryNotificationsParams): Promise<PaginatedNotifications> => {
    const { data } = await apiClient.get<PaginatedNotifications>('/notifications', { params });
    return data;
  },

  getNotification: async (id: string): Promise<Notification> => {
    const { data } = await apiClient.get<Notification>(`/notifications/${id}`);
    return data;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const { data } = await apiClient.patch<Notification>(`/notifications/${id}/read`);
    return data;
  },

  markAsUnread: async (id: string): Promise<Notification> => {
    const { data } = await apiClient.patch<Notification>(`/notifications/${id}/unread`);
    return data;
  },

  markAllAsRead: async (): Promise<{ updated: number }> => {
    const { data } = await apiClient.patch<{ updated: number }>('/notifications/mark-all-read');
    return data;
  },

  deleteNotification: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get<PaginatedNotifications>('/notifications', {
      params: { readStatus: false, limit: 1 }
    });
    return data.total;
  },
};