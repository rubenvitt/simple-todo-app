// Export all custom hooks from this directory

// Authentication hooks
export { useAuth } from './useAuth';

// WebSocket hooks
export { useWebSocket } from './useWebSocket';
export { useWebSocketEvent } from './useWebSocketEvent';
export { useWebSocketConnection } from './useWebSocketConnection';
export { useWebSocketMessage } from './useWebSocketMessage';

// WebSocket subscription hooks
export { useTaskSubscription } from './useTaskSubscription';
export { useNotificationSubscription } from './useNotificationSubscription';
export { useUserPresence } from './useUserPresence';

// Optimistic update hooks
export { useOptimisticUpdates } from './useOptimisticUpdates';
export { useOptimisticTasks } from './useOptimisticTasks';
export { 
  useOptimisticOfflineUpdates, 
  useOptimisticCollectionUpdates 
} from './useOptimisticOfflineUpdates';
export type { 
  OptimisticState, 
  OptimisticAction, 
  UseOptimisticOfflineUpdatesOptions 
} from './useOptimisticOfflineUpdates';

// Form handling hooks
export { useFormConfig, createFieldProps } from './useFormConfig';

// Lists hooks
export { useLists, useList, useCreateList, useUpdateList, useDeleteList } from './useLists';

// List shares hooks
export { 
  useListShares, 
  useShareList, 
  useUpdateListShare, 
  useRemoveListShare, 
  useSearchUsers 
} from './useListShares';

// Notifications hooks
export {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkAsRead,
  useMarkAsUnread,
  useMarkAllAsRead,
  useDeleteNotification
} from './useNotifications';
export { useNotificationWebSocket } from './useNotificationWebSocket';
export { useNotificationPreferences } from './useNotificationPreferences';
export { useNotificationFiltering, useFilteredNotifications } from './useNotificationFiltering';

// Permission hooks
export { usePermissions, PermissionGuard } from './usePermissions';

// Tasks hooks
export { 
  useTasks, 
  useCreateTask, 
  useUpdateTaskStatus, 
  useUpdateTaskOrder, 
  useUpdateTask, 
  useDeleteTask 
} from './useTasks';

// Internationalization hooks
export { useTranslation } from './useTranslation';

// Mobile detection hooks
export { 
  useMobileDetection, 
  useMobileViewport, 
  useHoverSupport, 
  usePrefersReducedMotion, 
  useDeviceDetection 
} from './useMobileDetection';

// Swipe gesture hooks
export { useSwipeGestures, useSwipeToDelete, useSwipeNavigation, useMomentumScroll } from './useSwipeGestures';
export { useTouchGestureManager } from './useTouchGestureManager';

// Responsive hooks
export { useResponsiveKanban } from './useResponsiveKanban';

// Pull-to-refresh hooks
export { usePullToRefresh, useListPullToRefresh } from './usePullToRefresh';

// Network and offline hooks
export { 
  useNetworkStatus, 
  useOfflineQueueProcessor, 
  useAutoOfflineQueueProcessor 
} from './useNetworkStatus';

// Performance and lazy loading hooks
export { 
  useIntersectionObserver, 
  LazyOnScroll, 
  useProgressiveLoading 
} from './useIntersectionObserver';
export { 
  useRoutePreloader, 
  usePreloadOnHover, 
  useAutoPreloadCriticalRoutes,
  CRITICAL_ROUTES 
} from './useRoutePreloader';

// Haptic feedback hooks
export { useHaptics } from './useHaptics';
export type { HapticPattern, HapticPreferences } from './useHaptics';
export { useSwipeHaptics } from './useSwipeHaptics';
export type { SwipeHapticsConfig } from './useSwipeHaptics';

// Enhanced swipe gesture hooks
export { useEnhancedSwipeGestures } from './useEnhancedSwipeGestures';
export type { 
  SwipeProgress, 
  SwipeThresholds, 
  SwipeGestureConfig, 
  SwipeVisualState 
} from './useEnhancedSwipeGestures';
