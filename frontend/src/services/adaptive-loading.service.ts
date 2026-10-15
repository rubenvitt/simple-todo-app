/**
 * Adaptive Loading Strategy Service
 * 
 * Implements intelligent loading strategies that adapt to network conditions,
 * device capabilities, and user preferences for optimal performance.
 */

import { networkMonitor, NetworkInfo, NetworkQuality } from './network-monitor.service';

// Strategy configuration interfaces
export interface LoadingStrategy {
  id: string;
  name: string;
  description: string;
  networkRequirements: NetworkQuality[];
  deviceRequirements?: {
    minMemory?: number; // GB
    minConcurrency?: number; // concurrent connections
    preferredConnection?: string[];
  };
  config: StrategyConfig;
}

export interface StrategyConfig {
  // Request configuration
  maxConcurrentRequests: number;
  requestTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  
  // Content optimization
  imageQuality: number; // 1-100
  compressionLevel: number; // 1-10
  enableImageOptimization: boolean;
  preferredImageFormat: 'auto' | 'webp' | 'jpeg' | 'png';
  
  // Prefetching and caching
  prefetchEnabled: boolean;
  prefetchDistance: number; // pages/items ahead
  cacheStrategy: 'aggressive' | 'moderate' | 'minimal' | 'disabled';
  cacheTTL: number; // seconds
  
  // Loading behavior
  enableProgressiveLoading: boolean;
  chunkSize: number; // items per chunk
  enableLazyLoading: boolean;
  lazyLoadThreshold: number; // pixels from viewport
  
  // User experience
  showSkeletonScreens: boolean;
  showProgressIndicators: boolean;
  enableOptimisticUpdates: boolean;
  debounceDelay: number; // milliseconds
}

export interface AdaptiveLoadingOptions {
  forceStrategy?: string;
  customConfig?: Partial<StrategyConfig>;
  respectDataSaver?: boolean;
  respectReducedMotion?: boolean;
  enableAnalytics?: boolean;
}

export interface LoadingMetrics {
  strategyUsed: string;
  loadTime: number;
  bytesTransferred: number;
  cacheHitRatio: number;
  userSatisfactionScore?: number;
  timestamp: number;
}

/**
 * Pre-defined loading strategies for different network conditions
 */
