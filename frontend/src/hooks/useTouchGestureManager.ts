import { useRef, useCallback, useState, useEffect } from 'react';

export interface TouchGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onDragStart?: () => void;
  onDragMove?: (deltaX: number, deltaY: number) => void;
  onDragEnd?: () => void;
  swipeThreshold?: number;
  dragThreshold?: number;
  gestureTimeout?: number;
  enableHaptics?: boolean;
  disabled?: boolean;
}

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export type GestureState = 
  | 'IDLE'
  | 'TOUCH_START'
  | 'SWIPE_DETECTED'
  | 'DRAG_DETECTED'
  | 'GESTURE_ACTIVE'
  | 'GESTURE_END';

export interface GestureData {
  state: GestureState;
  startPoint: TouchPoint | null;
  currentPoint: TouchPoint | null;
  deltaX: number;
  deltaY: number;
  distance: number;
  velocity: number;
  direction: 'horizontal' | 'vertical' | null;
  isSwipe: boolean;
  isDrag: boolean;
}

const GESTURE_DETECTION_TIME = 100; // ms
const MIN_SWIPE_VELOCITY = 0.3; // px/ms
const MIN_SWIPE_DISTANCE = 30; // px
const MIN_DRAG_DISTANCE = 8; // px

export const useTouchGestureManager = (config: TouchGestureConfig) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onDragStart,
    onDragMove,
    onDragEnd,
    swipeThreshold = MIN_SWIPE_DISTANCE,
    dragThreshold = MIN_DRAG_DISTANCE,
    gestureTimeout = 500,
    enableHaptics = true,
    disabled = false,
  } = config;

  const [gestureData, setGestureData] = useState<GestureData>({
    state: 'IDLE',
    startPoint: null,
    currentPoint: null,
    deltaX: 0,
    deltaY: 0,
    distance: 0,
    velocity: 0,
    direction: null,
    isSwipe: false,
    isDrag: false,
  });

  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const frameRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  // Haptic feedback utility
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (enableHaptics && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, [enableHaptics]);

  // Calculate gesture metrics
  const calculateGestureMetrics = useCallback((start: TouchPoint, current: TouchPoint) => {
    const deltaX = current.x - start.x;
    const deltaY = current.y - start.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const timeDelta = current.timestamp - start.timestamp;
    const velocity = timeDelta > 0 ? distance / timeDelta : 0;

    let direction: 'horizontal' | 'vertical' | null = null;
    if (distance > 5) { // Minimum distance to determine direction
      direction = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }

    return {
      deltaX,
      deltaY,
      distance,
      velocity,
      direction,
    };
  }, []);

  // Determine gesture type based on movement
  const determineGestureType = useCallback((
    deltaX: number,
    deltaY: number,
    distance: number,
    velocity: number,
    direction: 'horizontal' | 'vertical' | null,
    timeDelta: number
  ) => {
    // Quick horizontal movement = swipe
    if (
      direction === 'horizontal' &&
      Math.abs(deltaX) >= swipeThreshold &&
      Math.abs(deltaY) < 15 && // Minimal vertical movement
      velocity >= MIN_SWIPE_VELOCITY &&
      timeDelta < 300 // Fast movement
    ) {
      return 'swipe';
    }

    // Any significant movement = potential drag
    if (distance >= dragThreshold) {
      return 'drag';
    }

    return null;
  }, [swipeThreshold, dragThreshold]);

  // Reset gesture state
  const resetGesture = useCallback(() => {
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = null;
    }

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    setGestureData({
      state: 'IDLE',
      startPoint: null,
      currentPoint: null,
      deltaX: 0,
      deltaY: 0,
      distance: 0,
      velocity: 0,
      direction: null,
      isSwipe: false,
      isDrag: false,
    });
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (disabled) return;

    const touch = event.touches[0];
    const startPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    setGestureData(prev => ({
      ...prev,
      state: 'TOUCH_START',
      startPoint,
      currentPoint: startPoint,
    }));

    // Set timeout to reset if no clear gesture is detected
    gestureTimeoutRef.current = setTimeout(() => {
      resetGesture();
    }, gestureTimeout);

  }, [disabled, gestureTimeout, resetGesture]);

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (disabled || !gestureData.startPoint) return;

    const touch = event.touches[0];
    const currentPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    };

    const metrics = calculateGestureMetrics(gestureData.startPoint, currentPoint);
    const timeDelta = currentPoint.timestamp - gestureData.startPoint.timestamp;

    // Use requestAnimationFrame to throttle updates
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      const gestureType = determineGestureType(
        metrics.deltaX,
        metrics.deltaY,
        metrics.distance,
        metrics.velocity,
        metrics.direction,
        timeDelta
      );

      let newState = gestureData.state;
      let isSwipe = false;
      let isDrag = false;

      if (gestureType === 'swipe' && gestureData.state !== 'SWIPE_DETECTED') {
        newState = 'SWIPE_DETECTED';
        isSwipe = true;
        triggerHaptic(30); // Light haptic for swipe detection
        
        // Prevent scrolling for horizontal swipes
        if (metrics.direction === 'horizontal') {
          event.preventDefault();
        }
      } else if (gestureType === 'drag' && gestureData.state !== 'DRAG_DETECTED') {
        newState = 'DRAG_DETECTED';
        isDrag = true;
        triggerHaptic(50); // Medium haptic for drag detection
        onDragStart?.();
        
        // Prevent default for drag gestures
        event.preventDefault();
      }

      if (gestureData.state === 'DRAG_DETECTED' || isDrag) {
        onDragMove?.(metrics.deltaX, metrics.deltaY);
        newState = 'GESTURE_ACTIVE';
      }

      setGestureData({
        state: newState,
        startPoint: gestureData.startPoint,
        currentPoint,
        deltaX: metrics.deltaX,
        deltaY: metrics.deltaY,
        distance: metrics.distance,
        velocity: metrics.velocity,
        direction: metrics.direction,
        isSwipe,
        isDrag: isDrag || gestureData.isDrag,
      });
    });

  }, [
    disabled,
    gestureData.startPoint,
    gestureData.state,
    gestureData.isDrag,
    calculateGestureMetrics,
    determineGestureType,
    triggerHaptic,
    onDragStart,
    onDragMove,
  ]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (disabled || !gestureData.startPoint) return;

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const finalGestureData = { ...gestureData };

    // Handle swipe gestures
    if (finalGestureData.isSwipe && finalGestureData.direction === 'horizontal') {
      if (finalGestureData.deltaX > 0) {
        onSwipeRight?.();
        triggerHaptic([50, 50]); // Double haptic for successful swipe
      } else {
        onSwipeLeft?.();
        triggerHaptic([50, 50]);
      }
    }

    // Handle drag end
    if (finalGestureData.isDrag) {
      onDragEnd?.();
      triggerHaptic(30); // Light haptic for drag end
    }

    // Reset gesture state
    setTimeout(resetGesture, 0);

  }, [
    disabled,
    gestureData,
    onSwipeLeft,
    onSwipeRight,
    onDragEnd,
    triggerHaptic,
    resetGesture,
  ]);

  // Create event handlers
  const eventHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: resetGesture,
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return {
    gestureData,
    eventHandlers,
    resetGesture,
    setElementRef: (element: HTMLElement | null) => {
      elementRef.current = element;
    },
  };
};