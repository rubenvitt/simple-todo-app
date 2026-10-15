/**
 * Preload Link Component
 * Navigation link with intelligent route preloading
 */

import React, { forwardRef } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { usePreloadOnHover } from '../../hooks/useRoutePreloader';

interface PreloadLinkProps extends LinkProps {
  preloadOnHover?: boolean;
  preloadOnFocus?: boolean;
  preloadDelay?: number;
  priority?: 'high' | 'low';
  condition?: () => boolean;
}

export const PreloadLink = forwardRef<HTMLAnchorElement, PreloadLinkProps>(
  ({
    to,
    children,
    preloadOnHover = true,
    preloadOnFocus = true,
    preloadDelay = 100,
    priority = 'high',
    condition,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    ...props
  }, ref) => {
    const route = typeof to === 'string' ? to : to.pathname || '';
    
    const preloadHandlers = usePreloadOnHover(route, {
      priority,
      delay: preloadDelay,
      condition,
    });

    const handleMouseEnter = (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (preloadOnHover) {
        preloadHandlers.onMouseEnter();
      }
      onMouseEnter?.(event);
    };

    const handleMouseLeave = (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (preloadOnHover) {
        preloadHandlers.onMouseLeave();
      }
      onMouseLeave?.(event);
    };

    const handleFocus = (event: React.FocusEvent<HTMLAnchorElement>) => {
      if (preloadOnFocus) {
        preloadHandlers.onFocus();
      }
      onFocus?.(event);
    };

    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

PreloadLink.displayName = 'PreloadLink';

export default PreloadLink;