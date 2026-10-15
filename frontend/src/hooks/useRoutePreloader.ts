/**
 * Route Preloader Hook
 * Intelligent preloading for critical routes and resources
 */

import { useCallback, useEffect, useRef } from 'react';

interface PreloadOptions {
  priority?: 'high' | 'low';
  delay?: number;
  condition?: () => boolean;
  as?: 'script' | 'style' | 'font' | 'image';
}

interface RoutePreloadConfig {
  route: string;
  chunkName?: string;
  priority?: 'high' | 'low';
  preloadOn?: 'hover' | 'focus' | 'intersect' | 'immediate';
  condition?: () => boolean;
}

class RoutePreloader {
  private static instance: RoutePreloader;
  private preloadedRoutes = new Set<string>();
  private preloadPromises = new Map<string, Promise<void>>();
  private linkCache = new Map<string, HTMLLinkElement>();

  static getInstance(): RoutePreloader {
    if (!RoutePreloader.instance) {
      RoutePreloader.instance = new RoutePreloader();
    }
    return RoutePreloader.instance;
  }

  /**
   * Preload a route's JavaScript bundle
   */
  async preloadRoute(route: string, options: PreloadOptions = {}): Promise<void> {
    const { priority = 'low', delay = 0, condition, as = 'script' } = options;

    // Check condition before preloading
    if (condition && !condition()) {
      return;
    }

    // Don't preload if already done
    if (this.preloadedRoutes.has(route)) {
      return;
    }

    // Return existing promise if preloading is in progress
    if (this.preloadPromises.has(route)) {
      return this.preloadPromises.get(route);
    }

    const preloadPromise = this.executePreload(route, { priority, delay, as });
    this.preloadPromises.set(route, preloadPromise);

    try {
      await preloadPromise;
      this.preloadedRoutes.add(route);
    } finally {
      this.preloadPromises.delete(route);
    }
  }

  /**
   * Execute the actual preload
   */
  private async executePreload(
    route: string, 
    options: { priority: 'high' | 'low'; delay: number; as: string }
  ): Promise<void> {
    const { priority, delay, as } = options;

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return new Promise((resolve, reject) => {
      // For script modules, we need to dynamically import them
      if (as === 'script') {
        this.preloadScriptModule(route)
          .then(resolve)
          .catch(reject);
        return;
      }

      // For other resources, use link prefetch
      const link = document.createElement('link');
      link.rel = priority === 'high' ? 'preload' : 'prefetch';
      link.as = as;
      link.href = route;

      if (priority === 'high') {
        link.setAttribute('importance', 'high');
      }

      link.onload = () => {
        this.linkCache.set(route, link);
        resolve();
      };
      
      link.onerror = () => {
        reject(new Error(`Failed to preload resource: ${route}`));
      };

      document.head.appendChild(link);
    });
  }

  /**
   * Preload script modules using dynamic import
   */
  private async preloadScriptModule(route: string): Promise<void> {
    try {
      // This will preload the module but not execute it
      await import(/* webpackPreload: true */ route);
    } catch (error) {
      console.warn('Failed to preload module:', route, error);
      throw error;
    }
  }

  /**
   * Preload multiple routes in order of priority
   */
  async preloadRoutes(configs: RoutePreloadConfig[]): Promise<void> {
    // Sort by priority
    const sortedConfigs = configs.sort((a, b) => {
      const priorityOrder = { high: 2, low: 1 };
      return (priorityOrder[b.priority || 'low'] || 1) - (priorityOrder[a.priority || 'low'] || 1);
    });

    // Preload high priority routes first
    const highPriorityRoutes = sortedConfigs.filter(config => config.priority === 'high');
    const lowPriorityRoutes = sortedConfigs.filter(config => config.priority !== 'high');

    // Execute high priority preloads in parallel
    await Promise.allSettled(
      highPriorityRoutes.map(config => 
        this.preloadRoute(config.route, { 
          priority: 'high',
          condition: config.condition 
        })
      )
    );

    // Execute low priority preloads with delay
    for (const config of lowPriorityRoutes) {
      try {
        await this.preloadRoute(config.route, { 
          priority: 'low',
          delay: 100,
          condition: config.condition 
        });
      } catch (error) {
        console.warn('Failed to preload route:', config.route, error);
      }
    }
  }

  /**
   * Check if route is already preloaded
   */
  isPreloaded(route: string): boolean {
    return this.preloadedRoutes.has(route);
  }

  /**
   * Clear preload cache
   */
  clearCache(): void {
    this.preloadedRoutes.clear();
    this.preloadPromises.clear();
    
    // Remove preload links from DOM
    this.linkCache.forEach(link => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    });
    this.linkCache.clear();
  }
}

/**
 * Hook for route preloading
 */
export function useRoutePreloader() {
  const preloader = RoutePreloader.getInstance();

  const preloadRoute = useCallback((route: string, options?: PreloadOptions) => {
    return preloader.preloadRoute(route, options);
  }, [preloader]);

  const preloadRoutes = useCallback((configs: RoutePreloadConfig[]) => {
    return preloader.preloadRoutes(configs);
  }, [preloader]);

  const isPreloaded = useCallback((route: string) => {
    return preloader.isPreloaded(route);
  }, [preloader]);

  return {
    preloadRoute,
    preloadRoutes,
    isPreloaded,
    clearCache: preloader.clearCache.bind(preloader),
  };
}

/**
 * Hook for preloading on hover/focus
 */
export function usePreloadOnHover(route: string, options: PreloadOptions = {}) {
  const { preloadRoute } = useRoutePreloader();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = useCallback(() => {
    // Small delay to avoid preloading on accidental hovers
    timeoutRef.current = setTimeout(() => {
      preloadRoute(route, { priority: 'high', ...options });
    }, 100);
  }, [route, preloadRoute, options]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const handleFocus = useCallback(() => {
    preloadRoute(route, { priority: 'high', ...options });
  }, [route, preloadRoute, options]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
  };
}

/**
 * Critical routes configuration
 */
export const CRITICAL_ROUTES: RoutePreloadConfig[] = [
  {
    route: '/dashboard',
    priority: 'high',
    preloadOn: 'immediate',
    condition: () => localStorage.getItem('authToken') !== null,
  },
  {
    route: '/lists',
    priority: 'high',
    preloadOn: 'hover',
    condition: () => localStorage.getItem('authToken') !== null,
  },
  {
    route: '/profile',
    priority: 'low',
    preloadOn: 'hover',
    condition: () => localStorage.getItem('authToken') !== null,
  },
  {
    route: '/settings',
    priority: 'low',
    preloadOn: 'hover',
    condition: () => localStorage.getItem('authToken') !== null,
  },
];

/**
 * Auto-preload critical routes based on user state
 */
export function useAutoPreloadCriticalRoutes() {
  const { preloadRoutes } = useRoutePreloader();

  useEffect(() => {
    // Preload critical routes after initial page load
    const timer = setTimeout(() => {
      preloadRoutes(CRITICAL_ROUTES);
    }, 2000); // Wait 2 seconds after page load

    return () => clearTimeout(timer);
  }, [preloadRoutes]);
}

export default useRoutePreloader;