const LOADING_STRATEGIES: LoadingStrategy[] = [
  {
    id: 'turbo',
    name: 'Turbo Mode',
    description: 'Maximum performance for excellent connections',
    networkRequirements: ['excellent'],
    deviceRequirements: {
      minMemory: 4,
      minConcurrency: 6,
      preferredConnection: ['wifi', 'ethernet', '5g']
    },
    config: {
      maxConcurrentRequests: 10,
      requestTimeout: 8000,
      retryAttempts: 3,
      retryDelay: 500,
      
      imageQuality: 95,
      compressionLevel: 1,
      enableImageOptimization: true,
      preferredImageFormat: 'auto',
      
      prefetchEnabled: true,
      prefetchDistance: 3,
      cacheStrategy: 'aggressive',
      cacheTTL: 3600,
      
      enableProgressiveLoading: true,
      chunkSize: 20,
      enableLazyLoading: false, // Load everything upfront
      lazyLoadThreshold: 2000,
      
      showSkeletonScreens: true,
      showProgressIndicators: false, // Too fast to need them
      enableOptimisticUpdates: true,
      debounceDelay: 100
    }
  },
  
  {
    id: 'performance',
    name: 'Performance Mode',
    description: 'Balanced performance for good connections',
    networkRequirements: ['good', 'excellent'],
    config: {
      maxConcurrentRequests: 6,
      requestTimeout: 12000,
      retryAttempts: 3,
      retryDelay: 1000,
      
      imageQuality: 85,
      compressionLevel: 3,
      enableImageOptimization: true,
      preferredImageFormat: 'webp',
      
      prefetchEnabled: true,
      prefetchDistance: 2,
      cacheStrategy: 'moderate',
      cacheTTL: 1800,
      
      enableProgressiveLoading: true,
      chunkSize: 15,
      enableLazyLoading: true,
      lazyLoadThreshold: 1000,
      
      showSkeletonScreens: true,
      showProgressIndicators: true,
      enableOptimisticUpdates: true,
      debounceDelay: 200
    }
  },
  
  {
    id: 'balanced',
    name: 'Balanced Mode',
    description: 'Optimized for moderate connections',
    networkRequirements: ['moderate', 'good'],
    config: {
      maxConcurrentRequests: 4,
      requestTimeout: 18000,
      retryAttempts: 2,
      retryDelay: 1500,
      
      imageQuality: 75,
      compressionLevel: 5,
      enableImageOptimization: true,
      preferredImageFormat: 'webp',
      
      prefetchEnabled: false,
      prefetchDistance: 1,
      cacheStrategy: 'moderate',
      cacheTTL: 900,
      
      enableProgressiveLoading: true,
      chunkSize: 10,
      enableLazyLoading: true,
      lazyLoadThreshold: 500,
      
      showSkeletonScreens: false,
      showProgressIndicators: true,
      enableOptimisticUpdates: false,
      debounceDelay: 300
    }
  },
  
  {
    id: 'economy',
    name: 'Economy Mode',
    description: 'Data-efficient for poor connections',
    networkRequirements: ['poor', 'moderate'],
    config: {
      maxConcurrentRequests: 2,
      requestTimeout: 30000,
      retryAttempts: 1,
      retryDelay: 3000,
      
      imageQuality: 60,
      compressionLevel: 8,
      enableImageOptimization: true,
      preferredImageFormat: 'webp',
      
      prefetchEnabled: false,
      prefetchDistance: 0,
      cacheStrategy: 'aggressive', // Cache everything to avoid re-downloads
      cacheTTL: 7200,
      
      enableProgressiveLoading: false, // Load on-demand only
      chunkSize: 5,
      enableLazyLoading: true,
      lazyLoadThreshold: 200,
      
      showSkeletonScreens: false,
      showProgressIndicators: true,
      enableOptimisticUpdates: false,
      debounceDelay: 500
    }
  },
  
  {
    id: 'data-saver',
    name: 'Data Saver',
    description: 'Minimal data usage for data-conscious users',
    networkRequirements: ['poor'],
    config: {
      maxConcurrentRequests: 1,
      requestTimeout: 45000,
      retryAttempts: 1,
      retryDelay: 5000,
      
      imageQuality: 50,
      compressionLevel: 10,
      enableImageOptimization: true,
      preferredImageFormat: 'webp',
      
      prefetchEnabled: false,
      prefetchDistance: 0,
      cacheStrategy: 'aggressive',
      cacheTTL: 14400, // 4 hours
      
      enableProgressiveLoading: false,
      chunkSize: 3,
      enableLazyLoading: true,
      lazyLoadThreshold: 100,
      
      showSkeletonScreens: false,
      showProgressIndicators: true,
      enableOptimisticUpdates: false,
      debounceDelay: 1000
    }
  },
  
  {
    id: 'offline-first',
    name: 'Offline First',
    description: 'Cache-heavy strategy for unreliable connections',
    networkRequirements: ['poor'],
    config: {
      maxConcurrentRequests: 1,
      requestTimeout: 60000,
      retryAttempts: 5,
      retryDelay: 10000,
      
      imageQuality: 70,
      compressionLevel: 6,
      enableImageOptimization: true,
      preferredImageFormat: 'webp',
      
      prefetchEnabled: false,
      prefetchDistance: 0,
      cacheStrategy: 'aggressive',
      cacheTTL: 86400, // 24 hours
      
      enableProgressiveLoading: false,
      chunkSize: 1,
      enableLazyLoading: true,
      lazyLoadThreshold: 50,
      
      showSkeletonScreens: false,
      showProgressIndicators: true,
      enableOptimisticUpdates: false,
      debounceDelay: 2000
    }
  }
];

/**
 * Adaptive Loading Strategy Engine
 */
export class AdaptiveLoadingService {
  private static instance: AdaptiveLoadingService;
  private currentStrategy: LoadingStrategy;
  private customConfig?: Partial<StrategyConfig>;
  private metrics: LoadingMetrics[] = [];
  private options: AdaptiveLoadingOptions = {};

  private constructor() {
    this.currentStrategy = this.selectOptimalStrategy();
    this.setupNetworkListener();
  }

  static getInstance(): AdaptiveLoadingService {
    if (!AdaptiveLoadingService.instance) {
      AdaptiveLoadingService.instance = new AdaptiveLoadingService();
    }
    return AdaptiveLoadingService.instance;
  }

