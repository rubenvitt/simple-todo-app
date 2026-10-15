/**
 * Conflict Resolution Service
 * Handles conflicts during offline sync and implements retry logic
 */

import { offlineStorageService, QueuedAction } from './offline-storage.service';

export type ConflictResolutionStrategy = 'last-write-wins' | 'merge' | 'user-prompted';

export interface ConflictData {
  id: string;
  entity: string;
  localVersion: any;
  serverVersion: any;
  localTimestamp: number;
  serverTimestamp: number;
  conflictFields: string[];
}

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  resolvedData: any;
  timestamp: number;
  userChoices?: Record<string, 'local' | 'server' | 'custom'>;
  customData?: any;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffMultiplier: number;
  jitter: boolean;
}

class ConflictResolutionService {
  private static instance: ConflictResolutionService;
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 5,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    jitter: true
  };

  private conflictResolvers: Map<string, (conflict: ConflictData) => Promise<ConflictResolution>> = new Map();
  private pendingConflicts: Map<string, ConflictData> = new Map();

  private constructor() {
    this.initializeDefaultResolvers();
  }

  static getInstance(): ConflictResolutionService {
    if (!ConflictResolutionService.instance) {
      ConflictResolutionService.instance = new ConflictResolutionService();
    }
    return ConflictResolutionService.instance;
  }

  /**
   * Initialize default conflict resolvers
   */
  private initializeDefaultResolvers(): void {
    // Task conflicts
    this.conflictResolvers.set('task', this.resolveTaskConflict.bind(this));
    
    // List conflicts
    this.conflictResolvers.set('list', this.resolveListConflict.bind(this));
    
    // User conflicts
    this.conflictResolvers.set('user', this.resolveUserConflict.bind(this));
    
    // List share conflicts
    this.conflictResolvers.set('listShare', this.resolveListShareConflict.bind(this));
  }

  /**
   * Detect conflict between local and server data
   */
  detectConflict(
    entity: string,
    localData: any,
    serverData: any,
    localTimestamp: number,
    serverTimestamp: number
  ): ConflictData | null {
    if (!localData || !serverData) {
      return null;
    }

    const conflictFields = this.findConflictingFields(localData, serverData);
    
    if (conflictFields.length === 0) {
      return null;
    }

    return {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entity,
      localVersion: localData,
      serverVersion: serverData,
      localTimestamp,
      serverTimestamp,
      conflictFields
    };
  }

  /**
   * Resolve conflict using appropriate strategy
   */
  async resolveConflict(
    conflict: ConflictData,
    strategy: ConflictResolutionStrategy = 'last-write-wins'
  ): Promise<ConflictResolution> {
    // Store conflict for potential user resolution
    this.pendingConflicts.set(conflict.id, conflict);

    try {
      switch (strategy) {
        case 'last-write-wins':
          return this.resolveLastWriteWins(conflict);
        
        case 'merge':
          return this.resolveMerge(conflict);
        
        case 'user-prompted':
          return this.resolveUserPrompted(conflict);
        
        default:
          throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
      }
    } finally {
      // Clean up after resolution
      this.pendingConflicts.delete(conflict.id);
    }
  }

  /**
   * Last-write-wins strategy
   */
  private async resolveLastWriteWins(conflict: ConflictData): Promise<ConflictResolution> {
    const useLocal = conflict.localTimestamp > conflict.serverTimestamp;
    
    return {
      strategy: 'last-write-wins',
      resolvedData: useLocal ? conflict.localVersion : conflict.serverVersion,
      timestamp: Date.now()
    };
  }

  /**
   * Merge strategy - attempt intelligent merge
   */
  private async resolveMerge(conflict: ConflictData): Promise<ConflictResolution> {
    const resolver = this.conflictResolvers.get(conflict.entity);
    
    if (resolver) {
      return resolver(conflict);
    }
    
    // Fallback to simple merge
    const mergedData = this.simpleMerge(conflict.localVersion, conflict.serverVersion);
    
    return {
      strategy: 'merge',
      resolvedData: mergedData,
      timestamp: Date.now()
    };
  }

  /**
   * User-prompted strategy
   */
  private async resolveUserPrompted(conflict: ConflictData): Promise<ConflictResolution> {
    // Store conflict for user interface to pick up
    await offlineStorageService.storeMetadata(`pending_conflict_${conflict.id}`, conflict);
    
    // Return a placeholder resolution that indicates user input needed
    return {
      strategy: 'user-prompted',
      resolvedData: null,
      timestamp: Date.now()
    };
  }

  /**
   * Task-specific conflict resolution
   */
  private async resolveTaskConflict(conflict: ConflictData): Promise<ConflictResolution> {
    const local = conflict.localVersion;
    const server = conflict.serverVersion;
    
    // Smart merge for tasks
    const resolved = {
      ...server, // Start with server data
      
      // Prefer local changes for user-editable fields
      title: this.resolveField('title', local, server, conflict),
      description: this.resolveField('description', local, server, conflict),
      priority: this.resolveField('priority', local, server, conflict),
      
      // Prefer server for system fields
      status: server.status || local.status,
      order: server.order || local.order,
      assigneeId: server.assigneeId || local.assigneeId,
      
      // Merge timestamps
      createdAt: server.createdAt || local.createdAt,
      updatedAt: Math.max(
        new Date(server.updatedAt || 0).getTime(),
        new Date(local.updatedAt || 0).getTime()
      ),
      
      // Handle due date conflicts
      dueDate: this.resolveDateField('dueDate', local, server, conflict)
    };
    
    return {
      strategy: 'merge',
      resolvedData: resolved,
      timestamp: Date.now()
    };
  }

  /**
   * List-specific conflict resolution
   */
  private async resolveListConflict(conflict: ConflictData): Promise<ConflictResolution> {
    const local = conflict.localVersion;
    const server = conflict.serverVersion;
    
    const resolved = {
      ...server,
      name: this.resolveField('name', local, server, conflict),
      description: this.resolveField('description', local, server, conflict),
      color: this.resolveField('color', local, server, conflict),
      updatedAt: Math.max(
        new Date(server.updatedAt || 0).getTime(),
        new Date(local.updatedAt || 0).getTime()
      )
    };
    
    return {
      strategy: 'merge',
      resolvedData: resolved,
      timestamp: Date.now()
    };
  }

  /**
   * User-specific conflict resolution
   */
  private async resolveUserConflict(conflict: ConflictData): Promise<ConflictResolution> {
    const local = conflict.localVersion;
    const server = conflict.serverVersion;
    
    // For user data, prefer local changes for profile fields
    const resolved = {
      ...server,
      name: local.name || server.name,
      email: server.email, // Never override server email
      avatar: local.avatar || server.avatar,
      preferences: {
        ...server.preferences,
        ...local.preferences // Merge preferences
      }
    };
    
    return {
      strategy: 'merge',
      resolvedData: resolved,
      timestamp: Date.now()
    };
  }

  /**
   * List share-specific conflict resolution
   */
  private async resolveListShareConflict(conflict: ConflictData): Promise<ConflictResolution> {
    const server = conflict.serverVersion;
    
    // For list shares, server always wins (security)
    return {
      strategy: 'last-write-wins',
      resolvedData: server,
      timestamp: Date.now()
    };
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt: number, config: Partial<RetryConfig> = {}): number {
    const finalConfig = { ...this.defaultRetryConfig, ...config };
    
    let delay = finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, finalConfig.maxDelay);
    
    if (finalConfig.jitter) {
      // Add random jitter (±25%)
      const jitterRange = delay * 0.25;
      delay = delay + (Math.random() * 2 - 1) * jitterRange;
    }
    
    return Math.max(delay, finalConfig.baseDelay);
  }

  /**
   * Check if action should be retried
   */
  shouldRetry(action: QueuedAction, error: any, config: Partial<RetryConfig> = {}): boolean {
    const finalConfig = { ...this.defaultRetryConfig, ...config };
    
    // Don't retry if max attempts reached
    if (action.retryCount >= finalConfig.maxRetries) {
      return false;
    }
    
    // Don't retry certain error types
    if (this.isNonRetryableError(error)) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: any): boolean {
    if (!error) return false;
    
    const status = error.status || error.code;
    
    // Don't retry 4xx errors (except 408, 429)
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      return true;
    }
    
    // Don't retry authentication errors
    if (status === 401 || status === 403) {
      return true;
    }
    
    // Don't retry validation errors
    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      return true;
    }
    
    return false;
  }

  /**
   * Get all pending conflicts for user resolution
   */
  async getPendingConflicts(): Promise<ConflictData[]> {
    const conflicts: ConflictData[] = [];
    
    // This would need to be implemented to fetch from storage
    // For now, return in-memory pending conflicts
    return Array.from(this.pendingConflicts.values());
  }

  /**
   * Submit user resolution for a conflict
   */
  async submitUserResolution(
    conflictId: string,
    userChoices: Record<string, 'local' | 'server' | 'custom'>,
    customData?: any
  ): Promise<ConflictResolution> {
    const conflict = this.pendingConflicts.get(conflictId);
    if (!conflict) {
      throw new Error('Conflict not found');
    }
    
    const resolvedData = this.applyUserChoices(conflict, userChoices, customData);
    
    const resolution: ConflictResolution = {
      strategy: 'user-prompted',
      resolvedData,
      timestamp: Date.now(),
      userChoices,
      customData
    };
    
    // Clean up
    this.pendingConflicts.delete(conflictId);
    await offlineStorageService.storeMetadata(`pending_conflict_${conflictId}`, null);
    
    return resolution;
  }

  /**
   * Helper: Find conflicting fields between two objects
   */
  private findConflictingFields(local: any, server: any): string[] {
    const conflicts: string[] = [];
    const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);
    
    for (const key of allKeys) {
      if (local[key] !== server[key] && 
          local[key] !== undefined && 
          server[key] !== undefined) {
        conflicts.push(key);
      }
    }
    
    return conflicts;
  }

  /**
   * Helper: Resolve individual field
   */
  private resolveField(field: string, local: any, server: any, conflict: ConflictData): any {
    if (conflict.conflictFields.includes(field)) {
      // If there's a conflict, prefer newer timestamp
      return conflict.localTimestamp > conflict.serverTimestamp ? local[field] : server[field];
    }
    
    return local[field] !== undefined ? local[field] : server[field];
  }

  /**
   * Helper: Resolve date field
   */
  private resolveDateField(field: string, local: any, server: any, conflict: ConflictData): any {
    const localDate = local[field] ? new Date(local[field]) : null;
    const serverDate = server[field] ? new Date(server[field]) : null;
    
    if (!localDate && !serverDate) return null;
    if (!localDate) return server[field];
    if (!serverDate) return local[field];
    
    // Return the later date
    return localDate > serverDate ? local[field] : server[field];
  }

  /**
   * Helper: Simple merge of two objects
   */
  private simpleMerge(local: any, server: any): any {
    return {
      ...server,
      ...local,
      // Special handling for nested objects
      ...(server.metadata && local.metadata ? {
        metadata: { ...server.metadata, ...local.metadata }
      } : {})
    };
  }

  /**
   * Helper: Apply user choices to resolve conflict
   */
  private applyUserChoices(
    conflict: ConflictData,
    userChoices: Record<string, 'local' | 'server' | 'custom'>,
    customData?: any
  ): any {
    const resolved = { ...conflict.serverVersion };
    
    for (const [field, choice] of Object.entries(userChoices)) {
      switch (choice) {
        case 'local':
          resolved[field] = conflict.localVersion[field];
          break;
        case 'server':
          resolved[field] = conflict.serverVersion[field];
          break;
        case 'custom':
          if (customData && customData[field] !== undefined) {
            resolved[field] = customData[field];
          }
          break;
      }
    }
    
    return resolved;
  }
}

// Export singleton instance
export const conflictResolutionService = ConflictResolutionService.getInstance();
export default conflictResolutionService;