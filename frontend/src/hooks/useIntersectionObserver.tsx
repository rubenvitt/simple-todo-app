/**
 * Intersection Observer Hook
 * For lazy loading components when they become visible
 */

import { useEffect, useRef, useState, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
  skip?: boolean;
}

interface UseIntersectionObserverReturn {
  isIntersecting: boolean;
  entry?: IntersectionObserverEntry;
  ref: RefObject<HTMLDivElement>;
}

export function useIntersectionObserver({
  threshold = 0,
  root = null,
  rootMargin = '0px',
  triggerOnce = true,
  skip = false,
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverReturn {
  const ref = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry>();

  useEffect(() => {
    if (skip || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);

        if (entry.isIntersecting && triggerOnce) {
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        root,
        rootMargin,
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [threshold, root, rootMargin, triggerOnce, skip]);

  return { isIntersecting, entry, ref };
}

/**
 * Component for lazy loading on scroll
 */
interface LazyOnScrollProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  height?: string | number;
  className?: string;
  options?: UseIntersectionObserverOptions;
}

export const LazyOnScroll: React.FC<LazyOnScrollProps> = ({
  children,
  fallback = null,
  height = 'auto',
  className = '',
  options = {},
}) => {
  const { isIntersecting, ref } = useIntersectionObserver({
    rootMargin: '100px', // Load 100px before element is visible
    ...options,
  });

  return (
    <div
      ref={ref}
      className={className}
      style={{ 
        height: typeof height === 'number' ? `${height}px` : height,
        minHeight: typeof height === 'number' ? `${height}px` : undefined,
      }}
    >
      {isIntersecting ? children : fallback}
    </div>
  );
};

/**
 * Hook for progressive loading based on visibility
 */
export function useProgressiveLoading(stages: number = 3) {
  const [currentStage, setCurrentStage] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const nextStage = () => {
    if (currentStage < stages - 1) {
      setCurrentStage(prev => prev + 1);
    }
  };

  const scheduleNextStage = (delay: number = 100) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(nextStage, delay);
  };

  const reset = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setCurrentStage(0);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    currentStage,
    nextStage,
    scheduleNextStage,
    reset,
    isComplete: currentStage === stages - 1,
  };
}

export default useIntersectionObserver;