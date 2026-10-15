/**
 * Device Testing Utilities
 * Tools and helpers for physical device testing setup and validation
 */

// Device database with target specifications
export const TARGET_DEVICES = {
  // Primary iOS Devices
  'iPhone SE': {
    screen: { width: 375, height: 667, pixelRatio: 2 },
    viewport: { width: 375, height: 667 },
    userAgent: 'iPhone',
    category: 'mobile',
    platform: 'iOS',
    priority: 'primary',
    notes: 'Smallest iPhone screen - critical for touch target testing'
  },
  'iPhone 12': {
    screen: { width: 390, height: 844, pixelRatio: 3 },
    viewport: { width: 390, height: 844 },
    userAgent: 'iPhone',
    category: 'mobile', 
    platform: 'iOS',
    priority: 'primary',
    notes: 'Standard modern iPhone size'
  },
  
  // Primary Android Devices
  'Galaxy S21': {
    screen: { width: 384, height: 854, pixelRatio: 2.75 },
    viewport: { width: 384, height: 854 },
    userAgent: 'Android',
    category: 'mobile',
    platform: 'Android', 
    priority: 'primary',
    notes: 'Flagship Android device'
  },
  
  // Tablet Devices
  'iPad': {
    screen: { width: 820, height: 1180, pixelRatio: 2 },
    viewport: { width: 820, height: 1180 },
    userAgent: 'iPad',
    category: 'tablet',
    platform: 'iOS',
    priority: 'primary',
    notes: 'Standard tablet testing'
  }
};

// Current device detection and matching
export const detectCurrentDevice = () => {
  const userAgent = navigator.userAgent;
  const screen = window.screen;
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  // Determine platform
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isMobile = /Mobi|Android/i.test(userAgent);
  const isTablet = /iPad/.test(userAgent) || (isAndroid && !/Mobi/.test(userAgent));

  // Determine device category
  let category = 'desktop';
  if (isTablet) category = 'tablet';
  else if (isMobile) category = 'mobile';

  // Try to match against known devices
  let matchedDevice = null;
  for (const [deviceName, deviceSpec] of Object.entries(TARGET_DEVICES)) {
    const screenMatch = Math.abs(viewport.width - deviceSpec.viewport.width) < 50;
    const platformMatch = 
      (isIOS && deviceSpec.platform === 'iOS') ||
      (isAndroid && deviceSpec.platform === 'Android');
    
    if (screenMatch && platformMatch) {
      matchedDevice = { name: deviceName, ...deviceSpec };
      break;
    }
  }

  return {
    detected: {
      userAgent,
      screen: {
        width: screen.width,
        height: screen.height,
        pixelRatio: window.devicePixelRatio
      },
      viewport,
      platform: isIOS ? 'iOS' : isAndroid ? 'Android' : 'Unknown',
      category,
      isIOS,
      isAndroid,
      isMobile,
      isTablet
    },
    matched: matchedDevice,
    isTargetDevice: !!matchedDevice
  };
};

// Device testing readiness check
export const checkDeviceTestingReadiness = () => {
  const issues: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  const device = detectCurrentDevice();

  // Check if this is a target testing device
  if (!device.isTargetDevice) {
    warnings.push(`Current device not in target testing matrix: ${device.detected.viewport.width}×${device.detected.viewport.height}`);
  }

  // Check developer tools access
  if (typeof window.console === 'undefined') {
    issues.push('Console access not available - debugging may be limited');
  }

  // Check touch event support
  if (!('ontouchstart' in window)) {
    if (device.detected.isMobile) {
      issues.push('Touch events not supported on mobile device');
    } else {
      info.push('Touch events not available (desktop expected)');
    }
  }

  // Check viewport meta tag
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (!viewportMeta) {
    issues.push('Missing viewport meta tag - mobile rendering may be broken');
  }

  // Check accessibility features
  const mediaQueries = {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    highContrast: window.matchMedia('(prefers-contrast: high)').matches,
    forcedColors: window.matchMedia('(forced-colors: active)').matches
  };

  info.push(`Accessibility preferences: ${Object.entries(mediaQueries)
    .filter(([_, enabled]) => enabled)
    .map(([key, _]) => key)
    .join(', ') || 'none detected'}`);

  // Check network connection
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    info.push(`Network: ${connection.effectiveType || 'unknown'} (${connection.downlink || 'unknown'}Mbps)`);
  }

  // Check available APIs
  const apiSupport = {
    vibration: 'vibrate' in navigator,
    geolocation: 'geolocation' in navigator,
    deviceMotion: 'DeviceMotionEvent' in window,
    serviceWorker: 'serviceWorker' in navigator,
    webGL: !!document.createElement('canvas').getContext('webgl')
  };

  const unsupportedAPIs = Object.entries(apiSupport)
    .filter(([_, supported]) => !supported)
    .map(([api, _]) => api);

  if (unsupportedAPIs.length > 0) {
    warnings.push(`Unsupported APIs: ${unsupportedAPIs.join(', ')}`);
  }

  return {
    device: device.detected,
    matchedDevice: device.matched,
    isReady: issues.length === 0,
    issues,
    warnings,
    info,
    score: Math.max(0, 100 - (issues.length * 20) - (warnings.length * 5))
  };
};

