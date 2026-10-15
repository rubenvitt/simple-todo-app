/**
 * Mobile-Optimized Animation Library
 * 
 * Complete animation system with:
 * - GPU-accelerated animations
 * - Reduced motion support
 * - Performance monitoring
 * - Touch feedback
 * - Loading states
 * - Page transitions
 */

// Core configuration
export * from '../../config/motion';

// Animation presets and components
export * from './AnimationPresets';
export * from './LoadingAnimations';
export * from './PageTransitions';
export * from './AnimatedCard';

// Performance and accessibility
export * from '../../utils/animation-performance';

// Re-export framer-motion for convenience
export { motion, AnimatePresence, useAnimation } from 'framer-motion';

// Quick import shortcuts
export { 
  AnimatedElement,
  StaggeredList,
  TouchButton,
  PageTransition
} from './AnimationPresets';

export {
  Spinner,
  ProgressBar,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  LoadingStates,
  SmartLoading
} from './LoadingAnimations';

export {
  PageTransitionWrapper,
  RouteTransition,
  ModalTransition,
  BottomSheetTransition
} from './PageTransitions';

export {
  useReducedMotion,
  useAnimationPerformance,
  useAnimationAccessibility,
  AnimationProvider
} from '../../utils/animation-performance';