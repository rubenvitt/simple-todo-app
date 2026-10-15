/**
 * Framer Motion Configuration for Mobile-Optimized Animations
 * 
 * This config prioritizes performance on mobile devices by:
 * - Using only GPU-accelerated properties (transform, opacity)
 * - Respecting reduced motion preferences
 * - Optimizing durations for mobile interaction patterns
 * - Implementing device capability detection
 */

import { MotionConfig, Transition, Variant } from 'framer-motion';

// Device capability detection
export const getDeviceCapabilities = () => {
  const isHighPerformance = (() => {
    // Check for high-performance indicators
    const hardwareConcurrency = navigator.hardwareConcurrency || 1;
    const deviceMemory = (navigator as any).deviceMemory || 2;
    const connection = (navigator as any).connection;
    
    // Consider high performance if:
    // - 4+ CPU cores AND 4GB+ RAM
    // - OR fast network connection
    const hasGoodHardware = hardwareConcurrency >= 4 && deviceMemory >= 4;
    const hasFastConnection = connection?.effectiveType === '4g' || connection?.downlink > 10;
    
    return hasGoodHardware || hasFastConnection;
  })();

  const supportsReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const isLowPowerMode = (navigator as any).getBattery ? false : false; // Could be enhanced with battery API

  return {
    isHighPerformance,
    supportsReducedMotion,
    isMobile,
    isLowPowerMode,
    shouldUseReducedAnimations: supportsReducedMotion || isLowPowerMode || (!isHighPerformance && isMobile)
  };
};

// Base motion configuration
export const motionConfig = {
  // Respect reduced motion preferences
  reducedMotion: getDeviceCapabilities().shouldUseReducedAnimations ? 'always' : 'never',
  
  // Optimize for mobile performance
  transition: {
    type: 'tween' as const,
    ease: [0.4, 0.0, 0.2, 1], // Material Design easing
    duration: 0.3 // Mobile-optimized duration
  },

  // Global layout animation settings
  layout: true,
  layoutRoot: true
} as const;

// GPU-accelerated animation properties only
export const GPU_PROPS = ['x', 'y', 'scale', 'rotate', 'opacity', 'rotateX', 'rotateY', 'rotateZ'] as const;

// Mobile-optimized transition presets
export const transitions = {
  // Quick interactions (buttons, toggles)
  quick: {
    type: 'tween' as const,
    duration: 0.15,
    ease: [0.4, 0.0, 0.2, 1]
  },

  // Standard UI transitions
  standard: {
    type: 'tween' as const,
    duration: 0.25,
    ease: [0.4, 0.0, 0.2, 1]
  },

  // Smooth page transitions
  smooth: {
    type: 'tween' as const,
    duration: 0.4,
    ease: [0.4, 0.0, 0.2, 1]
  },

  // Spring animations for organic feel
  spring: {
    type: 'spring' as const,
    damping: 20,
    stiffness: 300,
    mass: 0.8
  },

  // Gentle spring for floating elements
  gentleSpring: {
    type: 'spring' as const,
    damping: 25,
    stiffness: 200,
    mass: 1
  },

  // Bouncy spring for feedback
  bouncy: {
    type: 'spring' as const,
    damping: 10,
    stiffness: 400,
    mass: 0.6
  }
} as const;

// Responsive transition function
export const getTransition = (
  preset: keyof typeof transitions,
  override?: Partial<Transition>
): Transition => {
  const capabilities = getDeviceCapabilities();
  const baseTransition = transitions[preset];

  // Reduce animation complexity on low-performance devices
  if (capabilities.shouldUseReducedAnimations) {
    return {
      ...baseTransition,
      duration: (baseTransition.duration || 0.25) * 0.7, // 30% faster
      type: 'tween' // Force tween for consistency
    };
  }

  return { ...baseTransition, ...override };
};

// Animation variants with mobile optimization
export const createVariants = (options: {
  distance?: number;
  scale?: number;
  opacity?: { initial: number; animate: number };
  transition?: keyof typeof transitions;
}) => {
  const {
    distance = 20,
    scale = 0.95,
    opacity = { initial: 0, animate: 1 },
    transition = 'standard'
  } = options;

  return {
    initial: {
      opacity: opacity.initial,
      scale,
      y: distance
    },
    animate: {
      opacity: opacity.animate,
      scale: 1,
      y: 0,
      transition: getTransition(transition)
    },
    exit: {
      opacity: opacity.initial,
      scale: scale * 0.9,
      y: -distance * 0.5,
      transition: getTransition('quick')
    }
  };
};

// Stagger configuration for lists
export const staggerConfig = {
  quick: {
    delayChildren: 0.05,
    staggerChildren: 0.02
  },
  standard: {
    delayChildren: 0.1,
    staggerChildren: 0.05
  },
  slow: {
    delayChildren: 0.15,
    staggerChildren: 0.1
  }
};

// Performance monitoring
export const createPerformanceMonitor = () => {
  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 60;

  const monitor = () => {
    frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - lastTime >= 1000) {
      fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      frameCount = 0;
      lastTime = currentTime;
      
      // Warn if FPS drops below acceptable threshold
      if (fps < 30) {
        console.warn(`🎭 Animation performance warning: ${fps} FPS`);
      }
    }
    
    requestAnimationFrame(monitor);
  };

  return {
    start: () => {
      monitor();
    },
    getFPS: () => fps
  };
};

// Utility to create mobile-safe animations
export const createMobileSafeAnimation = (
  variants: Record<string, Variant>,
  transition?: keyof typeof transitions
) => {
  const capabilities = getDeviceCapabilities();
  
  if (capabilities.shouldUseReducedAnimations) {
    // Return simplified variants for reduced motion
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: getTransition('quick') },
      exit: { opacity: 0, transition: getTransition('quick') }
    };
  }

  // Apply mobile-optimized transitions
  const optimizedVariants: Record<string, Variant> = {};
  Object.entries(variants).forEach(([key, variant]) => {
    if (typeof variant === 'object' && variant !== null) {
      optimizedVariants[key] = {
        ...variant,
        transition: variant.transition || getTransition(transition || 'standard')
      };
    } else {
      optimizedVariants[key] = variant;
    }
  });

  return optimizedVariants;
};

// Export for global configuration
export const globalMotionConfig = {
  ...motionConfig,
  transition: getTransition('standard')
};

// Hook for accessing motion capabilities
export const useMotionCapabilities = () => {
  return getDeviceCapabilities();
};