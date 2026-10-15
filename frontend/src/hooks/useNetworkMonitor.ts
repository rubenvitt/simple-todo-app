/**
 * useNetworkMonitor Hook
 * 
 * React hook for monitoring network conditions and providing adaptive configurations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  networkMonitor, 
  NetworkInfo, 
  NetworkEvent, 
  NetworkCapabilities,
  NetworkQuality 
} from '../services/network-monitor.service';

export interface UseNetworkMonitorOptions {
  startMonitoring?: boolean;
  enableSpeedTests?: boolean;
  speedTestInterval?: number; // minutes
  onNetworkChange?: (networkInfo: NetworkInfo) => void;
  onQualityChange?: (quality: NetworkQuality) => void;
  onOnline?: () => void;
  onOffline?: () => void;
}

export interface UseNetworkMonitorReturn {
  // Current network state
  networkInfo: NetworkInfo;
  capabilities: NetworkCapabilities;
  isOnline: boolean;
  quality: NetworkQuality;
  
  // Network status
  statusDescription: string;
  isSuitableForHeavyOperations: boolean;
  adaptiveConfig: ReturnType<typeof networkMonitor.getAdaptiveConfig>;
  
  // Speed testing
  isTestingSpeed: boolean;
  lastSpeedTest: {
    downloadSpeed: number;
    latency: number;
    timestamp: number;
  } | null;
  
  // Actions
  testNetworkSpeed: () => Promise<void>;
  refreshNetworkInfo: () => void;
  
  // Monitoring control
  startMonitoring: () => void;
  stopMonitoring: () => void;
  isMonitoring: boolean;
}

export const useNetworkMonitor = (options: UseNetworkMonitorOptions = {}): UseNetworkMonitorReturn => {
  const {
    startMonitoring: autoStart = true,
    enableSpeedTests = false,
    speedTestInterval = 5, // 5 minutes
    onNetworkChange,
    onQualityChange,
    onOnline,
    onOffline
  } = options;

  // State
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>(() => networkMonitor.getNetworkInfo());
  const [capabilities] = useState<NetworkCapabilities>(() => networkMonitor.getCapabilities());
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isTestingSpeed, setIsTestingSpeed] = useState(false);
  const [lastSpeedTest, setLastSpeedTest] = useState<{
    downloadSpeed: number;
    latency: number;
    timestamp: number;
  } | null>(null);

  // Refs for cleanup
  const hookId = useRef(Math.random().toString(36));
  const speedTestIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Network event handler
  const handleNetworkEvent = useCallback((event: NetworkEvent) => {
    const { type, networkInfo: newInfo, previousInfo } = event;
    
    setNetworkInfo(newInfo);

    // Call user-provided callbacks
    switch (type) {
      case 'change':
      case 'quality-change':
        onNetworkChange?.(newInfo);
        if (previousInfo && previousInfo.quality !== newInfo.quality) {
          onQualityChange?.(newInfo.quality);
        }
        break;
      case 'online':
        onOnline?.();
        onNetworkChange?.(newInfo);
        break;
      case 'offline':
        onOffline?.();
        onNetworkChange?.(newInfo);
        break;
    }
  }, [onNetworkChange, onQualityChange, onOnline, onOffline]);

  // Speed test function
  const testNetworkSpeed = useCallback(async () => {
    if (isTestingSpeed) return;

    setIsTestingSpeed(true);
    try {
      const speedResult = await networkMonitor.testNetworkSpeed();
      setLastSpeedTest(speedResult);
    } catch (error) {
      console.error('Speed test failed:', error);
    } finally {
      setIsTestingSpeed(false);
    }
  }, [isTestingSpeed]);

  // Refresh network info manually
  const refreshNetworkInfo = useCallback(() => {
    const newInfo = networkMonitor.getNetworkInfo();
    setNetworkInfo(newInfo);
  }, []);

  // Start monitoring
  const startMonitoringFunc = useCallback(() => {
    if (isMonitoring) return;

    networkMonitor.subscribe(hookId.current, handleNetworkEvent);
    networkMonitor.startMonitoring();
    setIsMonitoring(true);

    // Set up periodic speed tests if enabled
    if (enableSpeedTests) {
      const intervalMs = speedTestInterval * 60 * 1000;
      speedTestIntervalRef.current = setInterval(() => {
        if (networkMonitor.getNetworkInfo().isOnline) {
          testNetworkSpeed();
        }
      }, intervalMs);

      // Initial speed test
      setTimeout(() => {
        if (networkMonitor.getNetworkInfo().isOnline) {
          testNetworkSpeed();
        }
      }, 2000); // Wait 2 seconds after start
    }
  }, [isMonitoring, handleNetworkEvent, enableSpeedTests, speedTestInterval, testNetworkSpeed]);

  // Stop monitoring
  const stopMonitoringFunc = useCallback(() => {
    if (!isMonitoring) return;

    networkMonitor.unsubscribe(hookId.current);
    networkMonitor.stopMonitoring();
    setIsMonitoring(false);

    // Clear speed test interval
    if (speedTestIntervalRef.current) {
      clearInterval(speedTestIntervalRef.current);
      speedTestIntervalRef.current = null;
    }
  }, [isMonitoring]);

  // Initialize monitoring on mount
  useEffect(() => {
    if (autoStart) {
      startMonitoringFunc();
    }

    // Cleanup on unmount
    return () => {
      stopMonitoringFunc();
    };
  }, [autoStart, startMonitoringFunc, stopMonitoringFunc]);

  // Derived values
  const isOnline = networkInfo.isOnline;
  const quality = networkInfo.quality;
  const statusDescription = networkMonitor.getNetworkStatusDescription();
  const isSuitableForHeavyOperations = networkMonitor.isSuitableForHeavyOperations();
  const adaptiveConfig = networkMonitor.getAdaptiveConfig();

  return {
    // Current network state
    networkInfo,
    capabilities,
    isOnline,
    quality,
    
    // Network status
    statusDescription,
    isSuitableForHeavyOperations,
    adaptiveConfig,
    
    // Speed testing
    isTestingSpeed,
    lastSpeedTest,
    
    // Actions
    testNetworkSpeed,
    refreshNetworkInfo,
    
    // Monitoring control
    startMonitoring: startMonitoringFunc,
    stopMonitoring: stopMonitoringFunc,
    isMonitoring
  };
};

// Convenience hooks for specific use cases

/**
 * Hook that only tracks online/offline status
 */
