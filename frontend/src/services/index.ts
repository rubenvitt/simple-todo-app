export { apiClient, handleApiError } from './api';
export { queryClient, queryKeys } from './queryClient';
export { default as WebSocketService, ConnectionState } from './websocket.service';
export { default as AuthenticatedWebSocketService } from './websocket-auth.service';
export { AuthService } from './auth.service';
export { tokenStorage } from './token-storage.service';
export { listsService } from './lists.service';
export { listSharesService } from './list-shares.service';
export { notificationsService } from './notifications.service';
export type { Notification, NotificationType, PaginatedNotifications } from './notifications.service';
export { notificationPreferencesService } from './notification-preferences.service';
export { offlineStorageService } from './offline-storage.service';
export type { QueuedAction, OfflineMetadata } from './offline-storage.service';
export { offlineQueueService } from './offline-queue.service';
export type { ActionType, EntityType, Priority, ActionPayload, QueueOptions, QueueStats } from './offline-queue.service';
export { offlineProcessorService } from './offline-processor.service';
export type { ProcessingOptions, ProcessingResult, NetworkStatus } from './offline-processor.service';
export { conflictResolutionService } from './conflict-resolution.service';
export type { 
  ConflictResolutionStrategy, 
  ConflictData, 
  ConflictResolution, 
  RetryConfig 
} from './conflict-resolution.service';
export { performanceMonitoring } from './performance-monitoring.service';
export type { PerformanceMetric, PerformanceMetrics, PerformanceThresholds } from './performance-monitoring.service';
export { mobilePerformance } from './mobile-performance.service';
export type { TouchMetric, ScrollMetric, AnimationMetric, MemoryMetric } from './mobile-performance.service';
export { performanceBudget } from './performance-budget.service';
export type { PerformanceBudget, BudgetViolation, BudgetConfig } from './performance-budget.service';