  /**
   * Set adaptive loading options
   */
  setOptions(options: AdaptiveLoadingOptions): void {
    this.options = { ...this.options, ...options };
    this.customConfig = options.customConfig;
    
    if (options.forceStrategy) {
      const forcedStrategy = this.getStrategyById(options.forceStrategy);
      if (forcedStrategy) {
        this.currentStrategy = forcedStrategy;
      }
    } else {
      this.currentStrategy = this.selectOptimalStrategy();
    }
  }

  /**
   * Get the current loading strategy
   */
  getCurrentStrategy(): LoadingStrategy {
    return this.currentStrategy;
  }

  /**
   * Get the effective configuration (strategy + custom overrides)
   */
  getEffectiveConfig(): StrategyConfig {
    return {
      ...this.currentStrategy.config,
      ...this.customConfig
    };
  }

  /**
   * Select optimal strategy based on current network conditions
   */
  private selectOptimalStrategy(): LoadingStrategy {
    const networkInfo = networkMonitor.getNetworkInfo();
    const deviceInfo = this.getDeviceCapabilities();

    // Force data saver mode if enabled
    if (this.options.respectDataSaver && networkInfo.saveData) {
      return this.getStrategyById('data-saver') || LOADING_STRATEGIES[4];
    }

    // Select strategy based on network quality
    const candidates = LOADING_STRATEGIES.filter(strategy =>
      strategy.networkRequirements.includes(networkInfo.quality)
    );

    // Filter by device capabilities
    const suitableCandidates = candidates.filter(strategy => {
      if (!strategy.deviceRequirements) return true;
      
      const { minMemory, minConcurrency } = strategy.deviceRequirements;
      
      if (minMemory && deviceInfo.estimatedMemory < minMemory) return false;
      if (minConcurrency && deviceInfo.maxConcurrency < minConcurrency) return false;
      
      return true;
    });

    // Return the most aggressive suitable strategy
    return suitableCandidates[0] || this.getStrategyById('balanced') || LOADING_STRATEGIES[2];
  }

  /**
   * Get device capabilities estimation
   */
  private getDeviceCapabilities(): {
    estimatedMemory: number;
    maxConcurrency: number;
    supportedFormats: string[];
  } {
    // Estimate memory based on available APIs
    const estimatedMemory = (navigator as any).deviceMemory || 
      (navigator.hardwareConcurrency >= 8 ? 8 : 
       navigator.hardwareConcurrency >= 4 ? 4 : 2);

    // Estimate max concurrent connections
    const maxConcurrency = Math.min(navigator.hardwareConcurrency * 2, 8);

    // Check supported image formats
    const supportedFormats = ['jpeg', 'png'];
    if (this.supportsWebP()) supportedFormats.push('webp');
    if (this.supportsAVIF()) supportedFormats.push('avif');

    return {
      estimatedMemory,
      maxConcurrency,
      supportedFormats
    };
  }

