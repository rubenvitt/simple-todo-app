import { useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

interface OptimisticUpdate<T = any> {
  id: string;
  type: string;
  optimisticData: T;
  originalData?: T;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'confirmed' | 'failed' | 'reverted';
}

interface OptimisticUpdateOptions<T = any> {
  timeout?: number;
  maxRetries?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: any, originalData?: T) => void;
  onRevert?: (originalData: T) => void;
}

interface UseOptimisticUpdatesReturn<T = any> {
  pendingUpdates: OptimisticUpdate<T>[];
  performUpdate: (
    type: string,
    optimisticData: T,
    originalData?: T,
    options?: OptimisticUpdateOptions<T>
  ) => Promise<T>;
  confirmUpdate: (updateId: string, serverData?: T) => void;
  revertUpdate: (updateId: string) => void;
  retryUpdate: (updateId: string) => Promise<void>;
  clearPendingUpdates: () => void;
}

export const useOptimisticUpdates = <T = any>(
  wsHook: ReturnType<typeof useWebSocket>
): UseOptimisticUpdatesReturn<T> => {
  const { send, isConnected, subscribe } = wsHook;
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate<T>[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const optionsRef = useRef<Map<string, OptimisticUpdateOptions<T>>>(new Map());

  const generateUpdateId = useCallback(() => {
    return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const performUpdate = useCallback(async (
    type: string,
    optimisticData: T,
    originalData?: T,
    options: OptimisticUpdateOptions<T> = {}
  ): Promise<T> => {
    const updateId = generateUpdateId();
    const { timeout = 10000, maxRetries = 3 } = options;

    const update: OptimisticUpdate<T> = {
      id: updateId,
      type,
      optimisticData,
      originalData,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    setPendingUpdates(prev => [...prev, update]);
    optionsRef.current.set(updateId, options);

    if (isConnected) {
      send(type, { ...optimisticData, _updateId: updateId });
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const currentUpdate = pendingUpdates.find(u => u.id === updateId);
        
        if (currentUpdate && currentUpdate.retryCount < maxRetries) {
          retryUpdate(updateId).then(resolve).catch(reject);
        } else {
          revertUpdate(updateId);
          reject(new Error(`Update ${updateId} timed out after ${timeout}ms`));
        }
      }, timeout);

      timeoutsRef.current.set(updateId, timeoutId);

      const unsubscribeSuccess = subscribe(`${type}:success`, (data: any) => {
        if (data._updateId === updateId) {
          clearTimeout(timeoutId);
          timeoutsRef.current.delete(updateId);
          confirmUpdate(updateId, data);
          unsubscribeSuccess();
          resolve(data);
        }
      });

      const unsubscribeError = subscribe(`${type}:error`, (error: any) => {
        if (error._updateId === updateId) {
          clearTimeout(timeoutId);
          timeoutsRef.current.delete(updateId);
          
          const opts = optionsRef.current.get(updateId);
          if (opts?.onError) {
            opts.onError(error, originalData);
          }
          
          revertUpdate(updateId);
          unsubscribeError();
          reject(error);
        }
      });
    });
  }, [generateUpdateId, isConnected, send, subscribe, pendingUpdates]);

  const confirmUpdate = useCallback((updateId: string, serverData?: T) => {
    setPendingUpdates(prev => 
      prev.map(update => 
        update.id === updateId 
          ? { ...update, status: 'confirmed' as const, optimisticData: serverData || update.optimisticData }
          : update
      )
    );

    const options = optionsRef.current.get(updateId);
    if (options?.onSuccess) {
      const update = pendingUpdates.find(u => u.id === updateId);
      if (update) {
        options.onSuccess(serverData || update.optimisticData);
      }
    }

    setTimeout(() => {
      setPendingUpdates(prev => prev.filter(u => u.id !== updateId));
      optionsRef.current.delete(updateId);
    }, 1000);
  }, [pendingUpdates]);

  const revertUpdate = useCallback((updateId: string) => {
    setPendingUpdates(prev => 
      prev.map(update => 
        update.id === updateId 
          ? { ...update, status: 'reverted' as const }
          : update
      )
    );

    const update = pendingUpdates.find(u => u.id === updateId);
    const options = optionsRef.current.get(updateId);
    
    if (update?.originalData && options?.onRevert) {
      options.onRevert(update.originalData);
    }

    setTimeout(() => {
      setPendingUpdates(prev => prev.filter(u => u.id !== updateId));
      optionsRef.current.delete(updateId);
    }, 1000);
  }, [pendingUpdates]);

  const retryUpdate = useCallback(async (updateId: string): Promise<void> => {
    const update = pendingUpdates.find(u => u.id === updateId);
    if (!update) return;

    setPendingUpdates(prev => 
      prev.map(u => 
        u.id === updateId 
          ? { ...u, retryCount: u.retryCount + 1, status: 'pending' as const }
          : u
      )
    );

    if (isConnected) {
      send(update.type, { ...update.optimisticData, _updateId: updateId });
    }
  }, [pendingUpdates, isConnected, send]);

  const clearPendingUpdates = useCallback(() => {
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();
    optionsRef.current.clear();
    setPendingUpdates([]);
  }, []);

  useEffect(() => {
    return () => {
      clearPendingUpdates();
    };
  }, [clearPendingUpdates]);

  useEffect(() => {
    if (!isConnected) {
      pendingUpdates
        .filter(update => update.status === 'pending')
        .forEach(update => {
          const timeout = setTimeout(() => {
            revertUpdate(update.id);
          }, 30000);
          timeoutsRef.current.set(update.id, timeout);
        });
    } else {
      pendingUpdates
        .filter(update => update.status === 'pending')
        .forEach(update => {
          retryUpdate(update.id);
        });
    }
  }, [isConnected, pendingUpdates, revertUpdate, retryUpdate]);

  return {
    pendingUpdates,
    performUpdate,
    confirmUpdate,
    revertUpdate,
    retryUpdate,
    clearPendingUpdates
  };
};