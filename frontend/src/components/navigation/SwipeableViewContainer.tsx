import React, { useState, useCallback } from 'react';
import { useSwipeNavigation } from '../../hooks/useSwipeGestures';

interface SwipeableViewContainerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
  className?: string;
}

export const SwipeableViewContainer: React.FC<SwipeableViewContainerProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
  className = '',
}) => {
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const handleSwipeLeft = useCallback(() => {
    setSwipeDirection('left');
    onSwipeLeft?.();
    setTimeout(() => setSwipeDirection(null), 300);
  }, [onSwipeLeft]);

  const handleSwipeRight = useCallback(() => {
    setSwipeDirection('right');
    onSwipeRight?.();
    setTimeout(() => setSwipeDirection(null), 300);
  }, [onSwipeRight]);

  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    disabled,
  });

  return (
    <div 
      {...swipeHandlers}
      className={`relative transition-transform duration-300 ease-out ${
        swipeDirection === 'left' ? 'transform translate-x-1' : ''
      } ${
        swipeDirection === 'right' ? 'transform -translate-x-1' : ''
      } ${className}`}
    >
      {children}
      
      {/* Visual feedback for swipe direction */}
      {swipeDirection && (
        <div className={`absolute top-1/2 transform -translate-y-1/2 pointer-events-none transition-opacity duration-300 ${
          swipeDirection === 'left' ? 'right-4' : 'left-4'
        }`}>
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
            {swipeDirection === 'left' ? '← Vorherige' : 'Nächste →'}
          </div>
        </div>
      )}
    </div>
  );
};