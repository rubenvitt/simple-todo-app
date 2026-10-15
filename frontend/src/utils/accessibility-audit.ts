/**
 * Accessibility Audit Utilities
 * Quick accessibility checks for development
 */

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  element: string;
  issue: string;
  suggestion: string;
  wcagRule?: string;
}

export const runAccessibilityAudit = (): AccessibilityIssue[] => {
  const issues: AccessibilityIssue[] = [];

  // Check for missing alt text on images
  const images = document.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.alt && img.src) {
      issues.push({
        type: 'error',
        element: `Image ${index + 1}`,
        issue: 'Missing alt attribute',
        suggestion: 'Add meaningful alt text or alt="" for decorative images',
        wcagRule: '1.1.1 Non-text Content'
      });
    }
  });

  // Check for proper heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let previousLevel = 0;
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    if (index === 0 && level !== 1) {
      issues.push({
        type: 'warning',
        element: `${heading.tagName}`,
        issue: 'Page should start with h1',
        suggestion: 'Use h1 for the main page heading',
        wcagRule: '1.3.1 Info and Relationships'
      });
    }
    if (level > previousLevel + 1) {
      issues.push({
        type: 'error',
        element: `${heading.tagName}`,
        issue: `Heading hierarchy skip from h${previousLevel} to h${level}`,
        suggestion: 'Use headings in sequential order',
        wcagRule: '1.3.1 Info and Relationships'
      });
    }
    previousLevel = level;
  });

  // Check for buttons without accessible names
  const buttons = document.querySelectorAll('button');
  buttons.forEach((button, index) => {
    const hasText = button.textContent?.trim();
    const hasAriaLabel = button.getAttribute('aria-label');
    const hasAriaLabelledBy = button.getAttribute('aria-labelledby');
    const hasTitle = button.getAttribute('title');
    
    if (!hasText && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
      issues.push({
        type: 'error',
        element: `Button ${index + 1}`,
        issue: 'Button has no accessible name',
        suggestion: 'Add text content, aria-label, or aria-labelledby',
        wcagRule: '4.1.2 Name, Role, Value'
      });
    }
  });

  // Check for form inputs without labels
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach((input, index) => {
    const hasLabel = document.querySelector(`label[for="${input.id}"]`);
    const hasAriaLabel = input.getAttribute('aria-label');
    const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
    const hasTitle = input.getAttribute('title');
    
    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
      issues.push({
        type: 'error',
        element: `Input ${index + 1} (${input.type || input.tagName})`,
        issue: 'Form control has no accessible name',
        suggestion: 'Add a <label>, aria-label, or aria-labelledby',
        wcagRule: '1.3.1 Info and Relationships'
      });
    }
  });

  // Check for color contrast (simplified check)
  const elementsToCheck = document.querySelectorAll('p, span, div, button, a, h1, h2, h3, h4, h5, h6');
  elementsToCheck.forEach((element, index) => {
    const styles = window.getComputedStyle(element);
    const backgroundColor = styles.backgroundColor;
    const color = styles.color;
    
    // Skip if no text content or transparent background
    if (!element.textContent?.trim() || backgroundColor === 'rgba(0, 0, 0, 0)') {
      return;
    }

    // This is a simplified check - in production, use a proper contrast library
    if (color === backgroundColor) {
      issues.push({
        type: 'error',
        element: `Element ${index + 1}`,
        issue: 'Text and background colors are identical',
        suggestion: 'Ensure sufficient color contrast',
        wcagRule: '1.4.3 Contrast (Minimum)'
      });
    }
  });

  // Check for touch target sizes
  const touchTargets = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]');
  touchTargets.forEach((target, index) => {
    const rect = target.getBoundingClientRect();
    const minSize = 44; // iOS recommendation
    
    if (rect.width < minSize || rect.height < minSize) {
      issues.push({
        type: 'warning',
        element: `Touch target ${index + 1}`,
        issue: `Touch target too small (${Math.round(rect.width)}×${Math.round(rect.height)}px)`,
        suggestion: 'Make touch targets at least 44×44px',
        wcagRule: '2.5.5 Target Size'
      });
    }
  });

  // Check for focus indicators
  const focusableElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex="0"]');
  let focusIssues = 0;
  focusableElements.forEach((element) => {
    const styles = window.getComputedStyle(element, ':focus');
    const outline = styles.outline;
    const boxShadow = styles.boxShadow;
    
    if (outline === 'none' && boxShadow === 'none') {
      focusIssues++;
    }
  });
  
  if (focusIssues > 0) {
    issues.push({
      type: 'warning',
      element: `${focusIssues} focusable elements`,
      issue: 'Elements may lack visible focus indicators',
      suggestion: 'Ensure all focusable elements have clear focus indicators',
      wcagRule: '2.4.7 Focus Visible'
    });
  }

  // Check for skip links
  const skipLinks = document.querySelectorAll('a[href^="#"]');
  let hasSkipToMain = false;
  skipLinks.forEach((link) => {
    if (link.textContent?.toLowerCase().includes('skip') && 
        link.textContent?.toLowerCase().includes('main')) {
      hasSkipToMain = true;
    }
  });
  
  if (!hasSkipToMain && headings.length > 0) {
    issues.push({
      type: 'info',
      element: 'Page navigation',
      issue: 'No skip to main content link found',
      suggestion: 'Add a skip link for keyboard users',
      wcagRule: '2.4.1 Bypass Blocks'
    });
  }

  // Check for ARIA landmarks
  const landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer');
  if (landmarks.length === 0) {
    issues.push({
      type: 'warning',
      element: 'Page structure',
      issue: 'No ARIA landmarks found',
      suggestion: 'Add semantic HTML or ARIA landmarks for screen readers',
      wcagRule: '1.3.1 Info and Relationships'
    });
  }

  return issues;
};