  /**
   * Check WebP support
   */
  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Check AVIF support
   */
  private supportsAVIF(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    try {
      return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get strategy by ID
   */
  private getStrategyById(id: string): LoadingStrategy | undefined {
    return LOADING_STRATEGIES.find(strategy => strategy.id === id);
  }

  /**
   * Setup network change listener
   */
  private setupNetworkListener(): void {
    networkMonitor.subscribe('adaptive-loading', (event) => {
      if (event.type === 'quality-change' && !this.options.forceStrategy) {
        const newStrategy = this.selectOptimalStrategy();
        if (newStrategy.id !== this.currentStrategy.id) {
          this.currentStrategy = newStrategy;
          this.notifyStrategyChange(newStrategy);
        }
      }
    });
  }

  /**
   * Notify listeners about strategy changes
   */
  private notifyStrategyChange(newStrategy: LoadingStrategy): void {
    console.log(`🔄 Adaptive loading strategy changed to: ${newStrategy.name}`);
    
    // Emit custom event for components to react
    window.dispatchEvent(new CustomEvent('adaptive-loading-strategy-change', {
      detail: { strategy: newStrategy, config: this.getEffectiveConfig() }
    }));
  }

  /**
   * Get all available strategies
   */
  getAvailableStrategies(): LoadingStrategy[] {
    return [...LOADING_STRATEGIES];
  }

  /**
   * Calculate optimal chunk size based on network and content type
   */
  getOptimalChunkSize(contentType: 'tasks' | 'images' | 'data' = 'data'): number {
    const config = this.getEffectiveConfig();
    const networkInfo = networkMonitor.getNetworkInfo();
    
    let baseSize = config.chunkSize;
    
    // Adjust based on content type
    switch (contentType) {
      case 'images':
        baseSize = Math.ceil(baseSize * 0.5); // Smaller chunks for images
        break;
      case 'tasks':
        baseSize = Math.ceil(baseSize * 1.2); // Larger chunks for text data
        break;
    }
    
    // Adjust based on RTT (higher latency = larger chunks)
    if (networkInfo.rtt > 500) {
      baseSize = Math.ceil(baseSize * 1.5);
    } else if (networkInfo.rtt < 100) {
      baseSize = Math.ceil(baseSize * 0.8);
    }
    
    return Math.max(1, Math.min(50, baseSize));
  }

  /**
   * Get optimal image configuration
   */
  getImageConfig(): {
    quality: number;
    format: string;
    enableLazyLoading: boolean;
    lazyLoadThreshold: number;
    enableOptimization: boolean;
  } {
    const config = this.getEffectiveConfig();
    const deviceInfo = this.getDeviceCapabilities();
    
    // Choose optimal format based on support and strategy
    let format = config.preferredImageFormat;
    if (format === 'auto') {
      if (deviceInfo.supportedFormats.includes('avif')) {
        format = 'avif';
      } else if (deviceInfo.supportedFormats.includes('webp')) {
        format = 'webp';
      } else {
        format = 'jpeg';
      }
    }
    
    return {
      quality: config.imageQuality,
      format,
      enableLazyLoading: config.enableLazyLoading,
      lazyLoadThreshold: config.lazyLoadThreshold,
      enableOptimization: config.enableImageOptimization
    };
  }

  /**
   * Check if prefetching should be enabled for a specific resource type
   */
  shouldPrefetch(resourceType: 'pages' | 'images' | 'data' = 'data'): boolean {
    const config = this.getEffectiveConfig();
    const networkInfo = networkMonitor.getNetworkInfo();
    
    if (!config.prefetchEnabled) return false;
    if (!networkInfo.isOnline) return false;
    if (networkInfo.saveData) return false;
    
    // Additional checks based on resource type
    switch (resourceType) {
      case 'images':
        return networkInfo.quality === 'excellent' || networkInfo.quality === 'good';
      case 'pages':
        return config.prefetchDistance > 0;
      default:
        return true;
    }
  }

  /**
   * Record loading metrics
   */
  recordMetrics(metrics: Omit<LoadingMetrics, 'timestamp'>): void {
    this.metrics.push({
      ...metrics,
      timestamp: Date.now()
    });
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
    
    if (this.options.enableAnalytics) {
      this.analyzePerformance();
    }
  }

  /**
   * Get performance analytics
   */
  getMetrics(): LoadingMetrics[] {
    return [...this.metrics];
  }

  /**
   * Analyze performance and suggest optimizations
   */
  private analyzePerformance(): void {
    if (this.metrics.length < 10) return;
    
    const recentMetrics = this.metrics.slice(-10);
    const avgLoadTime = recentMetrics.reduce((sum, m) => sum + m.loadTime, 0) / recentMetrics.length;
    const avgCacheHitRatio = recentMetrics.reduce((sum, m) => sum + m.cacheHitRatio, 0) / recentMetrics.length;
    
    // Suggest strategy adjustments based on performance
    if (avgLoadTime > 5000 && this.currentStrategy.id === 'turbo') {
      console.log('⚠️ High load times detected, consider switching to balanced mode');
    }
    
    if (avgCacheHitRatio < 0.3 && this.currentStrategy.config.cacheStrategy === 'minimal') {
      console.log('💡 Low cache hit ratio, consider more aggressive caching');
    }
  }

  /**
   * Get loading state configuration for UI components
   */
  getLoadingStateConfig(): {
    showSkeleton: boolean;
    showProgress: boolean;
    enableOptimistic: boolean;
    debounceDelay: number;
    timeoutDuration: number;
  } {
    const config = this.getEffectiveConfig();
    
    return {
      showSkeleton: config.showSkeletonScreens,
      showProgress: config.showProgressIndicators,
      enableOptimistic: config.enableOptimisticUpdates,
      debounceDelay: config.debounceDelay,
      timeoutDuration: config.requestTimeout
    };
  }

  /**
   * Reset to automatic strategy selection
   */
  resetToAuto(): void {
    this.options.forceStrategy = undefined;
    this.currentStrategy = this.selectOptimalStrategy();
  }
}

// Convenience exports
export const adaptiveLoading = AdaptiveLoadingService.getInstance();

export default adaptiveLoading;