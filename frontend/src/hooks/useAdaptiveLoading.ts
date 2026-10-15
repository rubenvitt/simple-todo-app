/**
 * useAdaptiveLoading Hook
 * 
 * React hook for adaptive loading strategies based on network conditions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  adaptiveLoading, 
  LoadingStrategy, 
  StrategyConfig, 
  AdaptiveLoadingOptions,
  LoadingMetrics 
} from '../services/adaptive-loading.service';
import { useNetworkMonitor } from './useNetworkMonitor';

export interface UseAdaptiveLoadingOptions extends AdaptiveLoadingOptions {
  autoOptimize?: boolean;
  trackMetrics?: boolean;
  onStrategyChange?: (strategy: LoadingStrategy) => void;
  onConfigChange?: (config: StrategyConfig) => void;
}

export interface UseAdaptiveLoadingReturn {
  // Current strategy and config
  currentStrategy: LoadingStrategy;
  effectiveConfig: StrategyConfig;
  
  // Loading configurations
  imageConfig: ReturnType<typeof adaptiveLoading.getImageConfig>;
  loadingStateConfig: ReturnType<typeof adaptiveLoading.getLoadingStateConfig>;
  
  // Adaptive decisions
  shouldPrefetch: (resourceType?: 'pages' | 'images' | 'data') => boolean;
  getOptimalChunkSize: (contentType?: 'tasks' | 'images' | 'data') => number;
  
  // Strategy management
  availableStrategies: LoadingStrategy[];
  setStrategy: (strategyId: string) => void;
  resetToAuto: () => void;
  setCustomConfig: (config: Partial<StrategyConfig>) => void;
  
  // Metrics and analytics
  recordMetrics: (metrics: Omit<LoadingMetrics, 'timestamp'>) => void;
  getMetrics: () => LoadingMetrics[];
  
  // Network awareness
  networkInfo: ReturnType<typeof useNetworkMonitor>['networkInfo'];
  networkQuality: ReturnType<typeof useNetworkMonitor>['quality'];
  isOnline: boolean;
}

export const useAdaptiveLoading = (options: UseAdaptiveLoadingOptions = {}): UseAdaptiveLoadingReturn => {
  const {
    autoOptimize = true,
    trackMetrics = true,
    onStrategyChange,
    onConfigChange,
    ...adaptiveOptions
  } = options;

  // Network monitoring
  const { networkInfo, quality: networkQuality, isOnline } = useNetworkMonitor({
    startMonitoring: autoOptimize
  });

  // State
  const [currentStrategy, setCurrentStrategy] = useState<LoadingStrategy>(() => 
    adaptiveLoading.getCurrentStrategy()
  );
  const [effectiveConfig, setEffectiveConfig] = useState<StrategyConfig>(() => 
    adaptiveLoading.getEffectiveConfig()
  );
  const [availableStrategies] = useState<LoadingStrategy[]>(() => 
    adaptiveLoading.getAvailableStrategies()
  );

  // Refs
  const lastStrategyId = useRef(currentStrategy.id);
  const metricsStartTime = useRef<number | null>(null);

  // Set initial options
  useEffect(() => {
    adaptiveLoading.setOptions({
      enableAnalytics: trackMetrics,
      ...adaptiveOptions
    });
  }, [trackMetrics, adaptiveOptions]);

  // Listen for strategy changes
  useEffect(() => {
    const handleStrategyChange = (event: CustomEvent) => {
      const { strategy, config } = event.detail;
      setCurrentStrategy(strategy);
      setEffectiveConfig(config);
      
      if (lastStrategyId.current !== strategy.id) {
        lastStrategyId.current = strategy.id;
        onStrategyChange?.(strategy);
        onConfigChange?.(config);
      }
    };

    window.addEventListener('adaptive-loading-strategy-change', handleStrategyChange as EventListener);
    
    return () => {
      window.removeEventListener('adaptive-loading-strategy-change', handleStrategyChange as EventListener);
    };
  }, [onStrategyChange, onConfigChange]);

  // Update strategy when network changes (if auto-optimize is enabled)
  useEffect(() => {
    if (autoOptimize) {
      const newStrategy = adaptiveLoading.getCurrentStrategy();
      const newConfig = adaptiveLoading.getEffectiveConfig();
      
      if (newStrategy.id !== currentStrategy.id) {
        setCurrentStrategy(newStrategy);
        setEffectiveConfig(newConfig);
        
        onStrategyChange?.(newStrategy);
        onConfigChange?.(newConfig);
      }
    }
  }, [networkQuality, isOnline, autoOptimize, currentStrategy.id, onStrategyChange, onConfigChange]);

  // Derived configurations
  const imageConfig = adaptiveLoading.getImageConfig();
  const loadingStateConfig = adaptiveLoading.getLoadingStateConfig();

  // Strategy management functions
  const setStrategy = useCallback((strategyId: string) => {
    adaptiveLoading.setOptions({ forceStrategy: strategyId });
    const newStrategy = adaptiveLoading.getCurrentStrategy();
    const newConfig = adaptiveLoading.getEffectiveConfig();
    
    setCurrentStrategy(newStrategy);
    setEffectiveConfig(newConfig);
    
    onStrategyChange?.(newStrategy);
    onConfigChange?.(newConfig);
  }, [onStrategyChange, onConfigChange]);

  const resetToAuto = useCallback(() => {
    adaptiveLoading.resetToAuto();
    const newStrategy = adaptiveLoading.getCurrentStrategy();
    const newConfig = adaptiveLoading.getEffectiveConfig();
    
    setCurrentStrategy(newStrategy);
    setEffectiveConfig(newConfig);
    
    onStrategyChange?.(newStrategy);
    onConfigChange?.(newConfig);
  }, [onStrategyChange, onConfigChange]);

  const setCustomConfig = useCallback((config: Partial<StrategyConfig>) => {
    adaptiveLoading.setOptions({ customConfig: config });
    const newConfig = adaptiveLoading.getEffectiveConfig();
    
    setEffectiveConfig(newConfig);
    onConfigChange?.(newConfig);
  }, [onConfigChange]);

  // Adaptive decision functions
  const shouldPrefetch = useCallback((resourceType?: 'pages' | 'images' | 'data') => {
    return adaptiveLoading.shouldPrefetch(resourceType);
  }, []);

  const getOptimalChunkSize = useCallback((contentType?: 'tasks' | 'images' | 'data') => {
    return adaptiveLoading.getOptimalChunkSize(contentType);
  }, []);

  // Metrics functions
  const recordMetrics = useCallback((metrics: Omit<LoadingMetrics, 'timestamp'>) => {
    if (trackMetrics) {
      adaptiveLoading.recordMetrics(metrics);
    }
  }, [trackMetrics]);

  const getMetrics = useCallback(() => {
    return adaptiveLoading.getMetrics();
  }, []);

  return {
    // Current strategy and config
    currentStrategy,
    effectiveConfig,
    
    // Loading configurations
    imageConfig,
    loadingStateConfig,
    
    // Adaptive decisions
    shouldPrefetch,
    getOptimalChunkSize,
    
    // Strategy management
    availableStrategies,
    setStrategy,
    resetToAuto,
    setCustomConfig,
    
    // Metrics and analytics
    recordMetrics,
    getMetrics,
    
    // Network awareness
    networkInfo,
    networkQuality,
    isOnline
  };
};

// Convenience hooks for specific use cases

/**
 * Hook for image loading optimization
 */
