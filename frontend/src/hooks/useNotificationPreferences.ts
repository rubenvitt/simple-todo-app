import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { notificationPreferencesService } from '../services';
import { UpdateNotificationPreferencesRequest } from '../types';
import { useTranslation } from './useTranslation';

export const useNotificationPreferences = () => {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();

  const {
    data: preferences,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationPreferencesService.getPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (data: UpdateNotificationPreferencesRequest) =>
      notificationPreferencesService.updatePreferences(data),
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(['notification-preferences'], updatedPreferences);
      message.success(t('settings.preferences.updateSuccess'));
    },
    onError: (error: any) => {
      console.error('Failed to update notification preferences:', error);
      message.error(t('settings.preferences.updateError'));
    },
  });

  return {
    preferences,
    isLoading,
    error,
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending,
  };
};