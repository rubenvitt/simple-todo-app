import { useState, useEffect, useRef, useCallback } from 'react';
import { useDrag } from '@use-gesture/react';
import { useSpring, config } from '@react-spring/web';

interface PullToRefreshConfig {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
  hapticFeedback?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  isThresholdReached: boolean;
  shouldTriggerRefresh: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  disabled = false,
  hapticFeedback = true,
}: PullToRefreshConfig) => {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    isThresholdReached: false,
    shouldTriggerRefresh: false,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasTriggeredHaptic = useRef(false);

  // Spring animation for pull distance and rubber band effect
  const [springProps, springApi] = useSpring(() => ({
    pullDistance: 0,
    opacity: 0,
    scale: 1,
    config: config.wobbly,
  }));

  // Trigger haptic feedback (iOS/Android)
  const triggerHaptic = useCallback(() => {
    if (!hapticFeedback || hasTriggeredHaptic.current) return;
    
    try {
      // iOS Haptic Feedback
      if ('hapticFeedback' in navigator) {
        (navigator as any).hapticFeedback.impact('medium');
      }
      // Android Vibration
      else if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      hasTriggeredHaptic.current = true;
    } catch (error) {
      console.debug('Haptic feedback not available:', error);
    }
  }, [hapticFeedback]);

  // Rubber band effect calculation
  const calculateRubberBand = useCallback((distance: number): number => {
    if (distance <= 0) return 0;
    if (distance <= threshold) return distance;
    
    // Apply rubber band effect beyond threshold
    const excess = distance - threshold;
    const rubberBand = threshold + (excess * 0.3); // 30% resistance
    return Math.min(rubberBand, maxPull);
  }, [threshold, maxPull]);

  // Handle refresh trigger
  const triggerRefresh = useCallback(async () => {
    if (state.isRefreshing || disabled) return;

    setState(prev => ({ ...prev, isRefreshing: true, shouldTriggerRefresh: false }));
    
    try {
      await onRefresh();
    } catch (error) {
      console.error('Pull to refresh error:', error);
    } finally {
      setState(prev => ({ ...prev, isRefreshing: false }));
      springApi.start({ pullDistance: 0, opacity: 0, scale: 1 });
    }
  }, [state.isRefreshing, disabled, onRefresh, springApi]);

  // Drag gesture handling
  const bind = useDrag(
    ({ down, movement: [, my], velocity: [, vy], memo = { startY: 0 } }) => {
      if (disabled) return memo;

      const container = containerRef.current;
      if (!container) return memo;

      // Only allow pull when at top of scroll
      const isAtTop = container.scrollTop <= 0;
      if (!isAtTop && !state.isPulling) return memo;

      // Start pulling
      if (down && my > 0 && isAtTop) {
        const rawDistance = Math.max(0, my);
        const pullDistance = calculateRubberBand(rawDistance);
        const isThresholdReached = rawDistance >= threshold;

        // Trigger haptic feedback when threshold is reached
        if (isThresholdReached && !hasTriggeredHaptic.current) {
          triggerHaptic();
        }

        setState(prev => ({
          ...prev,
          isPulling: true,
          pullDistance: rawDistance,
          isThresholdReached,
        }));

        springApi.start({
          pullDistance,
          opacity: Math.min(pullDistance / threshold, 1),
          scale: isThresholdReached ? 1.1 : 1,
        });

        return memo;
      }

      // Release gesture
      if (!down && state.isPulling) {
        const shouldRefresh = state.isThresholdReached && vy <= 0.1; // Not flicking up

        setState(prev => ({
          ...prev,
          isPulling: false,
          shouldTriggerRefresh: shouldRefresh,
        }));

        hasTriggeredHaptic.current = false;

        if (shouldRefresh) {
          triggerRefresh();
        } else {
          springApi.start({ pullDistance: 0, opacity: 0, scale: 1 });
        }
      }

      return memo;
    },
    {
      axis: 'y',
      bounds: { top: 0 },
      filterTaps: true,
      preventDefault: true,
    }
  );

  // Reset state when disabled
  useEffect(() => {
    if (disabled) {
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        isThresholdReached: false,
        shouldTriggerRefresh: false,
      });
      springApi.start({ pullDistance: 0, opacity: 0, scale: 1 });
    }
  }, [disabled, springApi]);

  // Public API
  return {
    // State
    ...state,
    
    // Refs
    containerRef,
    
    // Gesture binding
    bind,
    
    // Spring props for animations
    springProps,
    
    // Calculated values
    pullProgress: Math.min(state.pullDistance / threshold, 1),
    pullOffset: springProps.pullDistance,
    
    // Manual trigger
    refresh: triggerRefresh,
    
    // Config
    threshold,
    maxPull,
  };
};

// Enhanced hook for list views
export const useListPullToRefresh = (
  refreshFn: () => Promise<void>,
  options?: Partial<PullToRefreshConfig>
) => {
  return usePullToRefresh({
    onRefresh: refreshFn,
    threshold: 80,
    maxPull: 120,
    hapticFeedback: true,
    ...options,
  });
};