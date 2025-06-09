import { apiClient } from './api';
import { NotificationPreferences, UpdateNotificationPreferencesRequest } from '../types';

export const notificationPreferencesService = {
  async getPreferences(): Promise<NotificationPreferences> {
    const { data } = await apiClient.get<NotificationPreferences>('/users/notification-preferences');
    return data;
  },

  async updatePreferences(
    preferences: UpdateNotificationPreferencesRequest
  ): Promise<NotificationPreferences> {
    const { data } = await apiClient.put<NotificationPreferences>(
      '/users/notification-preferences',
      preferences
    );
    return data;
  },
};