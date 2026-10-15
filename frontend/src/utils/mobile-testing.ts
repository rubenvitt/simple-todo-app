/**
 * Mobile Testing Utilities
 * Automated tests and checks for mobile UX validation
 */

import { 
  runMobileAccessibilityAudit,
  testScreenReaderCompatibility,
  checkGestureConflicts
} from './accessibility-audit';

// Touch target validation
export const validateTouchTargets = (): { passed: boolean; issues: string[] } => {
  const issues: string[] = [];
  const interactiveElements = document.querySelectorAll(
    'button, a, input, select, textarea, [role="button"], [tabindex="0"]'
  );

  interactiveElements.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    const minSize = 44; // iOS Human Interface Guidelines minimum

    if (rect.width < minSize || rect.height < minSize) {
      const identifier = element.id || element.className || `element-${index}`;
      issues.push(
        `Touch target too small: ${identifier} (${Math.round(rect.width)}x${Math.round(rect.height)}px)`
      );
    }
  });

  return {
    passed: issues.length === 0,
    issues,
  };
};

// Viewport and zoom validation
export const validateViewportSettings = (): { passed: boolean; issues: string[] } => {
  const issues: string[] = [];
  const viewport = document.querySelector('meta[name="viewport"]');
  
  if (!viewport) {
    issues.push('Missing viewport meta tag');
  } else {
    const content = viewport.getAttribute('content') || '';
    
    if (!content.includes('width=device-width')) {
      issues.push('Viewport should include width=device-width');
    }
    
    if (!content.includes('initial-scale=1')) {
      issues.push('Viewport should include initial-scale=1');
    }
    
    if (content.includes('user-scalable=no')) {
      issues.push('Consider allowing user scaling for accessibility');
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
};

// Font size validation to prevent iOS zoom
export const validateFontSizes = (): { passed: boolean; issues: string[] } => {
  const issues: string[] = [];
  const inputs = document.querySelectorAll('input, select, textarea');

  inputs.forEach((input, index) => {
    const styles = window.getComputedStyle(input);
    const fontSize = parseFloat(styles.fontSize);
    
    if (fontSize < 16) {
      const identifier = input.id || input.className || `input-${index}`;
      issues.push(
        `Input font size too small (${fontSize}px): ${identifier} - may cause iOS zoom`
      );
    }
  });

  return {
    passed: issues.length === 0,
    issues,
  };
};

// Horizontal scroll detection
export const detectHorizontalScroll = (): { passed: boolean; issues: string[] } => {
  const issues: string[] = [];
  const elements = document.querySelectorAll('*');

  elements.forEach((element, index) => {
    if (element.scrollWidth > element.clientWidth && 
        !element.classList.contains('horizontal-scroll-intended')) {
      const identifier = element.id || element.className || `element-${index}`;
      issues.push(`Unintended horizontal scroll detected: ${identifier}`);
    }
  });

  return {
    passed: issues.length === 0,
    issues,
  };
};

// Performance monitoring
export const measurePerformanceMetrics = (): Promise<{
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
}> => {
  return new Promise((resolve) => {
    let lcp = 0;
    let fid = 0;
    let cls = 0;
    let ttfb = 0;

    // Largest Contentful Paint
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        lcp = entries[entries.length - 1].startTime;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // First Input Delay
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry: any) => {
        fid = entry.processingStart - entry.startTime;
      });
    }).observe({ type: 'first-input', buffered: true });

    // Cumulative Layout Shift
    new PerformanceObserver((entryList) => {
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          cls += entry.value;
        }
      });
    }).observe({ type: 'layout-shift', buffered: true });

    // Time to First Byte
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      ttfb = navigation.responseStart - navigation.requestStart;
    }

    // Give metrics time to collect
    setTimeout(() => {
      resolve({ lcp, fid, cls, ttfb });
    }, 3000);
  });
};

// Gesture testing utilities
export const testGestureSupport = (): { passed: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Check touch event support
  if (!('ontouchstart' in window)) {
    issues.push('Touch events not supported');
  }

  // Check pointer event support
  if (!('onpointerdown' in window)) {
    issues.push('Pointer events not supported (modern touch handling)');
  }

  // Check vibration API
  if (!('vibrate' in navigator)) {
    issues.push('Vibration API not supported (haptic feedback unavailable)');
  }

  return {
    passed: issues.length === 0,
    issues,
  };
};

// Enhanced accessibility validation with mobile-specific tests
export const validateAccessibility = (): { passed: boolean; issues: string[] } => {
  const issues: string[] = [];

  // Run comprehensive mobile accessibility audit
  const mobileIssues = runMobileAccessibilityAudit();
  mobileIssues.forEach(issue => {
    issues.push(`${issue.type.toUpperCase()}: ${issue.issue} (${issue.element})`);
  });

  // Test screen reader compatibility
  const screenReaderTest = testScreenReaderCompatibility();
  if (!screenReaderTest.passed) {
    issues.push(...screenReaderTest.issues.map(issue => `Screen Reader: ${issue}`));
  }

  // Check gesture conflicts
  const gestureTest = checkGestureConflicts();
  if (!gestureTest.passed) {
    issues.push(...gestureTest.issues.map(issue => `Gesture: ${issue}`));
  }

  return {
    passed: issues.length === 0,
    issues,
  };
};

// Comprehensive mobile test suite
export const runMobileTestSuite = async (): Promise<{
  touchTargets: { passed: boolean; issues: string[] };
  viewport: { passed: boolean; issues: string[] };
  fontSizes: { passed: boolean; issues: string[] };
  horizontalScroll: { passed: boolean; issues: string[] };
  gestures: { passed: boolean; issues: string[] };
  accessibility: { passed: boolean; issues: string[] };
  performance: { lcp: number; fid: number; cls: number; ttfb: number };
  overallScore: number;
}> => {
  console.log('🧪 Running Mobile UX Test Suite...');

  const touchTargets = validateTouchTargets();
  const viewport = validateViewportSettings();
  const fontSizes = validateFontSizes();
  const horizontalScroll = detectHorizontalScroll();
  const gestures = testGestureSupport();
  const accessibility = validateAccessibility();
  const performance = await measurePerformanceMetrics();

  const passedTests = [
    touchTargets.passed,
    viewport.passed,
    fontSizes.passed,
    horizontalScroll.passed,
    gestures.passed,
    accessibility.passed,
  ].filter(Boolean).length;

  const overallScore = Math.round((passedTests / 6) * 100);

  console.log(`📊 Mobile UX Score: ${overallScore}%`);

  return {
    touchTargets,
    viewport,
    fontSizes,
    horizontalScroll,
    gestures,
    accessibility,
    performance,
    overallScore,
  };
};

// Device detection utilities
export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  const screen = window.screen;
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isMobile = /Mobi|Android/i.test(userAgent);
  const isTablet = /iPad/.test(userAgent) || (isAndroid && !/Mobi/.test(userAgent));

  return {
    userAgent,
    screen: {
      width: screen.width,
      height: screen.height,
      pixelRatio: window.devicePixelRatio,
    },
    viewport,
    platform: {
      isIOS,
      isAndroid,
      isMobile,
      isTablet,
    },
    orientation: screen.orientation?.type || 'unknown',
  };
};

// Export everything for console usage
if (typeof window !== 'undefined') {
  (window as any).mobileTestSuite = {
    runMobileTestSuite,
    validateTouchTargets,
    validateViewportSettings,
    validateFontSizes,
    detectHorizontalScroll,
    testGestureSupport,
    validateAccessibility,
    measurePerformanceMetrics,
    getDeviceInfo,
  };
}