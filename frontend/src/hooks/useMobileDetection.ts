import { useState, useEffect } from 'react';

interface MobileDetectionHookResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenSize: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * Hook for detecting mobile devices and screen characteristics
 * Provides responsive breakpoints and device capabilities
 */
export function useMobileDetection(): MobileDetectionHookResult {
  const [detection, setDetection] = useState<MobileDetectionHookResult>(() => {
    // Server-side rendering safe defaults
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        screenSize: 'desktop',
        orientation: 'landscape',
        viewportWidth: 1024,
        viewportHeight: 768,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      screenSize: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
      orientation: width > height ? 'landscape' : 'portrait',
      viewportWidth: width,
      viewportHeight: height,
    };
  });

  useEffect(() => {
    const updateDetection = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      setDetection({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        screenSize: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
        orientation: width > height ? 'landscape' : 'portrait',
        viewportWidth: width,
        viewportHeight: height,
      });
    };

    // Throttled resize handler for performance
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDetection, 100);
    };

    // Listen for resize and orientation changes
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', updateDetection);

    // Initial detection
    updateDetection();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', updateDetection);
      clearTimeout(timeoutId);
    };
  }, []);

  return detection;
}

/**
 * Hook for mobile-specific viewport management
 */
export function useMobileViewport() {
  const [viewportHeight, setViewportHeight] = useState<number>(() => {
    if (typeof window === 'undefined') return 768;
    return window.innerHeight;
  });

  useEffect(() => {
    const updateViewportHeight = () => {
      // Use visualViewport API if available for better mobile support
      if ('visualViewport' in window && window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      } else {
        setViewportHeight(window.innerHeight);
      }
    };

    // Listen for viewport changes (keyboard show/hide)
    if ('visualViewport' in window && window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight);
    }

    window.addEventListener('resize', updateViewportHeight);
    updateViewportHeight();

    return () => {
      if ('visualViewport' in window && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportHeight);
      }
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  return { viewportHeight };
}

/**
 * Hook for detecting if device supports hover interactions
 */
export function useHoverSupport(): boolean {
  const [supportsHover, setSupportsHover] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(hover: hover)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSupportsHover(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    setSupportsHover(mediaQuery.matches);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return supportsHover;
}

/**
 * Hook for detecting if device prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    setPrefersReducedMotion(mediaQuery.matches);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Comprehensive mobile detection hook with all features
 */
export function useDeviceDetection() {
  const mobileDetection = useMobileDetection();
  const { viewportHeight } = useMobileViewport();
  const supportsHover = useHoverSupport();
  const prefersReducedMotion = usePrefersReducedMotion();

  return {
    ...mobileDetection,
    viewportHeight,
    supportsHover,
    prefersReducedMotion,
    // Computed properties
    isSmallScreen: mobileDetection.viewportWidth < 640,
    isLargeScreen: mobileDetection.viewportWidth >= 1280,
    hasKeyboardOpen: mobileDetection.isMobile && viewportHeight < mobileDetection.viewportHeight * 0.75,
  };
}