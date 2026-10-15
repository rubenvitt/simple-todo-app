import React, { useState, useRef, useEffect } from 'react';
import { DeleteOutlined, CheckOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useEnhancedSwipeGestures, SwipeGestureConfig } from '../../hooks/useEnhancedSwipeGestures';
import { useMobileDetection } from '../../hooks';

export interface SwipeAction {
  type: 'delete' | 'confirm' | 'edit' | 'archive' | 'custom';
  label: string;
  icon?: React.ReactNode;
  color?: string;
  onAction?: () => void;
}

export interface SwipeGestureEnhancerProps {
  children: React.ReactNode;
  
  // Actions configuration
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  
  // Swipe configuration
  swipeConfig?: SwipeGestureConfig;
  
  // Visual customization
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  
  // Animation preferences
  reducedMotion?: boolean;
  animationIntensity?: 'subtle' | 'normal' | 'enhanced';
  
  // Callbacks
  onSwipeStart?: () => void;
  onSwipeComplete?: (action: SwipeAction, direction: 'left' | 'right') => void;
  onSwipeCancel?: () => void;
}

const defaultActions: Record<SwipeAction['type'], SwipeAction> = {
  delete: {
    type: 'delete',
    label: 'Delete',
    icon: <DeleteOutlined />,
    color: 'rgb(239 68 68)' // red-500
  },
  confirm: {
    type: 'confirm',
    label: 'Complete',
    icon: <CheckOutlined />,
    color: 'rgb(34 197 94)' // green-500
  },
  edit: {
    type: 'edit',
    label: 'Edit',
    icon: <ArrowRightOutlined />,
    color: 'rgb(59 130 246)' // blue-500
  },
  archive: {
    type: 'archive',
    label: 'Archive',
    icon: <ArrowRightOutlined />,
    color: 'rgb(107 114 128)' // gray-500
  },
  custom: {
    type: 'custom',
    label: 'Action',
    icon: <ArrowRightOutlined />,
    color: 'rgb(168 85 247)' // purple-500
  }
};

