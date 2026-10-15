import React, { useRef, useEffect, useState } from 'react';
import { useMomentumScroll } from '../../hooks/useSwipeGestures';

interface MomentumScrollContainerProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  refreshThreshold?: number;
  loadMoreThreshold?: number;
  className?: string;
  enableRefresh?: boolean;
  enableLoadMore?: boolean;
  refreshing?: boolean;
  loading?: boolean;
}

export const MomentumScrollContainer: React.FC<MomentumScrollContainerProps> = ({
  children,
  onRefresh,
  onLoadMore,
  refreshThreshold = 80,
  loadMoreThreshold = 100,
  className = '',
  enableRefresh = true,
  enableLoadMore = true,
  refreshing = false,
  loading = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const {
    overscrollOffset,
    handleScroll,
    resetOverscroll,
  } = useMomentumScroll({
    onOverscrollTop: () => {
      if (enableRefresh && !refreshing && pullDistance > refreshThreshold) {
        setIsRefreshing(true);
        onRefresh?.();
      }
    },
    onOverscrollBottom: () => {
      if (enableLoadMore && !loading) {
        onLoadMore?.();
      }
    },
    elasticity: 0.3,
  });

  useEffect(() => {
    if (!refreshing && isRefreshing) {
      setIsRefreshing(false);
      setPullDistance(0);
      resetOverscroll();
    }
  }, [refreshing, isRefreshing, resetOverscroll]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      isDragging = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !enableRefresh) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      
      // Only handle pull-to-refresh at the top
      if (container.scrollTop === 0 && deltaY > 0) {
        e.preventDefault();
        const distance = Math.min(deltaY * 0.5, refreshThreshold * 1.5);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = () => {
      isDragging = false;
      
      if (pullDistance > refreshThreshold && enableRefresh && !refreshing) {
        setIsRefreshing(true);
        onRefresh?.();
      } else {
        setPullDistance(0);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const preventDefault = handleScroll(container, e.deltaY);
      if (preventDefault) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleScroll, enableRefresh, refreshing, pullDistance, refreshThreshold, onRefresh]);

  const refreshProgress = Math.min(pullDistance / refreshThreshold, 1);
  const shouldShowRefreshIndicator = pullDistance > 0 || isRefreshing || refreshing;

  return (
    <div className={`relative ${className}`}>
      {/* Pull-to-Refresh Indicator */}
      {enableRefresh && shouldShowRefreshIndicator && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-blue-50 border-b border-blue-200 transition-all duration-200 z-10"
          style={{
            height: Math.max(0, pullDistance),
            transform: `translateY(-${Math.max(0, refreshThreshold - pullDistance)}px)`,
          }}
        >
          <div className="flex items-center gap-2 text-blue-600">
            <div 
              className={`w-6 h-6 border-2 border-blue-600 rounded-full transition-transform duration-200 ${
                isRefreshing || refreshing 
                  ? 'animate-spin border-t-transparent' 
                  : refreshProgress >= 1 
                    ? 'rotate-180' 
                    : ''
              }`}
              style={{
                transform: `rotate(${refreshProgress * 180}deg)`,
              }}
            >
              {!isRefreshing && !refreshing && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-blue-600" />
                </div>
              )}
            </div>
            <span className="text-sm font-medium">
              {isRefreshing || refreshing 
                ? 'Aktualisiert...' 
                : refreshProgress >= 1 
                  ? 'Loslassen zum Aktualisieren' 
                  : 'Zum Aktualisieren ziehen'
              }
            </span>
          </div>
        </div>
      )}

      {/* Scroll Container */}
      <div
        ref={containerRef}
        className="h-full overflow-auto"
        style={{
          transform: `translateY(${overscrollOffset}px)`,
          paddingTop: shouldShowRefreshIndicator ? Math.max(0, pullDistance) : 0,
        }}
      >
        {children}
        
        {/* Load More Indicator */}
        {enableLoadMore && loading && (
          <div className="flex items-center justify-center py-4 text-gray-500">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin mr-2" />
            <span>Lade mehr...</span>
          </div>
        )}
      </div>

      {/* Rubber Band Effect Overlay */}
      {overscrollOffset !== 0 && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: overscrollOffset > 0 
              ? `linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 0%, transparent 20%)`
              : `linear-gradient(to top, rgba(59, 130, 246, 0.1) 0%, transparent 20%)`,
          }}
        />
      )}
    </div>
  );
};