// Check if reduced motion is preferred
export const respectsReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Check viewport settings
export const checkViewportConfiguration = (): { valid: boolean; issues: string[] } => {
  const viewport = document.querySelector('meta[name="viewport"]');
  const issues: string[] = [];
  
  if (!viewport) {
    issues.push('Missing viewport meta tag');
    return { valid: false, issues };
  }
  
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
  
  return {
    valid: issues.length === 0,
    issues
  };
};

// Check for proper ARIA usage
export const validateARIAUsage = (): AccessibilityIssue[] => {
  const issues: AccessibilityIssue[] = [];
  
  // Check for invalid ARIA attributes
  const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [role]');
  elementsWithAria.forEach((element, index) => {
    const role = element.getAttribute('role');
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    const ariaDescribedBy = element.getAttribute('aria-describedby');
    
    // Check if aria-labelledby references exist
    if (ariaLabelledBy) {
      const ids = ariaLabelledBy.split(' ');
      ids.forEach(id => {
        if (!document.getElementById(id)) {
          issues.push({
            type: 'error',
            element: `Element ${index + 1}`,
            issue: `aria-labelledby references non-existent id: ${id}`,
            suggestion: 'Ensure referenced elements exist',
            wcagRule: '4.1.2 Name, Role, Value'
          });
        }
      });
    }
    
    // Check if aria-describedby references exist
    if (ariaDescribedBy) {
      const ids = ariaDescribedBy.split(' ');
      ids.forEach(id => {
        if (!document.getElementById(id)) {
          issues.push({
            type: 'error',
            element: `Element ${index + 1}`,
            issue: `aria-describedby references non-existent id: ${id}`,
            suggestion: 'Ensure referenced elements exist',
            wcagRule: '4.1.2 Name, Role, Value'
          });
        }
      });
    }
    
    // Check for empty aria-label
    if (ariaLabel === '') {
      issues.push({
        type: 'warning',
        element: `Element ${index + 1}`,
        issue: 'Empty aria-label attribute',
        suggestion: 'Remove empty aria-label or provide meaningful text',
        wcagRule: '4.1.2 Name, Role, Value'
      });
    }
  });
  
  return issues;
};

