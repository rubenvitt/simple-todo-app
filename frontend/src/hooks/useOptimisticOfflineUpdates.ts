/**
 * Optimistic UI Updates Hook for Offline Actions
 * Provides immediate UI feedback with rollback capability
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { offlineQueueService, ActionType, EntityType, ActionPayload, QueueOptions } from '../services';

export interface OptimisticState<T> {
  data: T;
  isPending: boolean;
  isOptimistic: boolean;
  actionId?: string;
  error?: Error;
}

export interface OptimisticAction<T> {
  id: string;
  type: ActionType;
  entity: EntityType;
  optimisticData: T;
  originalData: T;
  timestamp: number;
}

export interface UseOptimisticOfflineUpdatesOptions {
  onSuccess?: (actionId: string) => void;
  onError?: (actionId: string, error: Error) => void;
  onRollback?: (actionId: string) => void;
  enableOptimisticUpdates?: boolean;
}

export function useOptimisticOfflineUpdates<T>(
  initialData: T,
  options: UseOptimisticOfflineUpdatesOptions = {}
) {
  const {
    onSuccess,
    onError,
    onRollback,
    enableOptimisticUpdates = true
  } = options;

  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isPending: false,
    isOptimistic: false
  });

  const pendingActions = useRef<Map<string, OptimisticAction<T>>>(new Map());
  const stateSnapshots = useRef<Map<string, T>>(new Map());

  /**
   * Execute optimistic update
   */
  const executeOptimisticUpdate = useCallback(async (
    type: ActionType,
    entity: EntityType,
    payload: ActionPayload,
    optimisticDataTransform: (currentData: T) => T,
    options: QueueOptions = {}
  ): Promise<string> => {
    const actionId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentData = state.data;
    
    try {
      // Create snapshot of current state
      stateSnapshots.current.set(actionId, currentData);

      // Apply optimistic update if enabled
      if (enableOptimisticUpdates) {
        const optimisticData = optimisticDataTransform(currentData);
        
        // Store action for potential rollback
        pendingActions.current.set(actionId, {
          id: actionId,
          type,
          entity,
          optimisticData,
          originalData: currentData,
          timestamp: Date.now()
        });

        // Update UI optimistically
        setState(prev => ({
          ...prev,
          data: optimisticData,
          isPending: true,
          isOptimistic: true,
          actionId
        }));
      } else {
        // Just show pending state without optimistic data
        setState(prev => ({
          ...prev,
          isPending: true,
          isOptimistic: false,
          actionId
        }));
      }

      // Queue action for offline processing
      const queuedActionId = await offlineQueueService.enqueueAction(
        type,
        entity,
        payload,
        {
          ...options,
          metadata: {
            ...options.metadata,
            optimisticActionId: actionId,
            hasOptimisticUpdate: enableOptimisticUpdates
          }
        }
      );

      return queuedActionId;

    } catch (error) {
      // Rollback on immediate error
      await rollbackOptimisticUpdate(actionId, error as Error);
      throw error;
    }
  }, [state.data, enableOptimisticUpdates]);

  /**
   * Confirm optimistic update (called when action succeeds)
   */
  const confirmOptimisticUpdate = useCallback((actionId: string, actualData?: T) => {
    const action = pendingActions.current.get(actionId);
    if (!action) return;

    // Update with actual data if provided, otherwise keep optimistic data
    const finalData = actualData || action.optimisticData;

    setState(prev => {
      // Only update if this is the current action
      if (prev.actionId === actionId) {
        return {
          data: finalData,
          isPending: false,
          isOptimistic: false,
          actionId: undefined,
          error: undefined
        };
      }
      return prev;
    });

    // Clean up
    pendingActions.current.delete(actionId);
    stateSnapshots.current.delete(actionId);

    onSuccess?.(actionId);
  }, [onSuccess]);

  /**
   * Rollback optimistic update (called when action fails)
   */
  const rollbackOptimisticUpdate = useCallback(async (actionId: string, error?: Error) => {
    const action = pendingActions.current.get(actionId);
    const originalSnapshot = stateSnapshots.current.get(actionId);

    if (action && originalSnapshot) {
      setState(prev => {
        // Only rollback if this is the current action
        if (prev.actionId === actionId) {
          return {
            data: originalSnapshot,
            isPending: false,
            isOptimistic: false,
            actionId: undefined,
            error
          };
        }
        return prev;
      });

      // Clean up
      pendingActions.current.delete(actionId);
      stateSnapshots.current.delete(actionId);

      onRollback?.(actionId);
      onError?.(actionId, error || new Error('Action failed'));
    }
  }, [onRollback, onError]);

  /**
   * Manually update data (for external updates)
   */
  const updateData = useCallback((newData: T | ((prevData: T) => T)) => {
    setState(prev => ({
      ...prev,
      data: typeof newData === 'function' ? (newData as Function)(prev.data) : newData,
      error: undefined
    }));
  }, []);

  /**
   * Reset state
   */
  const resetState = useCallback(() => {
    setState({
      data: initialData,
      isPending: false,
      isOptimistic: false
    });
    pendingActions.current.clear();
    stateSnapshots.current.clear();
  }, [initialData]);

  /**
   * Get pending actions count
   */
  const getPendingActionsCount = useCallback(() => {
    return pendingActions.current.size;
  }, []);

  /**
   * Check if specific action is pending
   */
  const isActionPending = useCallback((actionId: string) => {
    return pendingActions.current.has(actionId);
  }, []);

  /**
   * Get all pending actions
   */
  const getPendingActions = useCallback(() => {
    return Array.from(pendingActions.current.values());
  }, []);

  // Clean up old snapshots periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes

      for (const [actionId, action] of pendingActions.current.entries()) {
        if (now - action.timestamp > maxAge) {
          pendingActions.current.delete(actionId);
          stateSnapshots.current.delete(actionId);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(cleanup);
  }, []);

  return {
    // State
    data: state.data,
    isPending: state.isPending,
    isOptimistic: state.isOptimistic,
    error: state.error,
    actionId: state.actionId,

    // Actions
    executeOptimisticUpdate,
    confirmOptimisticUpdate,
    rollbackOptimisticUpdate,
    updateData,
    resetState,

    // Utilities
    getPendingActionsCount,
    isActionPending,
    getPendingActions
  };
}

