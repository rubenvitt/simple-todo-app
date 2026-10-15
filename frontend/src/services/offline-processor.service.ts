/**
 * Offline Queue Processor Service
 * Handles network detection and automatic queue processing
 */

import { offlineQueueService, QueuedAction, offlineStorageService } from './index';
import { apiClient } from './api';

export interface ProcessingOptions {
  batchSize?: number;
  maxConcurrentRequests?: number;
  retryDelay?: number;
  onProgress?: (processed: number, total: number) => void;
  onBatchComplete?: (results: ProcessingResult[]) => void;
  onError?: (error: Error) => void;
}

export interface ProcessingResult {
  actionId: string;
  success: boolean;
  response?: any;
  error?: Error;
  retried?: boolean;
}

export interface NetworkStatus {
  isOnline: boolean;
  lastOnline: Date | null;
  lastOffline: Date | null;
  connectionType?: string;
  effectiveType?: string;
}

class OfflineProcessorService {
  private static instance: OfflineProcessorService;
  private isProcessing = false;
  private networkStatus: NetworkStatus = {
    isOnline: navigator.onLine,
    lastOnline: navigator.onLine ? new Date() : null,
    lastOffline: !navigator.onLine ? new Date() : null
  };
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private processingQueue: Set<string> = new Set();
  private abortController: AbortController | null = null;

  private constructor() {
    this.initializeNetworkDetection();
  }

  static getInstance(): OfflineProcessorService {
    if (!OfflineProcessorService.instance) {
      OfflineProcessorService.instance = new OfflineProcessorService();
    }
    return OfflineProcessorService.instance;
  }