// Network condition simulation helpers
export const NETWORK_CONDITIONS = {
  '4G': {
    name: '4G LTE',
    downloadThroughput: 4000,
    uploadThroughput: 3000,
    latency: 20,
    description: 'Excellent connection'
  },
  '3G': {
    name: '3G',
    downloadThroughput: 1600,
    uploadThroughput: 768,
    latency: 150,
    description: 'Good connection'
  },
  'slow-3g': {
    name: 'Slow 3G',
    downloadThroughput: 500,
    uploadThroughput: 500,
    latency: 400,
    description: 'Poor connection'
  },
  '2g': {
    name: '2G',
    downloadThroughput: 280,
    uploadThroughput: 256,
    latency: 800,
    description: 'Very slow connection'
  }
};

// Performance monitoring for device testing
export const startDevicePerformanceMonitoring = () => {
  const metrics = {
    memoryUsage: 0,
    renderingTime: 0,
    scriptDuration: 0,
    layoutShifts: 0
  };

  // Memory monitoring (if available)
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    metrics.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
  }

  // Frame timing monitoring
  let frameStart = performance.now();
  const measureFrameTime = () => {
    const frameEnd = performance.now();
    metrics.renderingTime = frameEnd - frameStart;
    frameStart = frameEnd;
    requestAnimationFrame(measureFrameTime);
  };
  requestAnimationFrame(measureFrameTime);

  // Layout shift monitoring
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          metrics.layoutShifts += (entry as any).value;
        }
      }
    });
    observer.observe({ entryTypes: ['layout-shift'] });
  }

  return () => metrics;
};

// Screen reader simulation and testing
export const simulateScreenReaderInteraction = () => {
  const focusableElements = document.querySelectorAll(
    'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  let currentIndex = 0;
  const announcements: string[] = [];

  const getElementAnnouncement = (element: Element): string => {
    const tagName = element.tagName.toLowerCase();
    const text = element.textContent?.trim() || '';
    const ariaLabel = element.getAttribute('aria-label');
    const role = element.getAttribute('role');
    
    let announcement = ariaLabel || text || 'Unlabeled element';
    
    if (role) {
      announcement += `, ${role}`;
    } else {
      switch (tagName) {
        case 'button':
          announcement += ', button';
          break;
        case 'a':
          announcement += ', link';
          break;
        case 'input':
          const type = element.getAttribute('type') || 'text';
          announcement += `, ${type} input`;
          break;
        default:
          announcement += `, ${tagName}`;
      }
    }
    
    return announcement;
  };

  const simulateNavigation = () => {
    if (currentIndex < focusableElements.length) {
      const element = focusableElements[currentIndex];
      const announcement = getElementAnnouncement(element);
      announcements.push(announcement);
      
      // Focus the element
      (element as HTMLElement).focus();
      
      currentIndex++;
      return {
        element,
        announcement,
        progress: `${currentIndex}/${focusableElements.length}`,
        isComplete: false
      };
    }
    
    return {
      element: null,
      announcement: 'End of content',
      progress: `${focusableElements.length}/${focusableElements.length}`,
      isComplete: true
    };
  };

  return {
    simulateNavigation,
    getAnnouncements: () => announcements,
    getTotalElements: () => focusableElements.length,
    reset: () => {
      currentIndex = 0;
      announcements.length = 0;
    }
  };
};

// Touch target validation with visual feedback
export const validateTouchTargetsWithFeedback = () => {
  const issues: Array<{
    element: Element;
    size: { width: number; height: number };
    position: { x: number; y: number };
    severity: 'error' | 'warning' | 'info';
  }> = [];

  const interactiveElements = document.querySelectorAll(
    'button, a, input, select, textarea, [role="button"], [tabindex="0"]'
  );

  interactiveElements.forEach((element) => {
    const rect = element.getBoundingClientRect();
    const minSize = 44; // iOS Human Interface Guidelines

    if (rect.width < minSize || rect.height < minSize) {
      let severity: 'error' | 'warning' | 'info' = 'warning';
      
      if (rect.width < 24 || rect.height < 24) {
        severity = 'error'; // Extremely small
      } else if (rect.width < 32 || rect.height < 32) {
        severity = 'warning'; // Small but maybe usable
      } else {
        severity = 'info'; // Close to minimum
      }

      issues.push({
        element,
        size: { width: rect.width, height: rect.height },
        position: { x: rect.left, y: rect.top },
        severity
      });
    }
  });

  return {
    issues,
    totalElements: interactiveElements.length,
    passedElements: interactiveElements.length - issues.length,
    successRate: ((interactiveElements.length - issues.length) / interactiveElements.length) * 100
  };
};

// Export for console debugging
if (typeof window !== 'undefined') {
  (window as any).deviceTesting = {
    detectCurrentDevice,
    checkDeviceTestingReadiness,
    simulateScreenReaderInteraction,
    validateTouchTargetsWithFeedback,
    startDevicePerformanceMonitoring,
    TARGET_DEVICES,
    NETWORK_CONDITIONS
  };
}