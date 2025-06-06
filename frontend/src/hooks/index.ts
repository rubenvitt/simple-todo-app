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