  /**
   * Initialize network status detection
   */
  private initializeNetworkDetection(): void {
    // Basic online/offline detection
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Enhanced connection detection if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', this.handleConnectionChange.bind(this));
        this.updateConnectionInfo();
      }
    }

    // Periodic connectivity check
    this.startConnectivityCheck();
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.networkStatus = {
      ...this.networkStatus,
      isOnline: true,
      lastOnline: new Date()
    };
    this.notifyListeners();
    
    // Auto-process queue when coming back online
    this.processQueueWhenOnline();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.networkStatus = {
      ...this.networkStatus,
      isOnline: false,
      lastOffline: new Date()
    };
    this.notifyListeners();
    
    // Stop any ongoing processing
    this.stopProcessing();
  }

  /**
   * Handle connection change
   */
  private handleConnectionChange(): void {
    this.updateConnectionInfo();
    this.notifyListeners();
  }

  /**
   * Update connection information
   */
  private updateConnectionInfo(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.networkStatus = {
          ...this.networkStatus,
          connectionType: connection.type,
          effectiveType: connection.effectiveType
        };
      }
    }
  }

  /**
   * Start periodic connectivity check
   */
  private startConnectivityCheck(): void {
    setInterval(async () => {
      const isActuallyOnline = await this.checkActualConnectivity();
      if (isActuallyOnline !== this.networkStatus.isOnline) {
        if (isActuallyOnline) {
          this.handleOnline();
        } else {
          this.handleOffline();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check actual connectivity by making a small request
   */
  private async checkActualConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        timeout: 5000
      } as any);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Process queue when coming back online
   */
  private async processQueueWhenOnline(): Promise<void> {
    if (!this.isProcessing && this.networkStatus.isOnline) {
      // Small delay to ensure connection is stable
      setTimeout(() => {
        this.processQueue();
      }, 1000);
    }
  }

  /**
   * Process the entire offline queue
   */
  async processQueue(options: ProcessingOptions = {}): Promise<ProcessingResult[]> {
    if (this.isProcessing) {
      throw new Error('Queue processing already in progress');
    }

    if (!this.networkStatus.isOnline) {
      throw new Error('Cannot process queue while offline');
    }

    const {
      batchSize = 10,
      maxConcurrentRequests = 3,
      retryDelay = 1000,
      onProgress,
      onBatchComplete,
      onError
    } = options;

    this.isProcessing = true;
    this.abortController = new AbortController();
    const results: ProcessingResult[] = [];

    try {
      const actions = await offlineQueueService.getAllActions();
      if (actions.length === 0) {
        return results;
      }

      let processed = 0;
      
      // Process in batches
      for (let i = 0; i < actions.length; i += batchSize) {
        if (this.abortController.signal.aborted) {
          break;
        }

        const batch = actions.slice(i, i + batchSize);
        const batchResults = await this.processBatch(batch, maxConcurrentRequests);
        
        results.push(...batchResults);
        processed += batch.length;
        
        onProgress?.(processed, actions.length);
        onBatchComplete?.(batchResults);

        // Small delay between batches to avoid overwhelming the server
        if (i + batchSize < actions.length) {
          await this.delay(retryDelay);
        }
      }

      return results;

    } catch (error) {
      onError?.(error as Error);
      throw error;
    } finally {
      this.isProcessing = false;
      this.abortController = null;
    }
  }

  /**
   * Process a batch of actions concurrently
   */
  private async processBatch(
    actions: QueuedAction[],
    maxConcurrent: number
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    const chunks = this.chunkArray(actions, maxConcurrent);

    for (const chunk of chunks) {
      if (this.abortController?.signal.aborted) {
        break;
      }

      const chunkPromises = chunk.map(action => this.processAction(action));
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      results.push(...chunkResults.map((result, index) => {
        const action = chunk[index];
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            actionId: action.id,
            success: false,
            error: result.reason
          };
        }
      }));
    }

    return results;
  }

  /**
   * Process a single action
   */
  private async processAction(action: QueuedAction): Promise<ProcessingResult> {
    this.processingQueue.add(action.id);

    try {
      // Execute the API request
      const response = await this.executeActionRequest(action);
      
      // Remove from queue on success
      await offlineQueueService.removeAction(action.id);
      
      return {
        actionId: action.id,
        success: true,
        response
      };

    } catch (error) {
      // Handle retry logic
      const shouldRetry = await offlineQueueService.markActionFailed(action.id, error);
      
      return {
        actionId: action.id,
        success: false,
        error: error as Error,
        retried: shouldRetry
      };

    } finally {
      this.processingQueue.delete(action.id);
    }
  }

  /**
   * Execute the actual API request for an action
   */
  private async executeActionRequest(action: QueuedAction): Promise<any> {
    const { payload } = action;
    const { endpoint, method, data, headers = {} } = payload;

    const requestConfig: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal: this.abortController?.signal
    };

    if (method !== 'GET' && data) {
      requestConfig.body = JSON.stringify(data);
    }

    const response = await apiClient(endpoint, requestConfig);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Stop queue processing
   */
  stopProcessing(): void {
    if (this.isProcessing && this.abortController) {
      this.abortController.abort();
      this.isProcessing = false;
    }
  }

  /**
   * Pause queue processing
   */
  pauseProcessing(): void {
    this.stopProcessing();
  }

  /**
   * Resume queue processing
   */
  async resumeProcessing(options?: ProcessingOptions): Promise<void> {
    if (this.networkStatus.isOnline && !this.isProcessing) {
      await this.processQueue(options);
    }
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Check if currently processing
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Get processing queue size
   */
  getProcessingQueueSize(): number {
    return this.processingQueue.size;
  }

  /**
   * Subscribe to network status changes
   */
  subscribeToNetworkStatus(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of network status change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.networkStatus);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<{
    queueSize: number;
    isProcessing: boolean;
    processingCount: number;
    networkStatus: NetworkStatus;
    lastProcessingTime?: Date;
  }> {
    const queueSize = await offlineQueueService.getQueueSize();
    const lastProcessingTime = await offlineStorageService.getMetadata('lastProcessingTime');

    return {
      queueSize,
      isProcessing: this.isProcessing,
      processingCount: this.processingQueue.size,
      networkStatus: this.networkStatus,
      lastProcessingTime: lastProcessingTime ? new Date(lastProcessingTime) : undefined
    };
  }

  /**
   * Set processing metadata
   */
  private async setProcessingMetadata(): Promise<void> {
    await offlineStorageService.storeMetadata('lastProcessingTime', new Date().toISOString());
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility: Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Export singleton instance
export const offlineProcessorService = OfflineProcessorService.getInstance();
export default offlineProcessorService;