/**
 * Offline Action Queue Service
 * Handles serialization and queue management for offline operations
 */

import { offlineStorageService, QueuedAction } from './offline-storage.service';

export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
export type EntityType = 'task' | 'list' | 'user' | 'listShare';
export type Priority = 'low' | 'medium' | 'high';

export interface ActionPayload {
  id?: string;
  data: any;
  entityId?: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
}

export interface QueueOptions {
  priority?: Priority;
  maxRetries?: number;
  metadata?: Record<string, any>;
  deduplicationKey?: string;
}

export interface QueueStats {
  total: number;
  byEntity: Record<EntityType, number>;
  byType: Record<ActionType, number>;
  byPriority: Record<Priority, number>;
  oldestAction?: Date;
  newestAction?: Date;
}

class OfflineQueueService {
  private static instance: OfflineQueueService;
  private processingQueue = false;
  private deduplicationMap = new Map<string, string>(); // deduplicationKey -> actionId

  private constructor() {
    this.initializeDeduplicationMap();
  }

  static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  /**
   * Add action to offline queue
   */
  async enqueueAction(
    type: ActionType,
    entity: EntityType,
    payload: ActionPayload,
    options: QueueOptions = {}
  ): Promise<string> {
    const {
      priority = 'medium',
      maxRetries = 3,
      metadata = {},
      deduplicationKey
    } = options;

    // Check for duplicate actions
    if (deduplicationKey && this.deduplicationMap.has(deduplicationKey)) {
      const existingActionId = this.deduplicationMap.get(deduplicationKey)!;
      await this.mergeWithExistingAction(existingActionId, payload, metadata);
      return existingActionId;
    }

    // Serialize and validate payload
    const serializedPayload = this.serializePayload(payload);
    this.validateAction(type, entity, serializedPayload);

    // Create action
    const actionId = await offlineStorageService.storeAction({
      type,
      entity,
      payload: serializedPayload,
      priority,
      maxRetries,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        deduplicationKey
      }
    });

    // Update deduplication map
    if (deduplicationKey) {
      this.deduplicationMap.set(deduplicationKey, actionId);
    }