// Mobile-specific accessibility checks
export const runMobileAccessibilityAudit = (): AccessibilityIssue[] => {
  const issues: AccessibilityIssue[] = [];
  
  // Run standard accessibility audit first
  issues.push(...runAccessibilityAudit());
  issues.push(...validateARIAUsage());
  
  // Check for mobile-specific issues
  const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="search"]');
  inputs.forEach((input, index) => {
    const styles = window.getComputedStyle(input);
    const fontSize = parseFloat(styles.fontSize);
    
    if (fontSize < 16) {
      issues.push({
        type: 'warning',
        element: `Input ${index + 1}`,
        issue: `Font size ${fontSize}px may trigger zoom on iOS`,
        suggestion: 'Use font-size: 16px or larger to prevent zoom',
        wcagRule: '1.4.4 Resize text'
      });
    }
  });
  
  // Check for proper semantic regions
  const main = document.querySelector('main, [role="main"]');
  if (!main) {
    issues.push({
      type: 'error',
      element: 'Page structure',
      issue: 'Missing main content landmark',
      suggestion: 'Add <main> element or role="main"',
      wcagRule: '1.3.1 Info and Relationships'
    });
  }
  
  const nav = document.querySelector('nav, [role="navigation"]');
  if (!nav) {
    issues.push({
      type: 'warning',
      element: 'Page structure',
      issue: 'Missing navigation landmark',
      suggestion: 'Add <nav> element or role="navigation"',
      wcagRule: '1.3.1 Info and Relationships'
    });
  }
  
  // Check for proper mobile touch feedback
  const interactiveElements = document.querySelectorAll('button, a, [role="button"], [tabindex="0"]');
  let elementsWithoutFeedback = 0;
  
  interactiveElements.forEach((element) => {
    const styles = window.getComputedStyle(element);
    const hasTransition = styles.transition !== 'all 0s ease 0s';
    const hasTransform = styles.transform !== 'none';
    
    // Check if element has some form of visual feedback
    if (!hasTransition && !hasTransform) {
      elementsWithoutFeedback++;
    }
  });
  
  if (elementsWithoutFeedback > 0) {
    issues.push({
      type: 'info',
      element: `${elementsWithoutFeedback} interactive elements`,
      issue: 'Elements may lack visual feedback on touch',
      suggestion: 'Consider adding hover/focus transitions for touch feedback',
      wcagRule: '3.2.1 On Focus'
    });
  }
  
  return issues;
};

// Test mobile screen reader compatibility
export const testScreenReaderCompatibility = (): { passed: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Check for screen reader specific optimizations
  const srOnlyElements = document.querySelectorAll('.sr-only, .visually-hidden');
  if (srOnlyElements.length === 0) {
    issues.push('No screen reader only content found - consider adding contextual help');
  }
  
  // Check for live regions
  const liveRegions = document.querySelectorAll('[aria-live], [aria-atomic]');
  if (liveRegions.length === 0) {
    issues.push('No live regions found - dynamic content may not be announced');
  }
  
  // Check for proper form labeling
  const forms = document.querySelectorAll('form');
  forms.forEach((form, index) => {
    const inputs = form.querySelectorAll('input, select, textarea');
    let unlabeledInputs = 0;
    
    inputs.forEach((input) => {
      const hasLabel = document.querySelector(`label[for="${input.id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label');
      const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
      
      if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
        unlabeledInputs++;
      }
    });
    
    if (unlabeledInputs > 0) {
      issues.push(`Form ${index + 1} has ${unlabeledInputs} unlabeled inputs`);
    }
  });
  
  return {
    passed: issues.length === 0,
    issues
  };
};

// Check mobile gesture conflicts
export const checkGestureConflicts = (): { passed: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Check for elements that might conflict with browser gestures
  const elementsWithSwipe = document.querySelectorAll('[data-swipeable], .swipeable');
  const elementsWithDrag = document.querySelectorAll('[draggable="true"]');
  
  if (elementsWithSwipe.length > 0 && elementsWithDrag.length > 0) {
    issues.push('Both swipe and drag elements detected - potential gesture conflicts');
  }
  
  // Check for proper touch-action CSS
  const touchElements = document.querySelectorAll('button, a, [role="button"]');
  let elementsWithoutTouchAction = 0;
  
  touchElements.forEach((element) => {
    const styles = window.getComputedStyle(element);
    if (styles.touchAction === 'auto') {
      elementsWithoutTouchAction++;
    }
  });
  
  if (elementsWithoutTouchAction > touchElements.length * 0.5) {
    issues.push('Many elements lack touch-action optimization');
  }
  
  return {
    passed: issues.length === 0,
    issues
  };
};

// Export for console usage in development
if (typeof window !== 'undefined') {
  (window as any).accessibilityAudit = {
    runAccessibilityAudit,
    runMobileAccessibilityAudit,
    respectsReducedMotion,
    checkViewportConfiguration,
    validateARIAUsage,
    testScreenReaderCompatibility,
    checkGestureConflicts,
  };
}