/**
 * Hook for managing optimistic updates for collections (arrays)
 */
export function useOptimisticCollectionUpdates<T extends { id: string }>(
  initialCollection: T[],
  options: UseOptimisticOfflineUpdatesOptions = {}
) {
  const baseHook = useOptimisticOfflineUpdates(initialCollection, options);

  /**
   * Add item to collection optimistically
   */
  const addItemOptimistically = useCallback(async (
    entity: EntityType,
    payload: ActionPayload,
    optimisticItem: T,
    options: QueueOptions = {}
  ) => {
    return baseHook.executeOptimisticUpdate(
      'CREATE',
      entity,
      payload,
      (currentCollection) => [...currentCollection, optimisticItem],
      options
    );
  }, [baseHook]);

  /**
   * Update item in collection optimistically
   */
  const updateItemOptimistically = useCallback(async (
    entity: EntityType,
    payload: ActionPayload,
    itemId: string,
    updates: Partial<T>,
    options: QueueOptions = {}
  ) => {
    return baseHook.executeOptimisticUpdate(
      'UPDATE',
      entity,
      payload,
      (currentCollection) => 
        currentCollection.map(item => 
          item.id === itemId ? { ...item, ...updates } : item
        ),
      options
    );
  }, [baseHook]);

  /**
   * Remove item from collection optimistically
   */
  const removeItemOptimistically = useCallback(async (
    entity: EntityType,
    payload: ActionPayload,
    itemId: string,
    options: QueueOptions = {}
  ) => {
    return baseHook.executeOptimisticUpdate(
      'DELETE',
      entity,
      payload,
      (currentCollection) => currentCollection.filter(item => item.id !== itemId),
      options
    );
  }, [baseHook]);

  /**
   * Update entire collection
   */
  const updateCollection = useCallback((newCollection: T[] | ((prev: T[]) => T[])) => {
    baseHook.updateData(newCollection);
  }, [baseHook]);

  return {
    ...baseHook,
    collection: baseHook.data,
    addItemOptimistically,
    updateItemOptimistically,
    removeItemOptimistically,
    updateCollection
  };
}

export default useOptimisticOfflineUpdates;