/**
 * Page Transitions with Mobile Gesture Handling
 * 
 * Implements smooth page transitions that respond to:
 * - Swipe gestures for navigation
 * - Browser back/forward buttons
 * - Route changes
 * - Interrupted gestures
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { getTransition, getDeviceCapabilities } from '../../config/motion';

// Page transition variants
const pageTransitionVariants = {
  // Slide transitions
  slideLeft: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 }
  },
  
  slideRight: {
    initial: { x: '-100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 }
  },

  slideUp: {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '-100%', opacity: 0 }
  },

  slideDown: {
    initial: { y: '-100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 }
  },

  // Fade transition
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },

  // Scale transition
  scale: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.1 }
  }
};

// Route hierarchy for determining transition direction
const routeHierarchy: Record<string, number> = {
  '/': 0,
  '/lists': 1,
  '/lists/:id': 2,
  '/profile': 1,
  '/settings': 1,
  '/login': 0,
  '/register': 0
};

// Get route depth for transition direction
const getRouteDepth = (pathname: string): number => {
  // Exact match first
  if (routeHierarchy[pathname] !== undefined) {
    return routeHierarchy[pathname];
  }
  
  // Pattern matching for dynamic routes
  if (pathname.startsWith('/lists/') && pathname.split('/').length === 3) {
    return routeHierarchy['/lists/:id'];
  }
  
  // Default depth based on path segments
  return pathname.split('/').filter(segment => segment).length;
};

// Determine transition type based on navigation
const getTransitionType = (fromPath: string, toPath: string, isBack: boolean) => {
  const capabilities = getDeviceCapabilities();
  
  // Use simple fade for reduced motion
  if (capabilities.shouldUseReducedAnimations) {
    return 'fade';
  }

  // Handle back navigation
  if (isBack) {
    return 'slideRight';
  }

  const fromDepth = getRouteDepth(fromPath);
  const toDepth = getRouteDepth(toPath);

  // Going deeper in hierarchy
  if (toDepth > fromDepth) {
    return 'slideLeft';
  }
  
  // Going up in hierarchy
  if (toDepth < fromDepth) {
    return 'slideRight';
  }

  // Same level - use fade
  return 'fade';
};

// Page transition wrapper component
interface PageTransitionWrapperProps {
  children: React.ReactNode;
  className?: string;
  enableGestures?: boolean;
}

export const PageTransitionWrapper: React.FC<PageTransitionWrapperProps> = ({
  children,
  className = '',
  enableGestures = true
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const controls = useAnimation();
  const constraintsRef = useRef(null);
  
  const [isBack, setIsBack] = useState(false);
  const [previousPath, setPreviousPath] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Track navigation direction
  useEffect(() => {
    const handlePopState = () => {
      setIsBack(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Reset back flag after transition
  useEffect(() => {
    if (isBack) {
      const timer = setTimeout(() => setIsBack(false), 100);
      return () => clearTimeout(timer);
    }
  }, [isBack]);

  // Update previous path
  useEffect(() => {
    setPreviousPath(location.pathname);
  }, [location.pathname]);

  // Get transition variant
  const transitionType = getTransitionType(previousPath, location.pathname, isBack);
  const variants = pageTransitionVariants[transitionType as keyof typeof pageTransitionVariants];

  // Gesture handlers for swipe navigation
  const handleDragStart = () => {
    if (!enableGestures) return;
    setIsDragging(true);
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!enableGestures) return;
    
    // Limit drag to horizontal movement for back navigation
    if (Math.abs(info.offset.x) > Math.abs(info.offset.y) && info.offset.x > 50) {
      // Visual feedback during drag
      controls.set({ x: Math.min(info.offset.x * 0.3, 100) });
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!enableGestures) return;
    
    setIsDragging(false);
    
    // Determine if gesture should trigger navigation
    const shouldNavigateBack = info.offset.x > 100 && info.velocity.x > 500;
    
    if (shouldNavigateBack && window.history.length > 1) {
      // Trigger back navigation
      setIsBack(true);
      navigate(-1);
    } else {
      // Snap back to original position
      controls.start({
        x: 0,
        transition: getTransition('quick')
      });
    }
  };

  return (
    <div ref={constraintsRef} className="relative overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={getTransition('smooth')}
          drag={enableGestures ? "x" : false}
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          animate={controls}
          className={`${className} ${isDragging ? 'cursor-grabbing' : ''}`}
          style={{
            willChange: 'transform, opacity',
            touchAction: 'pan-y', // Allow vertical scrolling
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Route transition component with automatic detection
interface RouteTransitionProps {
  children: React.ReactNode;
  transitionKey?: string;
  className?: string;
  enableGestures?: boolean;
}

export const RouteTransition: React.FC<RouteTransitionProps> = ({
  children,
  transitionKey,
  className = '',
  enableGestures = true
}) => {
  const location = useLocation();
  const key = transitionKey || location.pathname;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        initial={{ opacity: 0, x: 100 }}
        animate={{ 
          opacity: 1, 
          x: 0,
          transition: getTransition('smooth')
        }}
        exit={{ 
          opacity: 0, 
          x: -50,
          transition: getTransition('quick')
        }}
        className={className}
        style={{
          willChange: 'transform, opacity'
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Modal transition component
interface ModalTransitionProps {
  isOpen: boolean;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const ModalTransition: React.FC<ModalTransitionProps> = ({
  isOpen,
  children,
  onClose,
  className = ''
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={getTransition('standard')}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
            style={{ willChange: 'opacity' }}
          />
          
          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 100 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              transition: getTransition('standard')
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.9, 
              y: 50,
              transition: getTransition('quick')
            }}
            className={`fixed inset-x-4 top-1/2 transform -translate-y-1/2 z-50 ${className}`}
            style={{
              willChange: 'transform, opacity'
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Bottom sheet transition (mobile-specific)
interface BottomSheetTransitionProps {
  isOpen: boolean;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const BottomSheetTransition: React.FC<BottomSheetTransitionProps> = ({
  isOpen,
  children,
  onClose,
  className = ''
}) => {
  const controls = useAnimation();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    // Close if dragged down significantly
    if (info.offset.y > 150 || info.velocity.y > 500) {
      onClose?.();
    } else {
      // Snap back to open position
      controls.start({
        y: 0,
        transition: getTransition('quick')
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={getTransition('standard')}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
            style={{ willChange: 'opacity' }}
          />
          
          {/* Bottom sheet content */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ 
              y: 0,
              transition: getTransition('smooth')
            }}
            exit={{ 
              y: '100%',
              transition: getTransition('quick')
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            animate={controls}
            className={`fixed inset-x-0 bottom-0 z-50 ${className} ${isDragging ? 'cursor-grabbing' : ''}`}
            style={{
              willChange: 'transform',
              touchAction: 'none'
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-2">
              <div className="w-8 h-1 bg-gray-300 rounded-full" />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Page stack for complex navigation
interface PageStackProps {
  pages: React.ReactNode[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  className?: string;
}

export const PageStack: React.FC<PageStackProps> = ({
  pages,
  currentIndex,
  onNavigate,
  className = ''
}) => {
  const [dragStartX, setDragStartX] = useState(0);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    const velocity = 500;
    
    if (info.offset.x > threshold && info.velocity.x > velocity && currentIndex > 0) {
      // Navigate back
      onNavigate(currentIndex - 1);
    } else if (info.offset.x < -threshold && info.velocity.x < -velocity && currentIndex < pages.length - 1) {
      // Navigate forward
      onNavigate(currentIndex + 1);
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ x: dragStartX > 0 ? '100%' : '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: dragStartX > 0 ? '-100%' : '100%', opacity: 0 }}
          transition={getTransition('smooth')}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragStart={(event, info) => setDragStartX(info.point.x)}
          onDragEnd={handleDragEnd}
          style={{
            willChange: 'transform, opacity'
          }}
        >
          {pages[currentIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Export transition utilities
export const transitionUtils = {
  getTransitionType,
  getRouteDepth,
  routeHierarchy
};