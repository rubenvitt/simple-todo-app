import { useCallback, useRef, useState, useEffect } from 'react';
import { useHaptics } from './useHaptics';

export interface SwipeProgress {
  distance: number;
  progress: number; // 0-1
  direction: 'left' | 'right' | 'none';
  isActive: boolean;
  hasReachedThreshold: boolean;
  hasReachedDeleteThreshold: boolean;
  velocity: number;
}

export interface SwipeThresholds {
  confirm: number; // Distance to confirm action (default: 60px)
  delete: number;  // Distance to trigger delete (default: 120px)
  hapticStart: number; // Distance to trigger start haptic (default: 10px)
  hapticProgress: number; // Distance to trigger progress haptic (default: 50% of confirm)
}

export interface SwipeGestureConfig {
  thresholds?: Partial<SwipeThresholds>;
  enableHaptics?: boolean;
  enableRubberBand?: boolean;
  maxOverscroll?: number;
  returnAnimationDuration?: number;
  momentumDecay?: number;
  onSwipeStart?: (progress: SwipeProgress) => void;
  onSwipeUpdate?: (progress: SwipeProgress) => void;
  onSwipeEnd?: (progress: SwipeProgress, completed: boolean) => void;
  onSwipeCancel?: (progress: SwipeProgress) => void;
}

export interface SwipeVisualState {
  backgroundColor: string;
  textColor: string;
  iconOpacity: number;
  overlayOpacity: number;
  scale: number;
  brightness: number;
}

