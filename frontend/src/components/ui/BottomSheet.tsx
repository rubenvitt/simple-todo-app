import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSpring, animated, config } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

export type BottomSheetSize = 'auto' | 'half' | 'full';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: BottomSheetSize;
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnSwipeDown?: boolean;
  className?: string;
  snapPoints?: number[];
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  size = 'auto',
  children,
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnSwipeDown = true,
  className = '',
  snapPoints = [0.25, 0.5, 0.9],
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentSnapPoint, setCurrentSnapPoint] = useState(0);

  // Calculate sheet height based on size
  const getSheetHeight = () => {
    const vh = window.innerHeight;
    switch (size) {
      case 'half':
        return vh * 0.5;
      case 'full':
        return vh * 0.9;
      case 'auto':
      default:
        return 'auto';
    }
  };

  // Backdrop animation
  const [backdropSpring, backdropApi] = useSpring(() => ({
    opacity: 0,
    config: config.default,
  }));

  // Sheet animation
  const [sheetSpring, sheetApi] = useSpring(() => ({
    y: window.innerHeight,
    config: config.default,
  }));

  // Animate in/out based on open state
  useEffect(() => {
    if (open) {
      // Animate in
      backdropApi.start({ opacity: 1 });
      sheetApi.start({ y: 0 });
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      // Animate out
      backdropApi.start({ opacity: 0 });
      sheetApi.start({ y: window.innerHeight });
      
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [open, backdropApi, sheetApi]);

  // Handle close with animation
  const handleClose = useCallback(() => {
    backdropApi.start({ 
      opacity: 0,
      config: { ...config.default, duration: 200 }
    });
    sheetApi.start({ 
      y: window.innerHeight,
      config: { ...config.default, duration: 300 }
    });
    
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose, backdropApi, sheetApi]);

  // Drag gesture for swipe-to-dismiss
  const bind = useDrag(
    ({ down, movement: [, my], velocity: [, vy], direction: [, dy], cancel }) => {
      // Only allow downward swipes to close
      if (!closeOnSwipeDown) return;

      setIsDragging(down);

      // If dragging down and past threshold, close
      if (my > 100 && dy > 0) {
        cancel();
        handleClose();
        return;
      }

      // If released with enough velocity downward, close
      if (!down && vy > 0.5 && dy > 0) {
        handleClose();
        return;
      }

      // Update sheet position during drag
      if (down) {
        const dampedMovement = my > 0 ? my * 0.8 : my * 0.1; // Less resistance when dragging down
        sheetApi.start({ 
          y: Math.max(0, dampedMovement),
          immediate: true,
          config: { tension: 300, friction: 30 }
        });
      } else {
        // Snap back to position
        sheetApi.start({ 
          y: 0,
          config: config.wobbly
        });
      }
    },
    {
      axis: 'y',
      bounds: { top: -50 },
      rubberband: true,
      filterTaps: true,
    }
  );

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      handleClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, handleClose]);

  // Don't render if not open
  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <animated.div
        style={backdropSpring}
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      {/* Bottom Sheet */}
      <animated.div
        ref={sheetRef}
        style={{
          ...sheetSpring,
          height: getSheetHeight(),
        }}
        className={`relative w-full bg-white rounded-t-3xl shadow-2xl ${className}`}
        {...(closeOnSwipeDown ? bind() : {})}
      >
        {/* Handle/Drag indicator */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">
              {title || ''}
            </h2>
            {showCloseButton && (
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              />
            )}
          </div>
        )}

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto px-6 py-4"
          style={{
            maxHeight: size === 'auto' ? '80vh' : undefined,
          }}
        >
          {children}
        </div>

        {/* Safe area padding for iOS */}
        <div className="h-safe-area-inset-bottom" />
      </animated.div>
    </div>
  );

  // Render using portal
  return createPortal(content, document.body);
};

// Hook for bottom sheet state management
export const useBottomSheet = (initialOpen = false) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
};