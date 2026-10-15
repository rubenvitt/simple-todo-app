/**
 * Network Status Hook
 * Provides real-time network connectivity information
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineProcessorService, ProcessingOptions, ProcessingResult } from '../services/offline-processor.service';

export interface NetworkStatus {
  isOnline: boolean;
  lastOnline: Date | null;
  lastOffline: Date | null;
  connectionType?: string;
  effectiveType?: string;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: {
    processed: number;
    total: number;
    percentage: number;
  } | null;
  results: ProcessingResult[];
  error: Error | null;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    offlineProcessorService.getNetworkStatus()
  );

  useEffect(() => {
    const unsubscribe = offlineProcessorService.subscribeToNetworkStatus(setNetworkStatus);
    return unsubscribe;
  }, []);

  return networkStatus;
}

export function useOfflineQueueProcessor() {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: null,
    results: [],
    error: null
  });

  const networkStatus = useNetworkStatus();

  /**
   * Process the offline queue
   */
  const processQueue = useCallback(async (options?: ProcessingOptions) => {
    if (!networkStatus.isOnline) {
      setProcessingState(prev => ({
        ...prev,
        error: new Error('Cannot process queue while offline')
      }));
      return;
    }

    setProcessingState({
      isProcessing: true,
      progress: { processed: 0, total: 0, percentage: 0 },
      results: [],
      error: null
    });

    try {
      const results = await offlineProcessorService.processQueue({
        ...options,
        onProgress: (processed, total) => {
          const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
          setProcessingState(prev => ({
            ...prev,
            progress: { processed, total, percentage }
          }));
          options?.onProgress?.(processed, total);
        },
        onBatchComplete: (batchResults) => {
          setProcessingState(prev => ({
            ...prev,
            results: [...prev.results, ...batchResults]
          }));
          options?.onBatchComplete?.(batchResults);
        },
        onError: (error) => {
          setProcessingState(prev => ({
            ...prev,
            error
          }));
          options?.onError?.(error);
        }
      });

      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        results
      }));

      return results;

    } catch (error) {
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        error: error as Error
      }));
      throw error;
    }
  }, [networkStatus.isOnline]);

  /**
   * Stop processing
   */
  const stopProcessing = useCallback(() => {
    offlineProcessorService.stopProcessing();
    setProcessingState(prev => ({
      ...prev,
      isProcessing: false
    }));
  }, []);

  /**
   * Pause processing
   */
  const pauseProcessing = useCallback(() => {
    offlineProcessorService.pauseProcessing();
    setProcessingState(prev => ({
      ...prev,
      isProcessing: false
    }));
  }, []);

  /**
   * Resume processing
   */
  const resumeProcessing = useCallback(async (options?: ProcessingOptions) => {
    await processQueue(options);
  }, [processQueue]);

  /**
   * Clear processing state
   */
  const clearProcessingState = useCallback(() => {
    setProcessingState({
      isProcessing: false,
      progress: null,
      results: [],
      error: null
    });
  }, []);

  return {
    networkStatus,
    processingState,
    processQueue,
    stopProcessing,
    pauseProcessing,
    resumeProcessing,
    clearProcessingState,
    isCurrentlyProcessing: offlineProcessorService.isCurrentlyProcessing()
  };
}

/**
 * Auto-process queue when coming online
 */
export function useAutoOfflineQueueProcessor(enabled = true, options?: ProcessingOptions) {
  const { networkStatus, processQueue } = useOfflineQueueProcessor();
  const [hasAutoProcessed, setHasAutoProcessed] = useState(false);

  useEffect(() => {
    if (enabled && networkStatus.isOnline && !hasAutoProcessed) {
      // Auto-process when coming online
      processQueue(options).finally(() => {
        setHasAutoProcessed(true);
      });
    } else if (!networkStatus.isOnline) {
      // Reset flag when going offline
      setHasAutoProcessed(false);
    }
  }, [networkStatus.isOnline, enabled, hasAutoProcessed, processQueue, options]);

  return {
    networkStatus,
    hasAutoProcessed
  };
}

export default useNetworkStatus;