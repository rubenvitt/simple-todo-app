/**
 * Example Animated Card Component
 * Demonstrates the usage of mobile-optimized animations with accessibility
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedElement, TouchButton } from './AnimationPresets';
import { useAnimationAccessibility } from '../../utils/animation-performance';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  delay?: number;
  interactive?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  onClick,
  delay = 0,
  interactive = true
}) => {
  const { shouldUseReducedMotion, getSafeAnimationDuration, getSafeAnimationVariant } = useAnimationAccessibility();

  // Define animation variants for full and reduced motion
  const cardVariants = getSafeAnimationVariant({
    full: {
      initial: { opacity: 0, y: 20, scale: 0.95 },
      animate: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: {
          duration: getSafeAnimationDuration(0.3),
          delay: getSafeAnimationDuration(delay),
          ease: [0.4, 0.0, 0.2, 1]
        }
      },
      exit: { 
        opacity: 0, 
        y: -10, 
        scale: 0.98,
        transition: {
          duration: getSafeAnimationDuration(0.2)
        }
      }
    },
    reduced: {
      initial: { opacity: 0 },
      animate: { 
        opacity: 1,
        transition: {
          duration: getSafeAnimationDuration(0.1)
        }
      },
      exit: { 
        opacity: 0,
        transition: {
          duration: getSafeAnimationDuration(0.1)
        }
      }
    }
  });

  // Touch feedback variants
  const touchVariants = getSafeAnimationVariant({
    full: {
      whileHover: { scale: 1.02, y: -2 },
      whileTap: { scale: 0.98 }
    },
    reduced: {
      whileHover: { opacity: 0.9 },
      whileTap: { opacity: 0.8 }
    }
  });

  const CardComponent = interactive && onClick ? motion.button : motion.div;

  return (
    <CardComponent
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      {...(interactive && onClick ? touchVariants : {})}
      onClick={onClick}
      className={`
        ${className}
        ${interactive && onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500' : ''}
      `}
      style={{
        willChange: shouldUseReducedMotion() ? 'opacity' : 'transform, opacity',
        backfaceVisibility: 'hidden'
      }}
      // Accessibility
      role={interactive && onClick ? 'button' : undefined}
      tabIndex={interactive && onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (interactive && onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </CardComponent>
  );
};

// Example usage component
export const AnimatedCardExample: React.FC = () => {
  const handleCardClick = () => {
    console.log('Card clicked!');
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Animated Cards Example</h2>
      
      {/* Static animated card */}
      <AnimatedCard 
        className="p-6 bg-white rounded-lg shadow-md border"
        interactive={false}
      >
        <h3 className="text-lg font-semibold">Static Card</h3>
        <p className="text-gray-600">This card has entrance animations but no interaction.</p>
      </AnimatedCard>

      {/* Interactive animated card */}
      <AnimatedCard 
        className="p-6 bg-blue-50 rounded-lg shadow-md border border-blue-200"
        onClick={handleCardClick}
        delay={0.1}
      >
        <h3 className="text-lg font-semibold text-blue-900">Interactive Card</h3>
        <p className="text-blue-700">Click or tap this card to interact. It respects reduced motion preferences.</p>
      </AnimatedCard>

      {/* Staggered cards */}
      {[1, 2, 3].map((num) => (
        <AnimatedCard
          key={num}
          className="p-4 bg-gray-50 rounded-lg shadow-sm border"
          delay={num * 0.1}
          onClick={() => console.log(`Card ${num} clicked`)}
        >
          <h4 className="font-medium">Staggered Card {num}</h4>
          <p className="text-sm text-gray-600">Appears with {num * 0.1}s delay</p>
        </AnimatedCard>
      ))}
    </div>
  );
};