export const useOnlineStatus = () => {
  const { isOnline, statusDescription } = useNetworkMonitor({
    startMonitoring: true
  });

  return { isOnline, statusDescription };
};

/**
 * Hook that provides adaptive configuration based on network quality
 */
export const useNetworkAdaptiveConfig = () => {
  const { adaptiveConfig, quality, isSuitableForHeavyOperations } = useNetworkMonitor({
    startMonitoring: true
  });

  return {
    config: adaptiveConfig,
    quality,
    isSuitableForHeavyOperations,
    shouldReduceQuality: quality === 'poor' || quality === 'moderate',
    shouldPrefetch: adaptiveConfig.prefetchEnabled,
    shouldCompress: adaptiveConfig.compressionLevel > 3
  };
};

/**
 * Hook for components that need to adapt to network quality
 */
export const useNetworkQualityAdaptation = () => {
  const { quality, networkInfo, adaptiveConfig } = useNetworkMonitor({
    startMonitoring: true
  });

  const getImageConfig = useCallback(() => {
    return {
      quality: adaptiveConfig.imagequality,
      format: quality === 'poor' ? 'webp' : 'auto',
      lazy: quality !== 'excellent',
      placeholder: quality === 'poor' || quality === 'moderate'
    };
  }, [adaptiveConfig.imagequality, quality]);

  const getLoadingConfig = useCallback(() => {
    return {
      showSkeleton: quality === 'excellent' || quality === 'good',
      showProgress: quality === 'moderate' || quality === 'poor',
      timeout: adaptiveConfig.requestTimeout,
      debounceDelay: quality === 'poor' ? 500 : 200
    };
  }, [adaptiveConfig.requestTimeout, quality]);

  const shouldShowOfflineMode = !networkInfo.isOnline;
  const shouldShowDataSaverMode = networkInfo.saveData;

  return {
    quality,
    getImageConfig,
    getLoadingConfig,
    shouldShowOfflineMode,
    shouldShowDataSaverMode,
    adaptiveConfig
  };
};

export default useNetworkMonitor;