export const useAdaptiveImages = () => {
  const { imageConfig, shouldPrefetch } = useAdaptiveLoading();

  const getImageUrl = useCallback((baseUrl: string, options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}) => {
    const { width, height, quality = imageConfig.quality } = options;
    const format = imageConfig.format;
    
    // Construct optimized image URL (would depend on your image service)
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    if (quality) params.set('q', quality.toString());
    if (format !== 'auto') params.set('f', format);
    
    return `${baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
  }, [imageConfig]);

  const shouldLazyLoad = imageConfig.enableLazyLoading;
  const lazyLoadThreshold = imageConfig.lazyLoadThreshold;
  const shouldPrefetchImages = shouldPrefetch('images');

  return {
    getImageUrl,
    shouldLazyLoad,
    lazyLoadThreshold,
    shouldPrefetchImages,
    imageConfig
  };
};

/**
 * Hook for data fetching optimization
 */
export const useAdaptiveDataFetching = () => {
  const { 
    effectiveConfig, 
    getOptimalChunkSize, 
    shouldPrefetch, 
    recordMetrics,
    networkQuality 
  } = useAdaptiveLoading();

  const getRequestConfig = useCallback(() => {
    return {
      timeout: effectiveConfig.requestTimeout,
      retryAttempts: effectiveConfig.retryAttempts,
      retryDelay: effectiveConfig.retryDelay,
      maxConcurrent: effectiveConfig.maxConcurrentRequests
    };
  }, [effectiveConfig]);

  const shouldUseProgressive = effectiveConfig.enableProgressiveLoading;
  const shouldPrefetchData = shouldPrefetch('data');
  const chunkSize = getOptimalChunkSize('data');

  const recordLoadTime = useCallback((startTime: number, endTime: number, bytesTransferred: number) => {
    recordMetrics({
      strategyUsed: 'current', // Would be filled by the actual strategy
      loadTime: endTime - startTime,
      bytesTransferred,
      cacheHitRatio: 0 // Would be calculated by cache system
    });
  }, [recordMetrics]);

  return {
    getRequestConfig,
    shouldUseProgressive,
    shouldPrefetchData,
    chunkSize,
    recordLoadTime,
    networkQuality
  };
};

/**
 * Hook for UI loading states
 */
export const useAdaptiveLoadingStates = () => {
  const { loadingStateConfig, networkQuality, isOnline } = useAdaptiveLoading();

  const getLoadingComponent = useCallback((isLoading: boolean, error?: Error) => {
    if (error) {
      return {
        type: 'error' as const,
        showRetry: true,
        message: isOnline ? 'Loading failed' : 'You are offline'
      };
    }

    if (!isLoading) {
      return { type: 'idle' as const };
    }

    if (loadingStateConfig.showSkeleton) {
      return { type: 'skeleton' as const };
    }

    if (loadingStateConfig.showProgress) {
      return { 
        type: 'progress' as const,
        showEstimate: networkQuality === 'poor',
        showSpinner: networkQuality !== 'poor'
      };
    }

    return { type: 'spinner' as const };
  }, [loadingStateConfig, networkQuality, isOnline]);

  const debounceDelay = loadingStateConfig.debounceDelay;
  const enableOptimistic = loadingStateConfig.enableOptimistic;
  const timeoutDuration = loadingStateConfig.timeoutDuration;

  return {
    getLoadingComponent,
    debounceDelay,
    enableOptimistic,
    timeoutDuration,
    loadingStateConfig
  };
};

export default useAdaptiveLoading;