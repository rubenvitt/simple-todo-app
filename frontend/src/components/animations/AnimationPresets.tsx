/**
 * Mobile-Optimized Animation Preset Library
 * 
 * All animations use only GPU-accelerated properties:
 * - transform (x, y, scale, rotate)
 * - opacity
 * 
 * Optimized for 60fps performance on mobile devices
 */

import { motion, Variants, HTMLMotionProps } from 'framer-motion';
import { getTransition, createMobileSafeAnimation, staggerConfig } from '../../config/motion';
import React from 'react';

// Slide Animations
export const slideVariants = {
  slideInLeft: createMobileSafeAnimation({
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 }
  }, 'standard'),

  slideInRight: createMobileSafeAnimation({
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 50, opacity: 0 }
  }, 'standard'),

  slideInUp: createMobileSafeAnimation({
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 50, opacity: 0 }
  }, 'standard'),

  slideInDown: createMobileSafeAnimation({
    initial: { y: -100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -50, opacity: 0 }
  }, 'standard')
};

// Fade Animations
export const fadeVariants = {
  fadeIn: createMobileSafeAnimation({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  }, 'standard'),

  fadeInUp: createMobileSafeAnimation({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 }
  }, 'standard'),

  fadeInDown: createMobileSafeAnimation({
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  }, 'standard'),

  fadeInScale: createMobileSafeAnimation({
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 }
  }, 'standard')
};

// Scale Animations
export const scaleVariants = {
  scaleIn: createMobileSafeAnimation({
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 }
  }, 'spring'),

  scaleInCenter: createMobileSafeAnimation({
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 }
  }, 'standard'),

  pulse: createMobileSafeAnimation({
    initial: { scale: 1 },
    animate: { 
      scale: [1, 1.05, 1],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }, 'spring'),

  bounce: createMobileSafeAnimation({
    initial: { scale: 0.3, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: {
        type: "spring",
        damping: 10,
        stiffness: 400
      }
    },
    exit: { scale: 0.5, opacity: 0 }
  }, 'bouncy')
};

// Touch Feedback Animations
export const touchFeedback = {
  tap: createMobileSafeAnimation({
    initial: { scale: 1 },
    whileTap: { scale: 0.95 },
    whileHover: { scale: 1.02 }
  }, 'quick'),

  press: createMobileSafeAnimation({
    initial: { scale: 1, opacity: 1 },
    whileTap: { scale: 0.98, opacity: 0.8 },
    whileHover: { scale: 1.01 }
  }, 'quick'),

  lift: createMobileSafeAnimation({
    initial: { y: 0, scale: 1 },
    whileHover: { y: -2, scale: 1.02 },
    whileTap: { y: 0, scale: 0.98 }
  }, 'quick')
};

// List and Stagger Animations
export const listVariants = {
  container: {
    initial: {},
    animate: {
      transition: {
        ...staggerConfig.standard,
        when: "beforeChildren"
      }
    },
    exit: {
      transition: {
        ...staggerConfig.quick,
        when: "afterChildren"
      }
    }
  },
  
  item: createMobileSafeAnimation({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  }, 'standard')
};

// Page Transition Variants
export const pageVariants = {
  initial: { opacity: 0, x: 100 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: getTransition('smooth')
  },
  exit: { 
    opacity: 0, 
    x: -50,
    transition: getTransition('quick')
  }
};

// Modal/Overlay Variants
export const overlayVariants = {
  backdrop: createMobileSafeAnimation({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  }, 'standard'),

  modal: createMobileSafeAnimation({
    initial: { opacity: 0, scale: 0.8, y: 100 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 50 }
  }, 'standard'),

  drawer: createMobileSafeAnimation({
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" }
  }, 'smooth'),

  bottomSheet: createMobileSafeAnimation({
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" }
  }, 'smooth')
};

// Reusable Animation Components
interface AnimatedElementProps extends HTMLMotionProps<"div"> {
  animation: keyof typeof slideVariants | keyof typeof fadeVariants | keyof typeof scaleVariants;
  children: React.ReactNode;
  delay?: number;
}

export const AnimatedElement: React.FC<AnimatedElementProps> = ({ 
  animation, 
  children, 
  delay = 0,
  ...props 
}) => {
  // Get the appropriate variant set
  const getVariants = (animationType: string): Variants => {
    if (animationType in slideVariants) return slideVariants[animationType as keyof typeof slideVariants];
    if (animationType in fadeVariants) return fadeVariants[animationType as keyof typeof fadeVariants];
    if (animationType in scaleVariants) return scaleVariants[animationType as keyof typeof scaleVariants];
    return fadeVariants.fadeIn; // Default fallback
  };

  const variants = getVariants(animation);

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        // Optimize for GPU acceleration
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        perspective: 1000
      }}
      transition={{
        delay,
        ...getTransition('standard')
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Staggered List Component
interface StaggeredListProps {
  children: React.ReactNode[];
  stagger?: keyof typeof staggerConfig;
  className?: string;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({ 
  children, 
  stagger = 'standard',
  className 
}) => {
  return (
    <motion.div
      variants={listVariants.container}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      style={{
        willChange: 'transform, opacity'
      }}
    >
      {children.map((child, index) => (
        <motion.div
          key={index}
          variants={listVariants.item}
          style={{
            willChange: 'transform, opacity'
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Touch Feedback Button
interface TouchButtonProps extends HTMLMotionProps<"button"> {
  feedback?: keyof typeof touchFeedback;
  children: React.ReactNode;
}

export const TouchButton: React.FC<TouchButtonProps> = ({ 
  feedback = 'tap',
  children,
  ...props 
}) => {
  const variants = touchFeedback[feedback];

  return (
    <motion.button
      variants={variants}
      initial="initial"
      whileTap="whileTap"
      whileHover="whileHover"
      style={{
        willChange: 'transform, opacity',
        cursor: 'pointer',
        border: 'none',
        background: 'transparent'
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
};

// Page Transition Wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      style={{
        willChange: 'transform, opacity'
      }}
    >
      {children}
    </motion.div>
  );
};

// Export all variants for custom usage
export const allVariants = {
  ...slideVariants,
  ...fadeVariants,
  ...scaleVariants,
  ...touchFeedback,
  page: pageVariants,
  overlay: overlayVariants,
  list: listVariants
};