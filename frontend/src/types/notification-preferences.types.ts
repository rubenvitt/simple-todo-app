export enum NotificationFrequency {
  IMMEDIATE = 'IMMEDIATE',
  DAILY_DIGEST = 'DAILY_DIGEST',
  WEEKLY_DIGEST = 'WEEKLY_DIGEST',
  DISABLED = 'DISABLED',
}

export interface NotificationTypePreferences {
  GENERAL: boolean;
  TASK_ASSIGNMENT: boolean;
  TASK_STATUS_CHANGE: boolean;
  LIST_SHARED: boolean;
  INVITATION_RECEIVED: boolean;
  INVITATION_ACCEPTED: boolean;
  LIST_UPDATE: boolean;
}

export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  frequency: NotificationFrequency;
  types: NotificationTypePreferences;
}

export interface UpdateNotificationPreferencesRequest {
  inApp?: boolean;
  email?: boolean;
  frequency?: NotificationFrequency;
  types?: Partial<NotificationTypePreferences>;
}