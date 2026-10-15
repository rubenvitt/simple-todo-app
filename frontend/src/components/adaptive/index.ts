/**
 * Adaptive Loading Components
 * 
 * Components that adapt to network conditions and device capabilities
 */

export { default as AdaptiveLoadingProvider, useAdaptiveLoadingContext } from './AdaptiveLoadingProvider';
export { default as AdaptiveImage, AdaptiveImageGrid } from './AdaptiveImage';

// Re-export adaptive loading hooks
export { 
  useAdaptiveLoading,
  useAdaptiveImages,
  useAdaptiveDataFetching,
  useAdaptiveLoadingStates
} from '../../hooks/useAdaptiveLoading';

// Re-export adaptive loading service
export { 
  adaptiveLoading,
  LoadingStrategy,
  StrategyConfig,
  AdaptiveLoadingOptions,
  LoadingMetrics
} from '../../services/adaptive-loading.service';