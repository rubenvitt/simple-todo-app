/**
 * Offline Storage Service using IndexedDB with localStorage fallback
 * Handles action queue storage for offline functionality
 */

export interface QueuedAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  entity: 'task' | 'list' | 'user' | 'listShare';
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export interface OfflineMetadata {
  lastSync: number;
  queueSize: number;
  storageVersion: string;
}

class OfflineStorageService {
  private dbName = 'TodoAppOfflineDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private isIndexedDBSupported = true;
  private storageKey = 'todoapp_offline_queue';

  constructor() {
    this.initializeDB();
  }

  /**
   * Initialize IndexedDB database
   */
  private async initializeDB(): Promise<void> {
    if (!window.indexedDB) {
      this.isIndexedDBSupported = false;
      return;
    }

    try {
      this.db = await this.openDB();
    } catch (error) {
      console.error('Failed to initialize IndexedDB, falling back to localStorage:', error);
      this.isIndexedDBSupported = false;
    }
  }

  /**
   * Open IndexedDB database with proper object stores
   */
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create action queue store
        if (!db.objectStoreNames.contains('actionQueue')) {
          const actionStore = db.createObjectStore('actionQueue', { keyPath: 'id' });
          actionStore.createIndex('timestamp', 'timestamp', { unique: false });
          actionStore.createIndex('priority', 'priority', { unique: false });
          actionStore.createIndex('entity', 'entity', { unique: false });
          actionStore.createIndex('type', 'type', { unique: false });
        }

