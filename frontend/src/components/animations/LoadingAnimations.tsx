/**
 * Loading Animations and Skeleton Screens
 * Optimized for mobile performance with GPU acceleration
 */

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { getTransition, createMobileSafeAnimation } from '../../config/motion';

// Spinner Animations
export const SpinnerVariants = {
  spin: {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }
    }
  },
  
  pulse: {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [1, 0.5, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  },

  dots: {
    animate: {
      y: [-10, 0, -10],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }
};

// Shimmer Animation for Skeleton Screens
const shimmerVariants = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Basic Spinner Component
interface SpinnerProps {
  size?: number;
  color?: string;
  variant?: keyof typeof SpinnerVariants;
}

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 24, 
  color = 'currentColor',
  variant = 'spin'
}) => {
  const spinnerVariant = SpinnerVariants[variant];

  if (variant === 'dots') {
    return (
      <div className="flex space-x-1" style={{ width: size * 2, height: size }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            variants={spinnerVariant}
            animate="animate"
            style={{
              width: size / 4,
              height: size / 4,
              backgroundColor: color,
              borderRadius: '50%',
              willChange: 'transform'
            }}
            transition={{
              delay: i * 0.2,
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={spinnerVariant}
      animate="animate"
      style={{
        width: size,
        height: size,
        border: `2px solid transparent`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        willChange: 'transform'
      }}
    />
  );
};

// Progress Bar Animation
interface ProgressBarProps {
  progress: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 4,
  color = '#1890ff',
  backgroundColor = '#f0f0f0',
  animated = true
}) => {
  return (
    <div
      style={{
        width: '100%',
        height,
        backgroundColor,
        borderRadius: height / 2,
        overflow: 'hidden'
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ 
          width: `${Math.min(Math.max(progress, 0), 100)}%`,
          transition: animated ? getTransition('smooth') : { duration: 0 }
        }}
        style={{
          height: '100%',
          backgroundColor: color,
          borderRadius: height / 2,
          willChange: 'width'
        }}
      />
    </div>
  );
};

// Skeleton Base Component
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  animated?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  className = '',
  animated = true
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded ${className}`}
      style={{
        width,
        height,
        backgroundColor: '#f0f0f0'
      }}
    >
      {animated && (
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            willChange: 'transform'
          }}
        />
      )}
    </div>
  );
};

// Skeleton Presets
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 1, 
  className 
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '75%' : '100%'}
          height={16}
        />
      ))}
    </div>
  );
};

export const SkeletonAvatar: React.FC<{ size?: number; className?: string }> = ({ 
  size = 40, 
  className 
}) => {
  return (
    <Skeleton
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );
};

export const SkeletonButton: React.FC<{ width?: number; className?: string }> = ({ 
  width = 100, 
  className 
}) => {
  return (
    <Skeleton
      width={width}
      height={32}
      className={`rounded ${className}`}
    />
  );
};

// Card Skeleton
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`p-4 border rounded-lg ${className}`}>
      <div className="flex items-start space-x-3">
        <SkeletonAvatar size={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={20} />
          <SkeletonText lines={2} />
          <div className="flex space-x-2 mt-3">
            <SkeletonButton width={80} />
            <SkeletonButton width={60} />
          </div>
        </div>
      </div>
    </div>
  );
};

// List Skeleton
export const SkeletonList: React.FC<{ 
  items?: number; 
  itemHeight?: number;
  className?: string;
}> = ({ 
  items = 5, 
  itemHeight = 60,
  className 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <SkeletonAvatar size={32} />
          <div className="flex-1">
            <Skeleton width="40%" height={16} />
            <Skeleton width="80%" height={12} className="mt-1" />
          </div>
          <Skeleton width={60} height={24} />
        </div>
      ))}
    </div>
  );
};

// Task Card Skeleton (specific to our app)
export const SkeletonTaskCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`p-3 border rounded-lg bg-white ${className}`}>
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <Skeleton width="70%" height={18} />
          <Skeleton width={20} height={20} className="rounded" />
        </div>
        <SkeletonText lines={2} />
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-2">
            <Skeleton width={60} height={20} className="rounded-full" />
            <Skeleton width={40} height={20} className="rounded-full" />
          </div>
          <SkeletonAvatar size={24} />
        </div>
      </div>
    </div>
  );
};

// Kanban Column Skeleton
export const SkeletonKanbanColumn: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`w-72 p-3 bg-gray-50 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton width="60%" height={20} />
        <Skeleton width={24} height={24} className="rounded" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonTaskCard key={i} />
        ))}
      </div>
    </div>
  );
};

// Loading States for Different Content Types
export const LoadingStates = {
  // Quick loading for immediate feedback
  quick: () => <Spinner size={16} variant="spin" />,
  
  // Standard loading
  standard: () => <Spinner size={24} variant="pulse" />,
  
  // Large loading for full page
  large: () => (
    <div className="flex flex-col items-center justify-center p-8">
      <Spinner size={32} variant="spin" />
      <p className="mt-2 text-gray-500">Loading...</p>
    </div>
  ),

  // List loading
  list: (items = 5) => <SkeletonList items={items} />,
  
  // Card loading
  card: () => <SkeletonCard />,
  
  // Kanban loading
  kanban: () => (
    <div className="flex space-x-4 overflow-x-auto p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonKanbanColumn key={i} />
      ))}
    </div>
  )
};

// Smart Loading Component that adapts to content type
interface SmartLoadingProps {
  type: keyof typeof LoadingStates | 'auto';
  items?: number;
  className?: string;
}

export const SmartLoading: React.FC<SmartLoadingProps> = ({ 
  type, 
  items,
  className 
}) => {
  if (type === 'auto') {
    // Auto-detect based on container size
    return <Spinner size={24} variant="pulse" />;
  }

  const LoadingComponent = LoadingStates[type];
  
  if (typeof LoadingComponent === 'function') {
    return (
      <div className={className}>
        {LoadingComponent(items)}
      </div>
    );
  }

  return LoadingComponent;
};

// Staggered Loading Animation for Multiple Items
interface StaggeredLoadingProps {
  count: number;
  delay?: number;
  children: (index: number) => React.ReactNode;
}

export const StaggeredLoading: React.FC<StaggeredLoadingProps> = ({
  count,
  delay = 0.1,
  children
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: index * delay,
            ...getTransition('standard')
          }}
          style={{ willChange: 'transform, opacity' }}
        >
          {children(index)}
        </motion.div>
      ))}
    </>
  );
};