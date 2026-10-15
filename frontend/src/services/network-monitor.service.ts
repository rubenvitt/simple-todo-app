/**
 * Network Monitor Service
 * 
 * Provides real-time network condition monitoring using the Network Information API
 * with intelligent fallback detection for unsupported browsers.
 */

// Network connection types and quality levels
export type NetworkType = 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';
export type NetworkQuality = 'poor' | 'moderate' | 'good' | 'excellent';

export interface NetworkInfo {
  type: NetworkType;
  quality: NetworkQuality;
  effectiveType: string;
  downlink: number; // Mbps
  rtt: number; // milliseconds
  saveData: boolean;
  isOnline: boolean;
  timestamp: number;
}

export interface NetworkCapabilities {
  hasNetworkAPI: boolean;
  hasConnectionAPI: boolean;
  hasPerformanceAPI: boolean;
  hasNavigatorOnline: boolean;
}

// Event types for network changes
export type NetworkEventType = 'change' | 'online' | 'offline' | 'quality-change';

export interface NetworkEvent {
  type: NetworkEventType;
  networkInfo: NetworkInfo;
  previousInfo?: NetworkInfo;
}

export type NetworkEventCallback = (event: NetworkEvent) => void;

/**
 * Core Network Monitor Class
 */
export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private listeners: Map<string, NetworkEventCallback> = new Map();
  private currentInfo: NetworkInfo;
  private capabilities: NetworkCapabilities;
  private performanceBaseline: number = 0;
  private isMonitoring: boolean = false;
  private updateInterval: number | null = null;

  private constructor() {
    this.capabilities = this.detectCapabilities();
    this.currentInfo = this.getCurrentNetworkInfo();
    this.performanceBaseline = this.measureInitialPerformance();
  }

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  /**
   * Detect browser network monitoring capabilities
   */
  private detectCapabilities(): NetworkCapabilities {
    return {
      hasNetworkAPI: 'connection' in navigator,
      hasConnectionAPI: 'connection' in navigator && 'effectiveType' in (navigator as any).connection,
      hasPerformanceAPI: 'performance' in window && 'timing' in performance,
      hasNavigatorOnline: 'onLine' in navigator
    };
  }

  /**
   * Get current network information
   */
  private getCurrentNetworkInfo(): NetworkInfo {
    const now = Date.now();
    
    // Try to get info from Network Information API
    if (this.capabilities.hasConnectionAPI) {
      const connection = (navigator as any).connection;
      
      return {
        type: this.normalizeConnectionType(connection.effectiveType),
        quality: this.calculateQuality(connection),
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
        isOnline: navigator.onLine,
        timestamp: now
      };
    }

    // Fallback to performance-based detection
    const fallbackInfo = this.detectNetworkFromPerformance();
    
    return {
      type: fallbackInfo.type,
      quality: fallbackInfo.quality,
      effectiveType: fallbackInfo.type,
      downlink: fallbackInfo.estimatedDownlink,
      rtt: fallbackInfo.estimatedRtt,
      saveData: false, // Can't detect without API
      isOnline: this.capabilities.hasNavigatorOnline ? navigator.onLine : true,
      timestamp: now
    };
  }

  /**
   * Normalize connection type from various sources
   */
  private normalizeConnectionType(effectiveType: string): NetworkType {
    switch (effectiveType?.toLowerCase()) {
      case 'slow-2g':
        return 'slow-2g';
      case '2g':
        return '2g';
      case '3g':
        return '3g';
      case '4g':
        return '4g';
      case 'wifi':
      case 'ethernet':
        return 'wifi';
      default:
        return 'unknown';
    }
  }

  /**
   * Calculate network quality based on connection metrics
   */
  private calculateQuality(connection: any): NetworkQuality {
    const downlink = connection.downlink || 0;
    const rtt = connection.rtt || 0;
    const effectiveType = connection.effectiveType;

    // Quality based on effective type
    if (effectiveType === 'slow-2g') return 'poor';
    if (effectiveType === '2g') return 'poor';
    if (effectiveType === '3g') return 'moderate';
    if (effectiveType === '4g') return 'good';

    // Quality based on downlink speed
    if (downlink >= 10) return 'excellent';
    if (downlink >= 5) return 'good';
    if (downlink >= 1.5) return 'moderate';
    return 'poor';
  }

  /**
   * Fallback network detection using performance metrics
   */
  private detectNetworkFromPerformance(): {
    type: NetworkType;
    quality: NetworkQuality;
    estimatedDownlink: number;
    estimatedRtt: number;
  } {
    if (!this.capabilities.hasPerformanceAPI) {
      return {
        type: 'unknown',
        quality: 'moderate',
        estimatedDownlink: 1,
        estimatedRtt: 100
      };
    }

    const timing = performance.timing;
    const navigationStart = timing.navigationStart;
    const responseEnd = timing.responseEnd;
    const totalTime = responseEnd - navigationStart;

    // Estimate RTT from navigation timing
    const estimatedRtt = Math.max(50, Math.min(2000, totalTime / 10));

    // Estimate connection type based on total load time
    let type: NetworkType = 'unknown';
    let quality: NetworkQuality = 'moderate';
    let estimatedDownlink = 1;

    if (totalTime < 1000) {
      type = 'wifi';
      quality = 'excellent';
      estimatedDownlink = 10;
    } else if (totalTime < 3000) {
      type = '4g';
      quality = 'good';
      estimatedDownlink = 5;
    } else if (totalTime < 8000) {
      type = '3g';
      quality = 'moderate';
      estimatedDownlink = 1.5;
    } else if (totalTime < 15000) {
      type = '2g';
      quality = 'poor';
      estimatedDownlink = 0.5;
    } else {
      type = 'slow-2g';
      quality = 'poor';
      estimatedDownlink = 0.2;
    }

    return { type, quality, estimatedDownlink, estimatedRtt };
  }

  /**
   * Measure initial performance baseline
   */
  private measureInitialPerformance(): number {
    if (!this.capabilities.hasPerformanceAPI) return 0;

    const timing = performance.timing;
    return timing.responseEnd - timing.navigationStart;
  }

  /**
   * Start monitoring network changes
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Listen to Connection API changes
    if (this.capabilities.hasConnectionAPI) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', this.handleConnectionChange.bind(this));
    }

    // Listen to online/offline events
    if (this.capabilities.hasNavigatorOnline) {
      window.addEventListener('online', this.handleOnlineChange.bind(this));
      window.addEventListener('offline', this.handleOfflineChange.bind(this));
    }

    // Periodic updates for browsers without Connection API
    if (!this.capabilities.hasConnectionAPI) {
      this.updateInterval = window.setInterval(() => {
        this.performPeriodicUpdate();
      }, 30000); // Check every 30 seconds
    }

    console.log('🌐 Network monitoring started');
  }

  /**
   * Stop monitoring network changes
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    // Remove Connection API listeners
    if (this.capabilities.hasConnectionAPI) {
      const connection = (navigator as any).connection;
      connection.removeEventListener('change', this.handleConnectionChange.bind(this));
    }

    // Remove online/offline listeners
    if (this.capabilities.hasNavigatorOnline) {
      window.removeEventListener('online', this.handleOnlineChange.bind(this));
      window.removeEventListener('offline', this.handleOfflineChange.bind(this));
    }

    // Clear periodic updates
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    console.log('🌐 Network monitoring stopped');
  }

  /**
   * Handle connection changes from Network Information API
   */
  private handleConnectionChange(): void {
    const previousInfo = { ...this.currentInfo };
    this.currentInfo = this.getCurrentNetworkInfo();

    // Check if quality changed significantly
    const qualityChanged = previousInfo.quality !== this.currentInfo.quality;

    this.emitEvent({
      type: qualityChanged ? 'quality-change' : 'change',
      networkInfo: this.currentInfo,
      previousInfo
    });
  }

  /**
   * Handle online event
   */
  private handleOnlineChange(): void {
    const previousInfo = { ...this.currentInfo };
    this.currentInfo = this.getCurrentNetworkInfo();

    this.emitEvent({
      type: 'online',
      networkInfo: this.currentInfo,
      previousInfo
    });
  }

  /**
   * Handle offline event
   */
  private handleOfflineChange(): void {
    const previousInfo = { ...this.currentInfo };
    this.currentInfo = {
      ...this.currentInfo,
      isOnline: false,
      timestamp: Date.now()
    };

    this.emitEvent({
      type: 'offline',
      networkInfo: this.currentInfo,
      previousInfo
    });
  }

  /**
   * Perform periodic network quality check
   */
  private performPeriodicUpdate(): void {
    const previousInfo = { ...this.currentInfo };
    const newInfo = this.getCurrentNetworkInfo();

    // Only emit if significant change detected
    if (this.hasSignificantChange(previousInfo, newInfo)) {
      this.currentInfo = newInfo;
      this.emitEvent({
        type: 'change',
        networkInfo: this.currentInfo,
        previousInfo
      });
    }
  }

  /**
   * Check if network change is significant enough to notify
   */
  private hasSignificantChange(prev: NetworkInfo, current: NetworkInfo): boolean {
    return (
      prev.quality !== current.quality ||
      prev.isOnline !== current.isOnline ||
      Math.abs(prev.downlink - current.downlink) > 1 ||
      Math.abs(prev.rtt - current.rtt) > 100
    );
  }

  /**
   * Emit network event to all listeners
   */
  private emitEvent(event: NetworkEvent): void {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Network event listener error:', error);
      }
    });
  }

  /**
   * Subscribe to network events
   */
  subscribe(id: string, callback: NetworkEventCallback): void {
    this.listeners.set(id, callback);
  }

  /**
   * Unsubscribe from network events
   */
  unsubscribe(id: string): void {
    this.listeners.delete(id);
  }

  /**
   * Get current network information
   */
  getNetworkInfo(): NetworkInfo {
    return { ...this.currentInfo };
  }

  /**
   * Get network capabilities
   */
  getCapabilities(): NetworkCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Test network speed with a small request
   */
  async testNetworkSpeed(): Promise<{
    downloadSpeed: number; // Mbps
    latency: number; // ms
    timestamp: number;
  }> {
    const testStart = performance.now();
    
    try {
      // Use a small image or endpoint for speed test
      const testUrl = '/vite.svg'; // Small file available in public folder
      const response = await fetch(testUrl + '?t=' + Date.now(), {
        cache: 'no-cache'
      });
      
      const testEnd = performance.now();
      const latency = testEnd - testStart;
      
      if (response.ok) {
        const blob = await response.blob();
        const sizeBytes = blob.size;
        const sizeKb = sizeBytes / 1024;
        const timeSec = latency / 1000;
        const speedKbps = sizeKb / timeSec;
        const speedMbps = speedKbps / 1024;

        return {
          downloadSpeed: Math.max(0.1, speedMbps),
          latency: Math.round(latency),
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.warn('Network speed test failed:', error);
    }

    // Return fallback values
    return {
      downloadSpeed: this.currentInfo.downlink || 1,
      latency: this.currentInfo.rtt || 100,
      timestamp: Date.now()
    };
  }

  /**
   * Get adaptive configuration based on current network
   */
  getAdaptiveConfig(): {
    maxConcurrentRequests: number;
    requestTimeout: number;
    retryAttempts: number;
    retryDelay: number;
    prefetchEnabled: boolean;
    compressionLevel: number;
    imagequality: number;
  } {
    const { quality, saveData } = this.currentInfo;

    switch (quality) {
      case 'excellent':
        return {
          maxConcurrentRequests: 8,
          requestTimeout: 10000,
          retryAttempts: 3,
          retryDelay: 1000,
          prefetchEnabled: true,
          compressionLevel: 1, // Low compression
          imagequality: 95
        };

      case 'good':
        return {
          maxConcurrentRequests: 6,
          requestTimeout: 15000,
          retryAttempts: 3,
          retryDelay: 1500,
          prefetchEnabled: true,
          compressionLevel: 3,
          imagequality: 85
        };

      case 'moderate':
        return {
          maxConcurrentRequests: 4,
          requestTimeout: 20000,
          retryAttempts: 2,
          retryDelay: 2000,
          prefetchEnabled: false,
          compressionLevel: 5,
          imagequality: 75
        };

      case 'poor':
      default:
        return {
          maxConcurrentRequests: 2,
          requestTimeout: 30000,
          retryAttempts: 1,
          retryDelay: 3000,
          prefetchEnabled: false,
          compressionLevel: 8, // High compression
          imagequality: saveData ? 50 : 65
        };
    }
  }

  /**
   * Check if network is suitable for heavy operations
   */
  isSuitableForHeavyOperations(): boolean {
    const { quality, isOnline, saveData } = this.currentInfo;
    return isOnline && !saveData && (quality === 'good' || quality === 'excellent');
  }

  /**
   * Get user-friendly network status description
   */
  getNetworkStatusDescription(): string {
    const { type, quality, isOnline, saveData } = this.currentInfo;

    if (!isOnline) return 'Offline';
    if (saveData) return 'Data Saver Mode';

    switch (quality) {
      case 'excellent':
        return `Excellent connection (${type})`;
      case 'good':
        return `Good connection (${type})`;
      case 'moderate':
        return `Moderate connection (${type})`;
      case 'poor':
        return `Slow connection (${type})`;
      default:
        return isOnline ? 'Connected' : 'Offline';
    }
  }
}

// Convenience functions and exports
export const networkMonitor = NetworkMonitor.getInstance();

// Helper hook for React components (will be implemented separately)
export const createNetworkHook = () => {
  return {
    getNetworkInfo: () => networkMonitor.getNetworkInfo(),
    subscribe: (callback: NetworkEventCallback) => {
      const id = Math.random().toString(36);
      networkMonitor.subscribe(id, callback);
      return () => networkMonitor.unsubscribe(id);
    },
    startMonitoring: () => networkMonitor.startMonitoring(),
    stopMonitoring: () => networkMonitor.stopMonitoring()
  };
};

export default networkMonitor;