export const SwipeGestureEnhancer: React.FC<SwipeGestureEnhancerProps> = ({
  children,
  leftAction,
  rightAction = defaultActions.delete,
  swipeConfig = {},
  className = '',
  style = {},
  disabled = false,
  reducedMotion = false,
  animationIntensity = 'normal',
  onSwipeStart,
  onSwipeComplete,
  onSwipeCancel
}) => {
  const { isMobile } = useMobileDetection();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  // Enhanced swipe gesture hook
  const {
    progress,
    visualState,
    isActive,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    forceComplete,
    forceCancel
  } = useEnhancedSwipeGestures({
    ...swipeConfig,
    onSwipeStart: (swipeProgress) => {
      onSwipeStart?.();
      swipeConfig?.onSwipeStart?.(swipeProgress);
    },
    onSwipeEnd: (swipeProgress, completed) => {
      if (completed) {
        handleSwipeComplete(swipeProgress.direction);
      }
      swipeConfig?.onSwipeEnd?.(swipeProgress, completed);
    },
    onSwipeCancel: (swipeProgress) => {
      onSwipeCancel?.();
      swipeConfig?.onSwipeCancel?.(swipeProgress);
    }
  });

  const handleSwipeComplete = (direction: 'left' | 'right' | 'none') => {
    if (direction === 'left' && leftAction) {
      leftAction.onAction?.();
      onSwipeComplete?.(leftAction, 'left');
      
      // Animate out if it's a destructive action
      if (leftAction.type === 'delete' || leftAction.type === 'archive') {
        animateOut();
      }
    } else if (direction === 'right' && rightAction) {
      rightAction.onAction?.();
      onSwipeComplete?.(rightAction, 'right');
      
      // Animate out if it's a destructive action
      if (rightAction.type === 'delete' || rightAction.type === 'archive') {
        animateOut();
      }
    }
  };

  const animateOut = () => {
    setIsVisible(false);
    // Remove from DOM after animation
    setTimeout(() => {
      setIsVisible(true); // Reset for demo purposes
    }, 500);
  };

  const getActionForDirection = (direction: 'left' | 'right' | 'none') => {
    if (direction === 'left') return leftAction;
    if (direction === 'right') return rightAction;
    return null;
  };

  const currentAction = getActionForDirection(progress.direction);

  // Calculate transform values for GPU acceleration
  const getTransformStyle = () => {
    if (disabled || reducedMotion) return {};
    
    const { distance, direction, progress: p } = progress;
    const multiplier = direction === 'left' ? -1 : 1;
    const translateX = distance * multiplier;
    
    // Apply animation intensity scaling
    const intensityMap = {
      subtle: 0.7,
      normal: 1,
      enhanced: 1.3
    };
    const scale = 1 + (p * 0.02 * intensityMap[animationIntensity]);
    const rotateZ = p * 2 * intensityMap[animationIntensity];
    
    return {
      transform: `translateX(${translateX}px) scale(${scale}) rotateZ(${rotateZ}deg)`,
      transition: isActive ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    };
  };

  // Background action indicator styles
  const getBackgroundStyle = () => {
    if (!currentAction || disabled) return {};
    
    const { progress: p, hasReachedThreshold, hasReachedDeleteThreshold } = progress;
    const actionColor = currentAction.color || defaultActions[currentAction.type].color;
    
    let backgroundColor = actionColor;
    let opacity = p * 0.8;
    
    if (hasReachedDeleteThreshold) {
      opacity = 0.95;
      backgroundColor = 'rgb(239 68 68)'; // Force red for delete threshold
    } else if (hasReachedThreshold) {
      opacity = 0.8;
    }
    
    return {
      backgroundColor: `${backgroundColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
      transition: isActive ? 'none' : 'background-color 0.2s ease-out'
    };
  };

  // Action icon styles
  const getActionIconStyle = () => {
    if (!currentAction || disabled) return { opacity: 0 };
    
    const { progress: p, direction } = progress;
    const isLeft = direction === 'left';
    
    return {
      opacity: Math.min(p * 2, 1),
      transform: `scale(${Math.min(p * 2, 1.2)})`,
      transition: isActive ? 'none' : 'all 0.2s ease-out',
      [isLeft ? 'right' : 'left']: '20px'
    };
  };

  if (disabled) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        ...style,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.8)',
        transition: 'opacity 0.3s ease, transform 0.3s ease'
      }}
    >
      {/* Background Action Indicator */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={getBackgroundStyle()}
      >
        {currentAction && (
          <div
            className="absolute text-white font-medium text-lg flex items-center gap-2"
            style={getActionIconStyle()}
          >
            <span className="text-2xl">
              {currentAction.icon || defaultActions[currentAction.type].icon}
            </span>
            <span>{currentAction.label}</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div
        className="relative z-10 bg-white dark:bg-gray-800"
        style={{
          ...getTransformStyle(),
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          perspective: '1000px'
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={isMobile ? undefined : onMouseDown}
        onMouseMove={isMobile ? undefined : onMouseMove}
        onMouseUp={isMobile ? undefined : onMouseUp}
        onMouseLeave={isMobile ? undefined : onMouseUp}
      >
        {children}
      </div>

      {/* Progress Indicator */}
      {isActive && progress.progress > 0.1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 pointer-events-none">
          <div
            className="h-full transition-all duration-100 ease-out"
            style={{
              width: `${Math.min(progress.progress * 100, 100)}%`,
              backgroundColor: visualState.backgroundColor || 'rgb(59 130 246)',
              boxShadow: progress.hasReachedThreshold ? '0 0 8px rgba(59, 130, 246, 0.6)' : 'none'
            }}
          />
        </div>
      )}

      {/* Delete Threshold Indicator */}
      {isActive && progress.hasReachedDeleteThreshold && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 border-2 border-red-500 rounded animate-pulse" />
        </div>
      )}
    </div>
  );
};