        // Create pending operations store
        if (!db.objectStoreNames.contains('pendingOperations')) {
          const pendingStore = db.createObjectStore('pendingOperations', { keyPath: 'id' });
          pendingStore.createIndex('entityId', 'entityId', { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Store a queued action
   */
  async storeAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const queuedAction: QueuedAction = {
      ...action,
      id: this.generateActionId(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    if (this.isIndexedDBSupported && this.db) {
      return this.storeActionInIndexedDB(queuedAction);
    } else {
      return this.storeActionInLocalStorage(queuedAction);
    }
  }

  /**
   * Store action in IndexedDB
   */
  private async storeActionInIndexedDB(action: QueuedAction): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actionQueue'], 'readwrite');
      const store = transaction.objectStore('actionQueue');
      const request = store.add(action);

      request.onsuccess = () => resolve(action.id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store action in localStorage as fallback
   */
  private async storeActionInLocalStorage(action: QueuedAction): Promise<string> {
    try {
      const existingQueue = this.getLocalStorageQueue();
      existingQueue.push(action);
      localStorage.setItem(this.storageKey, JSON.stringify(existingQueue));
      return action.id;
    } catch (error) {
      throw new Error('Failed to store action in localStorage: ' + error);
    }
  }

  /**
   * Retrieve all queued actions
   */
  async getAllActions(): Promise<QueuedAction[]> {
    if (this.isIndexedDBSupported && this.db) {
      return this.getAllActionsFromIndexedDB();
    } else {
      return this.getAllActionsFromLocalStorage();
    }
  }

  /**
   * Get all actions from IndexedDB
   */
  private async getAllActionsFromIndexedDB(): Promise<QueuedAction[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actionQueue'], 'readonly');
      const store = transaction.objectStore('actionQueue');
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all actions from localStorage
   */
  private async getAllActionsFromLocalStorage(): Promise<QueuedAction[]> {
    return this.getLocalStorageQueue();
  }

  /**
   * Remove action from queue
   */
  async removeAction(actionId: string): Promise<void> {
    if (this.isIndexedDBSupported && this.db) {
      return this.removeActionFromIndexedDB(actionId);
    } else {
      return this.removeActionFromLocalStorage(actionId);
    }
  }

  /**
   * Remove action from IndexedDB
   */
  private async removeActionFromIndexedDB(actionId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actionQueue'], 'readwrite');
      const store = transaction.objectStore('actionQueue');
      const request = store.delete(actionId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove action from localStorage
   */
  private async removeActionFromLocalStorage(actionId: string): Promise<void> {
    const queue = this.getLocalStorageQueue();
    const filteredQueue = queue.filter(action => action.id !== actionId);
    localStorage.setItem(this.storageKey, JSON.stringify(filteredQueue));
  }

  /**
   * Update action retry count
   */
  async updateActionRetryCount(actionId: string, retryCount: number): Promise<void> {
    if (this.isIndexedDBSupported && this.db) {
      return this.updateActionInIndexedDB(actionId, { retryCount });
    } else {
      return this.updateActionInLocalStorage(actionId, { retryCount });
    }
  }

  /**
   * Update action in IndexedDB
   */
  private async updateActionInIndexedDB(actionId: string, updates: Partial<QueuedAction>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actionQueue'], 'readwrite');
      const store = transaction.objectStore('actionQueue');
      const getRequest = store.get(actionId);

      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (!action) {
          reject(new Error('Action not found'));
          return;
        }

        const updatedAction = { ...action, ...updates };
        const putRequest = store.put(updatedAction);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Update action in localStorage
   */
  private async updateActionInLocalStorage(actionId: string, updates: Partial<QueuedAction>): Promise<void> {
    const queue = this.getLocalStorageQueue();
    const actionIndex = queue.findIndex(action => action.id === actionId);

    if (actionIndex === -1) {
      throw new Error('Action not found');
    }

    queue[actionIndex] = { ...queue[actionIndex], ...updates };
    localStorage.setItem(this.storageKey, JSON.stringify(queue));
  }

  /**
   * Clear all actions from queue
   */
  async clearQueue(): Promise<void> {
    if (this.isIndexedDBSupported && this.db) {
      return this.clearIndexedDBQueue();
    } else {
      return this.clearLocalStorageQueue();
    }
  }

  /**
   * Clear IndexedDB queue
   */
  private async clearIndexedDBQueue(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actionQueue'], 'readwrite');
      const store = transaction.objectStore('actionQueue');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear localStorage queue
   */
  private async clearLocalStorageQueue(): Promise<void> {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    if (this.isIndexedDBSupported && this.db) {
      return this.getIndexedDBQueueSize();
    } else {
      return this.getLocalStorageQueueSize();
    }
  }

  /**
   * Get IndexedDB queue size
   */
  private async getIndexedDBQueueSize(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actionQueue'], 'readonly');
      const store = transaction.objectStore('actionQueue');
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get localStorage queue size
   */
  private getLocalStorageQueueSize(): number {
    return this.getLocalStorageQueue().length;
  }

  /**
   * Store metadata
   */
  async storeMetadata(key: string, value: any): Promise<void> {
    if (this.isIndexedDBSupported && this.db) {
      return this.storeMetadataInIndexedDB(key, value);
    } else {
      return this.storeMetadataInLocalStorage(key, value);
    }
  }

  /**
   * Store metadata in IndexedDB
   */
  private async storeMetadataInIndexedDB(key: string, value: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store metadata in localStorage
   */
  private async storeMetadataInLocalStorage(key: string, value: any): Promise<void> {
    localStorage.setItem(`${this.storageKey}_meta_${key}`, JSON.stringify(value));
  }

  /**
   * Retrieve metadata
   */
  async getMetadata(key: string): Promise<any> {
    if (this.isIndexedDBSupported && this.db) {
      return this.getMetadataFromIndexedDB(key);
    } else {
      return this.getMetadataFromLocalStorage(key);
    }
  }

  /**
   * Get metadata from IndexedDB
   */
  private async getMetadataFromIndexedDB(key: string): Promise<any> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get metadata from localStorage
   */
  private getMetadataFromLocalStorage(key: string): any {
    try {
      const value = localStorage.getItem(`${this.storageKey}_meta_${key}`);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  /**
   * Helper: Get localStorage queue
   */
  private getLocalStorageQueue(): QueuedAction[] {
    try {
      const queue = localStorage.getItem(this.storageKey);
      return queue ? JSON.parse(queue) : [];
    } catch {
      return [];
    }
  }

  /**
   * Helper: Generate unique action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if IndexedDB is supported and working
   */
  isSupported(): boolean {
    return this.isIndexedDBSupported;
  }

  /**
   * Get storage type being used
   */
  getStorageType(): 'indexeddb' | 'localstorage' {
    return this.isIndexedDBSupported ? 'indexeddb' : 'localstorage';
  }
}

// Export singleton instance
export const offlineStorageService = new OfflineStorageService();
export default offlineStorageService;