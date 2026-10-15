import { useCallback, useRef } from 'react';
import { useHaptics } from './useHaptics';

export interface SwipeHapticsConfig {
  enableSwipeStart?: boolean;
  enableSwipeEnd?: boolean;
  enableSwipeSuccess?: boolean;
  enableSwipeCancel?: boolean;
  swipeThreshold?: number; // Distance threshold for haptic triggers
}

export function useSwipeHaptics(config: SwipeHapticsConfig = {}) {
  const {
    enableSwipeStart = true,
    enableSwipeEnd = true,
    enableSwipeSuccess = true,
    enableSwipeCancel = true,
    swipeThreshold = 50
  } = config;

  const {
    tapFeedback,
    swipeSuccessFeedback,
    errorFeedback,
    pressFeedback,
    isEnabled
  } = useHaptics();

  const swipeState = useRef({
    isStarted: false,
    startX: 0,
    startY: 0,
    hasTriggeredThreshold: false
  });

  const handleSwipeStart = useCallback((clientX: number, clientY: number) => {
    if (!isEnabled) return;

    swipeState.current = {
      isStarted: true,
      startX: clientX,
      startY: clientY,
      hasTriggeredThreshold: false
    };

    if (enableSwipeStart) {
      tapFeedback();
    }
  }, [isEnabled, enableSwipeStart, tapFeedback]);

  const handleSwipeMove = useCallback((clientX: number, clientY: number) => {
    if (!isEnabled || !swipeState.current.isStarted) return;

    const deltaX = Math.abs(clientX - swipeState.current.startX);
    const deltaY = Math.abs(clientY - swipeState.current.startY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Trigger haptic when threshold is reached (but only once per swipe)
    if (distance > swipeThreshold && !swipeState.current.hasTriggeredThreshold) {
      swipeState.current.hasTriggeredThreshold = true;
      pressFeedback();
    }
  }, [isEnabled, swipeThreshold, pressFeedback]);

  const handleSwipeEnd = useCallback((completed: boolean = false) => {
    if (!isEnabled || !swipeState.current.isStarted) return;

    if (enableSwipeEnd) {
      if (completed && enableSwipeSuccess) {
        swipeSuccessFeedback();
      } else if (!completed && enableSwipeCancel) {
        errorFeedback();
      }
    }

    // Reset state
    swipeState.current = {
      isStarted: false,
      startX: 0,
      startY: 0,
      hasTriggeredThreshold: false
    };
  }, [isEnabled, enableSwipeEnd, enableSwipeSuccess, enableSwipeCancel, swipeSuccessFeedback, errorFeedback]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      handleSwipeStart(touch.clientX, touch.clientY);
    }
  }, [handleSwipeStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      handleSwipeMove(touch.clientX, touch.clientY);
    }
  }, [handleSwipeMove]);

  const handleTouchEnd = useCallback((completed: boolean = false) => {
    handleSwipeEnd(completed);
  }, [handleSwipeEnd]);

  // Mouse event handlers (for testing on desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleSwipeStart(e.clientX, e.clientY);
  }, [handleSwipeStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons === 1) { // Only when mouse button is pressed
      handleSwipeMove(e.clientX, e.clientY);
    }
  }, [handleSwipeMove]);

  const handleMouseUp = useCallback((completed: boolean = false) => {
    handleSwipeEnd(completed);
  }, [handleSwipeEnd]);

  return {
    // Touch handlers
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    
    // Mouse handlers (for desktop testing)
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    
    // Manual control
    triggerSwipeStart: handleSwipeStart,
    triggerSwipeMove: handleSwipeMove,
    triggerSwipeEnd: handleSwipeEnd,
    
    // State
    isEnabled,
    isSwipeActive: swipeState.current.isStarted
  };
}