    return actionId;
  }

  /**
   * Get next action to process (FIFO with priority)
   */
  async dequeueAction(): Promise<QueuedAction | null> {
    const actions = await offlineStorageService.getAllActions();
    
    if (actions.length === 0) {
      return null;
    }

    // Sort by priority (high -> medium -> low) then by timestamp (oldest first)
    const sortedActions = actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      return a.timestamp - b.timestamp;
    });

    return sortedActions[0];
  }

  /**
   * Peek at next action without removing it
   */
  async peekNextAction(): Promise<QueuedAction | null> {
    return this.dequeueAction();
  }

  /**
   * Remove action from queue
   */
  async removeAction(actionId: string): Promise<void> {
    await offlineStorageService.removeAction(actionId);
    
    // Clean up deduplication map
    for (const [key, id] of this.deduplicationMap.entries()) {
      if (id === actionId) {
        this.deduplicationMap.delete(key);
        break;
      }
    }
  }

  /**
   * Mark action as failed and increment retry count
   */
  async markActionFailed(actionId: string, error?: any): Promise<boolean> {
    const actions = await offlineStorageService.getAllActions();
    const action = actions.find(a => a.id === actionId);
    
    if (!action) {
      return false;
    }

    const newRetryCount = action.retryCount + 1;
    
    if (newRetryCount >= action.maxRetries) {
      // Move to dead letter queue or remove permanently
      await this.moveToDeadLetterQueue(action, error);
      await this.removeAction(actionId);
      return false;
    }

    // Update retry count
    await offlineStorageService.updateActionRetryCount(actionId, newRetryCount);
    return true;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    const actions = await offlineStorageService.getAllActions();
    
    const stats: QueueStats = {
      total: actions.length,
      byEntity: { task: 0, list: 0, user: 0, listShare: 0 },
      byType: { CREATE: 0, UPDATE: 0, DELETE: 0, READ: 0 },
      byPriority: { low: 0, medium: 0, high: 0 }
    };

    if (actions.length === 0) {
      return stats;
    }

    // Calculate statistics
    actions.forEach(action => {
      stats.byEntity[action.entity]++;
      stats.byType[action.type]++;
      stats.byPriority[action.priority]++;
    });

    // Find oldest and newest actions
    const timestamps = actions.map(a => a.timestamp);
    stats.oldestAction = new Date(Math.min(...timestamps));
    stats.newestAction = new Date(Math.max(...timestamps));

    return stats;
  }

  /**
   * Clear entire queue
   */
  async clearQueue(): Promise<void> {
    await offlineStorageService.clearQueue();
    this.deduplicationMap.clear();
  }

  /**
   * Get all actions in queue
   */
  async getAllActions(): Promise<QueuedAction[]> {
    return offlineStorageService.getAllActions();
  }

  /**
   * Get actions by entity type
   */
  async getActionsByEntity(entity: EntityType): Promise<QueuedAction[]> {
    const actions = await offlineStorageService.getAllActions();
    return actions.filter(action => action.entity === entity);
  }

  /**
   * Get actions by type
   */
  async getActionsByType(type: ActionType): Promise<QueuedAction[]> {
    const actions = await offlineStorageService.getAllActions();
    return actions.filter(action => action.type === type);
  }

  /**
   * Check if queue is empty
   */
  async isQueueEmpty(): Promise<boolean> {
    const size = await offlineStorageService.getQueueSize();
    return size === 0;
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    return offlineStorageService.getQueueSize();
  }

  /**
   * Serialize action payload
   */
  private serializePayload(payload: ActionPayload): ActionPayload {
    return {
      ...payload,
      data: this.deepClone(payload.data),
      timestamp: Date.now()
    };
  }

  /**
   * Validate action before queueing
   */
  private validateAction(type: ActionType, entity: EntityType, payload: ActionPayload): void {
    if (!payload.endpoint) {
      throw new Error('Action payload must include endpoint');
    }

    if (!payload.method) {
      throw new Error('Action payload must include HTTP method');
    }

    // Entity-specific validations
    switch (entity) {
      case 'task':
        this.validateTaskAction(type, payload);
        break;
      case 'list':
        this.validateListAction(type, payload);
        break;
      case 'user':
        this.validateUserAction(type, payload);
        break;
      case 'listShare':
        this.validateListShareAction(type, payload);
        break;
    }
  }

  /**
   * Validate task-specific actions
   */
  private validateTaskAction(type: ActionType, payload: ActionPayload): void {
    if (type === 'CREATE' && !payload.data.title) {
      throw new Error('Task creation requires title');
    }
    
    if ((type === 'UPDATE' || type === 'DELETE') && !payload.entityId) {
      throw new Error('Task update/delete requires entityId');
    }
  }

  /**
   * Validate list-specific actions
   */
  private validateListAction(type: ActionType, payload: ActionPayload): void {
    if (type === 'CREATE' && !payload.data.name) {
      throw new Error('List creation requires name');
    }
    
    if ((type === 'UPDATE' || type === 'DELETE') && !payload.entityId) {
      throw new Error('List update/delete requires entityId');
    }
  }

  /**
   * Validate user-specific actions
   */
  private validateUserAction(type: ActionType, payload: ActionPayload): void {
    if (type === 'UPDATE' && !payload.entityId) {
      throw new Error('User update requires entityId');
    }
  }

  /**
   * Validate list share-specific actions
   */
  private validateListShareAction(type: ActionType, payload: ActionPayload): void {
    if (type === 'CREATE' && (!payload.data.listId || !payload.data.userId)) {
      throw new Error('List share creation requires listId and userId');
    }
  }

  /**
   * Merge new payload with existing action
   */
  private async mergeWithExistingAction(
    actionId: string,
    newPayload: ActionPayload,
    newMetadata: Record<string, any>
  ): Promise<void> {
    const actions = await offlineStorageService.getAllActions();
    const existingAction = actions.find(a => a.id === actionId);
    
    if (!existingAction) {
      return;
    }

    // Merge data objects
    const mergedData = {
      ...existingAction.payload.data,
      ...newPayload.data
    };

    // Update the action
    const updatedAction: Partial<QueuedAction> = {
      payload: {
        ...existingAction.payload,
        data: mergedData
      },
      metadata: {
        ...existingAction.metadata,
        ...newMetadata,
        lastMerged: new Date().toISOString()
      },
      timestamp: Date.now() // Update timestamp for latest merge
    };

    // Note: This would require updating the storage service to support partial updates
    // For now, we'll remove and re-add the action
    await this.removeAction(actionId);
    await offlineStorageService.storeAction({
      ...existingAction,
      ...updatedAction
    } as Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>);
  }

  /**
   * Move failed action to dead letter queue
   */
  private async moveToDeadLetterQueue(action: QueuedAction, error?: any): Promise<void> {
    const deadLetterAction = {
      ...action,
      metadata: {
        ...action.metadata,
        failedAt: new Date().toISOString(),
        error: error?.message || 'Unknown error',
        finalRetryCount: action.retryCount
      }
    };

    // Store in metadata as dead letter queue
    const deadLetterQueue = await offlineStorageService.getMetadata('deadLetterQueue') || [];
    deadLetterQueue.push(deadLetterAction);
    await offlineStorageService.storeMetadata('deadLetterQueue', deadLetterQueue);
  }

  /**
   * Initialize deduplication map from existing actions
   */
  private async initializeDeduplicationMap(): Promise<void> {
    try {
      const actions = await offlineStorageService.getAllActions();
      actions.forEach(action => {
        const deduplicationKey = action.metadata?.deduplicationKey;
        if (deduplicationKey) {
          this.deduplicationMap.set(deduplicationKey, action.id);
        }
      });
    } catch (error) {
      // Ignore errors during initialization
    }
  }

  /**
   * Deep clone object
   */
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }
    
    const clonedObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = this.deepClone(obj[key]);
      }
    }
    
    return clonedObj;
  }

  /**
   * Generate deduplication key for common operations
   */
  static generateDeduplicationKey(entity: EntityType, type: ActionType, entityId?: string): string {
    if (type === 'CREATE') {
      return `${entity}_create_${Date.now()}`;
    }
    return `${entity}_${type}_${entityId}`;
  }
}

// Export singleton instance
export const offlineQueueService = OfflineQueueService.getInstance();
export default offlineQueueService;