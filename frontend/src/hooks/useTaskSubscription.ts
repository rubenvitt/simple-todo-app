import { useCallback } from 'react';
import { useWebSocket, useWebSocketMessage } from './';

interface TaskUpdate {
  id: string;
  listId: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  dueDate?: string;
  updatedAt: string;
  updatedBy: string;
}

interface TaskCreated {
  task: TaskUpdate;
  listId: string;
}

interface TaskDeleted {
  id: string;
  listId: string;
  deletedBy: string;
}

interface TaskMoved {
  id: string;
  fromListId: string;
  toListId: string;
  newPosition: number;
  movedBy: string;
}

interface UseTaskSubscriptionOptions {
  listId?: string;
  onTaskUpdate?: (task: TaskUpdate) => void;
  onTaskCreated?: (data: TaskCreated) => void;
  onTaskDeleted?: (data: TaskDeleted) => void;
  onTaskMoved?: (data: TaskMoved) => void;
  enabled?: boolean;
}

export const useTaskSubscription = (
  wsHook: ReturnType<typeof useWebSocket>,
  options: UseTaskSubscriptionOptions
) => {
  const { listId, onTaskUpdate, onTaskCreated, onTaskDeleted, onTaskMoved, enabled = true } = options;

  const handleTaskUpdate = useCallback((data: TaskUpdate) => {
    if (!listId || data.listId === listId) {
      onTaskUpdate?.(data);
    }
  }, [listId, onTaskUpdate]);

  const handleTaskCreated = useCallback((data: TaskCreated) => {
    if (!listId || data.listId === listId) {
      onTaskCreated?.(data);
    }
  }, [listId, onTaskCreated]);

  const handleTaskDeleted = useCallback((data: TaskDeleted) => {
    if (!listId || data.listId === listId) {
      onTaskDeleted?.(data);
    }
  }, [listId, onTaskDeleted]);

  const handleTaskMoved = useCallback((data: TaskMoved) => {
    if (!listId || data.fromListId === listId || data.toListId === listId) {
      onTaskMoved?.(data);
    }
  }, [listId, onTaskMoved]);

  const taskUpdateSubscription = useWebSocketMessage<TaskUpdate>(wsHook, {
    eventType: 'task:updated',
    onMessage: handleTaskUpdate,
    enabled: enabled && !!onTaskUpdate,
    autoAcknowledge: true
  });

  const taskCreatedSubscription = useWebSocketMessage<TaskCreated>(wsHook, {
    eventType: 'task:created',
    onMessage: handleTaskCreated,
    enabled: enabled && !!onTaskCreated,
    autoAcknowledge: true
  });

  const taskDeletedSubscription = useWebSocketMessage<TaskDeleted>(wsHook, {
    eventType: 'task:deleted',
    onMessage: handleTaskDeleted,
    enabled: enabled && !!onTaskDeleted,
    autoAcknowledge: true
  });

  const taskMovedSubscription = useWebSocketMessage<TaskMoved>(wsHook, {
    eventType: 'task:moved',
    onMessage: handleTaskMoved,
    enabled: enabled && !!onTaskMoved,
    autoAcknowledge: true
  });

  return {
    subscribeToList: (newListId: string) => {
      if (wsHook.isConnected) {
        wsHook.send('subscribe:list', { listId: newListId });
      }
    },
    unsubscribeFromList: (oldListId: string) => {
      if (wsHook.isConnected) {
        wsHook.send('unsubscribe:list', { listId: oldListId });
      }
    },
    subscriptions: {
      taskUpdate: taskUpdateSubscription,
      taskCreated: taskCreatedSubscription,
      taskDeleted: taskDeletedSubscription,
      taskMoved: taskMovedSubscription
    }
  };
};