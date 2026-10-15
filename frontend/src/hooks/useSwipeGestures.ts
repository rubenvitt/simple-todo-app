import { useSwipeable } from 'react-swipeable';
import { useState, useCallback } from 'react';

export interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  delta?: number;
  preventScrollOnSwipe?: boolean;
  trackMouse?: boolean;
  trackTouch?: boolean;
  rotationAngle?: number;
}

export interface SwipeToDeleteConfig {
  onDelete: () => void;
  onCancel?: () => void;
  threshold?: number;
  deleteThreshold?: number;
  direction?: 'left' | 'right';
}

// Hook für basic Swipe-Gesten
export const useSwipeGestures = (config: SwipeConfig) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    delta = 10,
    preventScrollOnSwipe = false,
    trackMouse = false,
    trackTouch = true,
    rotationAngle = 0,
  } = config;

  return useSwipeable({
    onSwipedLeft: onSwipeLeft,
    onSwipedRight: onSwipeRight,
    onSwipedUp: onSwipeUp,
    onSwipedDown: onSwipeDown,
    delta,
    preventScrollOnSwipe,
    trackMouse,
    trackTouch,
    rotationAngle,
    swipeDuration: 300,
    touchEventOptions: { passive: false },
  });
};

// Hook für Swipe-to-Delete mit visueller Rückmeldung
export const useSwipeToDelete = (config: SwipeToDeleteConfig) => {
  const {
    onDelete,
    onCancel,
    threshold = 50,
    deleteThreshold = 120,
    direction = 'left',
  } = config;

  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetSwipe = useCallback(() => {
    setSwipeOffset(0);
    setIsDeleting(false);
  }, []);

  const handleSwipeMove = useCallback((deltaX: number) => {
    const offset = direction === 'left' ? -deltaX : deltaX;
    
    // Nur in die richtige Richtung swipen
    if (offset > 0) {
      const clampedOffset = Math.min(offset, deleteThreshold + 20);
      setSwipeOffset(clampedOffset);
      
      // Deletion-Modus aktivieren wenn Threshold erreicht
      if (clampedOffset >= deleteThreshold && !isDeleting) {
        setIsDeleting(true);
        // Haptisches Feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      } else if (clampedOffset < deleteThreshold && isDeleting) {
        setIsDeleting(false);
      }
    }
  }, [direction, deleteThreshold, isDeleting]);

  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      if (direction === 'left' && eventData.deltaX < 0) {
        handleSwipeMove(Math.abs(eventData.deltaX));
      } else if (direction === 'right' && eventData.deltaX > 0) {
        handleSwipeMove(eventData.deltaX);
      }
    },
    onSwipedLeft: () => {
      if (direction === 'left') {
        if (swipeOffset >= deleteThreshold) {
          onDelete();
        } else {
          resetSwipe();
          onCancel?.();
        }
      }
    },
    onSwipedRight: () => {
      if (direction === 'right') {
        if (swipeOffset >= deleteThreshold) {
          onDelete();
        } else {
          resetSwipe();
          onCancel?.();
        }
      }
    },
    onTouchEndOrOnMouseUp: () => {
      if (swipeOffset > 0 && swipeOffset < deleteThreshold) {
        resetSwipe();
        onCancel?.();
      }
    },
    delta: 10,
    preventScrollOnSwipe: true,
    trackMouse: false,
    trackTouch: true,
    touchEventOptions: { passive: false },
  });

  return {
    swipeHandlers,
    swipeOffset,
    isDeleting,
    resetSwipe,
    deleteProgress: Math.min(swipeOffset / deleteThreshold, 1),
  };
};

// Hook für Navigation zwischen Views
export const useSwipeNavigation = (config: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
}) => {
  const { onSwipeLeft, onSwipeRight, disabled = false } = config;

  return useSwipeable({
    onSwipedLeft: disabled ? undefined : onSwipeLeft,
    onSwipedRight: disabled ? undefined : onSwipeRight,
    delta: 80, // Höhere Threshold für Navigation
    preventScrollOnSwipe: false, // Scrolling erlauben
    trackMouse: false,
    trackTouch: true,
    swipeDuration: 500, // Längere Dauer für Navigation
    touchEventOptions: { passive: true },
  });
};

// Hook für Momentum-Scrolling mit Rubber-Band Effekt
export const useMomentumScroll = (config: {
  onOverscrollTop?: () => void;
  onOverscrollBottom?: () => void;
  elasticity?: number;
}) => {
  const { onOverscrollTop, onOverscrollBottom, elasticity = 0.3 } = config;
  const [overscrollOffset, setOverscrollOffset] = useState(0);

  const handleScroll = useCallback((element: HTMLElement, deltaY: number) => {
    const { scrollTop, scrollHeight, clientHeight } = element;
    
    // Top overscroll
    if (scrollTop <= 0 && deltaY < 0) {
      const offset = Math.abs(deltaY) * elasticity;
      setOverscrollOffset(-offset);
      onOverscrollTop?.();
      return true; // Prevent default scroll
    }
    
    // Bottom overscroll
    if (scrollTop + clientHeight >= scrollHeight && deltaY > 0) {
      const offset = deltaY * elasticity;
      setOverscrollOffset(offset);
      onOverscrollBottom?.();
      return true; // Prevent default scroll
    }

    // Reset overscroll
    if (overscrollOffset !== 0) {
      setOverscrollOffset(0);
    }
    
    return false; // Allow default scroll
  }, [elasticity, onOverscrollTop, onOverscrollBottom, overscrollOffset]);

  return {
    overscrollOffset,
    handleScroll,
    resetOverscroll: () => setOverscrollOffset(0),
  };
};