/**
 * Adaptive Loading Provider
 * 
 * Context provider for adaptive loading configuration and strategy management
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAdaptiveLoading, UseAdaptiveLoadingReturn } from '../../hooks/useAdaptiveLoading';
import { LoadingStrategy, StrategyConfig } from '../../services/adaptive-loading.service';

interface AdaptiveLoadingContextValue extends UseAdaptiveLoadingReturn {
  // Additional context-specific methods
  isDataSaverMode: boolean;
  isLowPerformanceMode: boolean;
  recommendedStrategy: string;
}

const AdaptiveLoadingContext = createContext<AdaptiveLoadingContextValue | null>(null);

interface AdaptiveLoadingProviderProps {
  children: React.ReactNode;
  autoOptimize?: boolean;
  respectUserPreferences?: boolean;
  enableAnalytics?: boolean;
  onStrategyChange?: (strategy: LoadingStrategy) => void;
}

export const AdaptiveLoadingProvider: React.FC<AdaptiveLoadingProviderProps> = ({
  children,
  autoOptimize = true,
  respectUserPreferences = true,
  enableAnalytics = true,
  onStrategyChange
}) => {
  const adaptiveLoading = useAdaptiveLoading({
    autoOptimize,
    trackMetrics: enableAnalytics,
    respectDataSaver: respectUserPreferences,
    respectReducedMotion: respectUserPreferences,
    onStrategyChange
  });

  const [isDataSaverMode, setIsDataSaverMode] = useState(false);
  const [isLowPerformanceMode, setIsLowPerformanceMode] = useState(false);
  const [recommendedStrategy, setRecommendedStrategy] = useState('');

  // Check for data saver mode
  useEffect(() => {
    const checkDataSaverMode = () => {
      const connection = (navigator as any).connection;
      const isDataSaver = connection?.saveData || 
                         adaptiveLoading.networkQuality === 'poor' ||
                         localStorage.getItem('data-saver-mode') === 'true';
      setIsDataSaverMode(isDataSaver);
    };

    checkDataSaverMode();
    window.addEventListener('online', checkDataSaverMode);
    window.addEventListener('offline', checkDataSaverMode);

    return () => {
      window.removeEventListener('online', checkDataSaverMode);
      window.removeEventListener('offline', checkDataSaverMode);
    };
  }, [adaptiveLoading.networkQuality]);

  // Check for low performance mode
  useEffect(() => {
    const checkLowPerformanceMode = () => {
      const hardwareConcurrency = navigator.hardwareConcurrency || 2;
      const deviceMemory = (navigator as any).deviceMemory || 2;
      
      const isLowPerformance = hardwareConcurrency < 4 || 
                              deviceMemory < 2 ||
                              adaptiveLoading.networkQuality === 'poor';
      
      setIsLowPerformanceMode(isLowPerformance);
    };

    checkLowPerformanceMode();
  }, [adaptiveLoading.networkQuality]);

  // Recommend optimal strategy
  useEffect(() => {
    let recommended = 'balanced';
    
    if (isDataSaverMode) {
      recommended = 'data-saver';
    } else if (isLowPerformanceMode) {
      recommended = 'economy';
    } else if (adaptiveLoading.networkQuality === 'excellent') {
      recommended = 'turbo';
    } else if (adaptiveLoading.networkQuality === 'good') {
      recommended = 'performance';
    }
    
    setRecommendedStrategy(recommended);
  }, [isDataSaverMode, isLowPerformanceMode, adaptiveLoading.networkQuality]);

  const contextValue: AdaptiveLoadingContextValue = {
    ...adaptiveLoading,
    isDataSaverMode,
    isLowPerformanceMode,
    recommendedStrategy
  };

  return (
    <AdaptiveLoadingContext.Provider value={contextValue}>
      {children}
    </AdaptiveLoadingContext.Provider>
  );
};

export const useAdaptiveLoadingContext = (): AdaptiveLoadingContextValue => {
  const context = useContext(AdaptiveLoadingContext);
  if (!context) {
    throw new Error('useAdaptiveLoadingContext must be used within an AdaptiveLoadingProvider');
  }
  return context;
};

export default AdaptiveLoadingProvider;