export function useEnhancedSwipeGestures(config: SwipeGestureConfig = {}) {
  const {
    thresholds: customThresholds = {},
    enableHaptics = true,
    enableRubberBand = true,
    maxOverscroll = 50,
    returnAnimationDuration = 300,
    momentumDecay = 0.95,
    onSwipeStart,
    onSwipeUpdate,
    onSwipeEnd,
    onSwipeCancel
  } = config;

  const { 
    tapFeedback, 
    pressFeedback, 
    longPressFeedback, 
    errorFeedback,
    warningFeedback,
    isEnabled: hapticsEnabled 
  } = useHaptics();

  const thresholds: SwipeThresholds = {
    confirm: 60,
    delete: 120,
    hapticStart: 10,
    hapticProgress: 30,
    ...customThresholds
  };

  const swipeState = useRef({
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    startTime: 0,
    lastTime: 0,
    velocity: 0,
    direction: 'none' as SwipeProgress['direction'],
    hasTriggeredStart: false,
    hasTriggeredProgress: false,
    hasTriggeredDelete: false,
    momentumAnimationId: null as number | null
  });

  const [progress, setProgress] = useState<SwipeProgress>({
    distance: 0,
    progress: 0,
    direction: 'none',
    isActive: false,
    hasReachedThreshold: false,
    hasReachedDeleteThreshold: false,
    velocity: 0
  });

  const calculateProgress = useCallback((deltaX: number): SwipeProgress => {
    const absDistance = Math.abs(deltaX);
    const direction = deltaX > 0 ? 'right' : deltaX < 0 ? 'left' : 'none';
    
    // Apply rubber band effect for overscroll
    let effectiveDistance = absDistance;
    if (enableRubberBand && absDistance > thresholds.delete) {
      const overscroll = absDistance - thresholds.delete;
      const rubberBandDistance = Math.min(overscroll * 0.4, maxOverscroll);
      effectiveDistance = thresholds.delete + rubberBandDistance;
    }

    const confirmProgress = Math.min(effectiveDistance / thresholds.confirm, 1);
    const deleteProgress = Math.min(effectiveDistance / thresholds.delete, 1);
    
    return {
      distance: effectiveDistance,
      progress: confirmProgress,
      direction,
      isActive: swipeState.current.isActive,
      hasReachedThreshold: effectiveDistance >= thresholds.confirm,
      hasReachedDeleteThreshold: effectiveDistance >= thresholds.delete,
      velocity: swipeState.current.velocity
    };
  }, [thresholds, enableRubberBand, maxOverscroll]);

  const getVisualState = useCallback((progress: SwipeProgress): SwipeVisualState => {
    const { progress: p, hasReachedThreshold, hasReachedDeleteThreshold } = progress;
    
    if (hasReachedDeleteThreshold) {
      // Danger state - ready to delete
      return {
        backgroundColor: 'rgb(239 68 68)', // red-500
        textColor: 'white',
        iconOpacity: 1,
        overlayOpacity: 0.9,
        scale: 1.02,
        brightness: 1.1
      };
    } else if (hasReachedThreshold) {
      // Warning state - confirm threshold reached
      return {
        backgroundColor: 'rgb(245 158 11)', // amber-500
        textColor: 'white',
        iconOpacity: 0.9,
        overlayOpacity: 0.7,
        scale: 1.01,
        brightness: 1.05
      };
    } else if (p > 0.3) {
      // Active state - in progress
      return {
        backgroundColor: `rgb(59 130 246 / ${p * 0.3})`, // blue-500 with alpha
        textColor: 'rgb(30 58 138)', // blue-900
        iconOpacity: p * 0.8,
        overlayOpacity: p * 0.4,
        scale: 1 + (p * 0.01),
        brightness: 1 + (p * 0.02)
      };
    } else {
      // Neutral state
      return {
        backgroundColor: 'transparent',
        textColor: 'rgb(107 114 128)', // gray-500
        iconOpacity: p * 0.5,
        overlayOpacity: 0,
        scale: 1,
        brightness: 1
      };
    }
  }, []);

  const triggerHaptics = useCallback((newProgress: SwipeProgress) => {
    if (!enableHaptics || !hapticsEnabled) return;

    const { distance } = newProgress;
    const { hasTriggeredStart, hasTriggeredProgress, hasTriggeredDelete } = swipeState.current;

    // Start haptic - triggered once at beginning
    if (!hasTriggeredStart && distance >= thresholds.hapticStart) {
      tapFeedback();
      swipeState.current.hasTriggeredStart = true;
    }
    
    // Progress haptic - triggered at 50% threshold
    if (!hasTriggeredProgress && distance >= thresholds.hapticProgress) {
      pressFeedback();
      swipeState.current.hasTriggeredProgress = true;
    }
    
    // Delete threshold haptic - triggered when delete threshold is reached
    if (!hasTriggeredDelete && distance >= thresholds.delete) {
      longPressFeedback();
      swipeState.current.hasTriggeredDelete = true;
    }
  }, [enableHaptics, hapticsEnabled, thresholds, tapFeedback, pressFeedback, longPressFeedback]);

  const updateSwipeProgress = useCallback((deltaX: number, deltaY: number, timestamp: number) => {
    // Calculate velocity
    const timeDelta = timestamp - swipeState.current.lastTime;
    if (timeDelta > 0) {
      const distanceDelta = deltaX - swipeState.current.deltaX;
      swipeState.current.velocity = distanceDelta / timeDelta;
    }

    swipeState.current.deltaX = deltaX;
    swipeState.current.deltaY = deltaY;
    swipeState.current.lastTime = timestamp;

    const newProgress = calculateProgress(deltaX);
    triggerHaptics(newProgress);
    
    setProgress(newProgress);
    onSwipeUpdate?.(newProgress);
  }, [calculateProgress, triggerHaptics, onSwipeUpdate]);

  const startMomentumAnimation = useCallback((initialVelocity: number, currentDelta: number) => {
    if (Math.abs(initialVelocity) < 0.1) return;

    let velocity = initialVelocity;
    let delta = currentDelta;
    
    const animate = () => {
      velocity *= momentumDecay;
      delta += velocity * 16; // Assuming 60fps
      
      if (Math.abs(velocity) < 0.01 || Math.abs(delta) < 1) {
        // Animation complete - return to neutral
        const finalProgress = calculateProgress(0);
        setProgress(finalProgress);
        swipeState.current.momentumAnimationId = null;
        return;
      }
      
      const momentumProgress = calculateProgress(delta);
      setProgress(momentumProgress);
      onSwipeUpdate?.(momentumProgress);
      
      swipeState.current.momentumAnimationId = requestAnimationFrame(animate);
    };
    
    animate();
  }, [momentumDecay, calculateProgress, onSwipeUpdate]);

  const handleSwipeStart = useCallback((clientX: number, clientY: number) => {
    const timestamp = Date.now();
    
    // Cancel any ongoing momentum animation
    if (swipeState.current.momentumAnimationId) {
      cancelAnimationFrame(swipeState.current.momentumAnimationId);
      swipeState.current.momentumAnimationId = null;
    }

    swipeState.current = {
      ...swipeState.current,
      isActive: true,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      deltaX: 0,
      deltaY: 0,
      startTime: timestamp,
      lastTime: timestamp,
      velocity: 0,
      direction: 'none',
      hasTriggeredStart: false,
      hasTriggeredProgress: false,
      hasTriggeredDelete: false
    };

    const startProgress = calculateProgress(0);
    setProgress({ ...startProgress, isActive: true });
    onSwipeStart?.(startProgress);
  }, [calculateProgress, onSwipeStart]);

  const handleSwipeMove = useCallback((clientX: number, clientY: number) => {
    if (!swipeState.current.isActive) return;

    const deltaX = clientX - swipeState.current.startX;
    const deltaY = clientY - swipeState.current.startY;
    const timestamp = Date.now();

    // Determine if this is a horizontal swipe (ignore if too vertical)
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaX) < 20) {
      return; // This is likely a scroll gesture
    }

    swipeState.current.currentX = clientX;
    swipeState.current.currentY = clientY;
    
    updateSwipeProgress(deltaX, deltaY, timestamp);
  }, [updateSwipeProgress]);

  const handleSwipeEnd = useCallback((completed: boolean = false) => {
    if (!swipeState.current.isActive) return;

    const finalProgress = { ...progress, isActive: false };
    const shouldComplete = completed || finalProgress.hasReachedThreshold;

    if (shouldComplete && finalProgress.hasReachedDeleteThreshold) {
      // Delete action
      if (enableHaptics && hapticsEnabled) {
        errorFeedback();
      }
    } else if (shouldComplete) {
      // Confirm action
      if (enableHaptics && hapticsEnabled) {
        warningFeedback();
      }
    }

    // Start momentum animation if there's sufficient velocity
    if (!shouldComplete && Math.abs(swipeState.current.velocity) > 0.5) {
      startMomentumAnimation(swipeState.current.velocity, swipeState.current.deltaX);
    } else {
      // Immediate return to neutral or completion
      const neutralProgress = calculateProgress(shouldComplete ? swipeState.current.deltaX : 0);
      setProgress({ ...neutralProgress, isActive: false });
    }

    swipeState.current.isActive = false;

    if (shouldComplete) {
      onSwipeEnd?.(finalProgress, true);
    } else {
      onSwipeCancel?.(finalProgress);
    }
  }, [progress, enableHaptics, hapticsEnabled, errorFeedback, warningFeedback, startMomentumAnimation, calculateProgress, onSwipeEnd, onSwipeCancel]);

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

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    handleSwipeEnd(false);
  }, [handleSwipeEnd]);

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleSwipeStart(e.clientX, e.clientY);
  }, [handleSwipeStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons === 1) {
      handleSwipeMove(e.clientX, e.clientY);
    }
  }, [handleSwipeMove]);

  const handleMouseUp = useCallback(() => {
    handleSwipeEnd(false);
  }, [handleSwipeEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (swipeState.current.momentumAnimationId) {
        cancelAnimationFrame(swipeState.current.momentumAnimationId);
      }
    };
  }, []);

  return {
    // Progress and state
    progress,
    visualState: getVisualState(progress),
    isActive: progress.isActive,
    
    // Event handlers
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    
    // Manual control
    forceComplete: () => handleSwipeEnd(true),
    forceCancel: () => handleSwipeEnd(false),
    
    // Configuration
    thresholds,
    config: {
      enableHaptics,
      enableRubberBand,
      maxOverscroll,
      returnAnimationDuration,
      momentumDecay
    }
  };
}