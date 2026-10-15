import { useState, useEffect } from 'react';

export interface ResponsiveKanbanConfig {
  mobileBreakpoint?: number;
  forceMode?: 'mobile' | 'desktop' | null;
}

export const useResponsiveKanban = (config: ResponsiveKanbanConfig = {}) => {
  const { mobileBreakpoint = 768, forceMode = null } = config;
  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    // Force mode override
    if (forceMode) {
      setIsMobile(forceMode === 'mobile');
      return;
    }

    const checkDevice = () => {
      const width = window.innerWidth;
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      setIsMobile(width < mobileBreakpoint || touch);
      setIsTouch(touch);
    };

    // Initial check
    checkDevice();

    // Listen for resize events
    window.addEventListener('resize', checkDevice);
    
    // Listen for orientation changes on mobile
    window.addEventListener('orientationchange', () => {
      setTimeout(checkDevice, 100); // Delay to get accurate dimensions
    });

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, [mobileBreakpoint, forceMode]);

  const toggleMode = () => {
    setIsMobile(prev => !prev);
  };

  return {
    isMobile,
    isTouch,
    isDesktop: !isMobile,
    toggleMode,
    screenSize: {
      width: typeof window !== 'undefined' ? window.innerWidth : 0,
      height: typeof window !== 'undefined' ? window.innerHeight : 0,
    },
  };
};