// Background sync utilities for offline actions

export interface SyncAction {
  id: string;
  type: 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK' | 'UPDATE_TASK_STATUS';
  payload: any;
  timestamp: number;
  listId?: string;
}

const SYNC_STORAGE_KEY = 'pwa-sync-queue';

class SyncManager {
  private syncQueue: SyncAction[] = [];

  constructor() {
    this.loadQueue();
    this.registerSyncListener();
  }

  // Load pending sync actions from localStorage
  private loadQueue() {
    try {
      const stored = localStorage.getItem(SYNC_STORAGE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  // Save sync queue to localStorage
  private saveQueue() {
    try {
      localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  // Add action to sync queue
  addToQueue(action: Omit<SyncAction, 'id' | 'timestamp'>) {
    const syncAction: SyncAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    this.syncQueue.push(syncAction);
    this.saveQueue();

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.processSyncQueue();
    }

    return syncAction.id;
  }

  // Process all pending sync actions
  async processSyncQueue() {
    if (this.syncQueue.length === 0) return;

    console.log(`📦 Processing ${this.syncQueue.length} sync actions...`);

    const processedActions: string[] = [];

    for (const action of [...this.syncQueue]) {
      try {
        await this.executeAction(action);
        processedActions.push(action.id);
        console.log(`✅ Synced action: ${action.type}`);
      } catch (error) {
        console.error(`❌ Failed to sync action ${action.type}:`, error);
        // Keep action in queue for retry
      }
    }

    // Remove successfully processed actions
    this.syncQueue = this.syncQueue.filter(
      action => !processedActions.includes(action.id)
    );
    this.saveQueue();

    if (processedActions.length > 0) {
      // Notify user about successful sync
      this.showSyncNotification(processedActions.length);
    }
  }

  // Execute individual sync action
  private async executeAction(action: SyncAction) {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const token = localStorage.getItem('token');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    switch (action.type) {
      case 'CREATE_TASK':
        await fetch(`${baseUrl}/api/lists/${action.listId}/tasks`, {
          method: 'POST',
          headers,
          body: JSON.stringify(action.payload),
        });
        break;

      case 'UPDATE_TASK':
        await fetch(`${baseUrl}/api/tasks/${action.payload.taskId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(action.payload.data),
        });
        break;

      case 'DELETE_TASK':
        await fetch(`${baseUrl}/api/tasks/${action.payload.taskId}`, {
          method: 'DELETE',
          headers,
        });
        break;

      case 'UPDATE_TASK_STATUS':
        await fetch(`${baseUrl}/api/tasks/${action.payload.taskId}/status`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: action.payload.status }),
        });
        break;

      default:
        throw new Error(`Unknown sync action type: ${action.type}`);
    }
  }

  // Register service worker background sync
  private registerSyncListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Check if sync is supported
        if ('sync' in registration) {
          // Register background sync
          return (registration as any).sync.register('background-sync');
        }
      }).catch(error => {
        console.error('Background sync registration failed:', error);
      });
    }

    // Listen for online events
    window.addEventListener('online', () => {
      console.log('📶 Back online, processing sync queue...');
      this.processSyncQueue();
    });
  }

  // Show sync notification to user
  private showSyncNotification(count: number) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Synchronisation abgeschlossen', {
        body: `${count} Aktion(en) erfolgreich synchronisiert`,
        icon: '/vite.svg',
        tag: 'sync-complete',
      });
    }
  }

  // Get pending sync count
  getPendingCount(): number {
    return this.syncQueue.length;
  }

  // Clear all pending syncs (for testing)
  clearQueue() {
    this.syncQueue = [];
    this.saveQueue();
  }
}

// Export singleton instance
export const syncManager = new SyncManager();

// Service Worker message handler for background sync
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'BACKGROUND_SYNC') {
      syncManager.processSyncQueue();
    }
  });
}