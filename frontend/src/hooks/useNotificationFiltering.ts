import { useMemo } from 'react';
import { useNotificationPreferences } from './useNotificationPreferences';
import { NotificationFrequency } from '../types';

export interface NotificationFilter {
  shouldShowInApp: boolean;
  shouldSendEmail: boolean;
  isTypeEnabled: (type: string) => boolean;
  frequency: NotificationFrequency;
}

export const useNotificationFiltering = (): NotificationFilter => {
  const { preferences } = useNotificationPreferences();

  return useMemo(() => {
    if (!preferences) {
      // Default fallback when preferences are not loaded
      return {
        shouldShowInApp: true,
        shouldSendEmail: true,
        isTypeEnabled: () => true,
        frequency: NotificationFrequency.IMMEDIATE,
      };
    }

    return {
      shouldShowInApp: preferences.inApp,
      shouldSendEmail: preferences.email,
      isTypeEnabled: (type: string) => {
        return preferences.types[type as keyof typeof preferences.types] ?? true;
      },
      frequency: preferences.frequency,
    };
  }, [preferences]);
};

// Helper hook for filtering notifications in components
export const useFilteredNotifications = <T extends { type: string }>(
  notifications: T[]
): T[] => {
  const filter = useNotificationFiltering();

  return useMemo(() => {
    if (!filter.shouldShowInApp) {
      return [];
    }

    return notifications.filter((notification) =>
      filter.isTypeEnabled(notification.type)
    );
  }, [notifications, filter]);
};