/**
 * Resource Preloader Utility
 * Preload critical assets and resources for better performance
 */

interface ResourceHint {
  href: string;
  as?: 'script' | 'style' | 'font' | 'image' | 'audio' | 'video' | 'document';
  type?: string;
  crossorigin?: 'anonymous' | 'use-credentials';
  media?: string;
  rel?: 'preload' | 'prefetch' | 'preconnect' | 'dns-prefetch';
  importance?: 'high' | 'low' | 'auto';
}

class ResourcePreloader {
  private static instance: ResourcePreloader;
  private preloadedResources = new Set<string>();
  private linkElements = new Map<string, HTMLLinkElement>();

  static getInstance(): ResourcePreloader {
    if (!ResourcePreloader.instance) {
      ResourcePreloader.instance = new ResourcePreloader();
    }
    return ResourcePreloader.instance;
  }

  /**
   * Add resource hint to document head
   */
  addResourceHint(hint: ResourceHint): void {
    const key = `${hint.rel}-${hint.href}`;
    
    if (this.preloadedResources.has(key)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = hint.rel || 'preload';
    link.href = hint.href;

    if (hint.as) link.as = hint.as;
    if (hint.type) link.type = hint.type;
    if (hint.crossorigin) link.crossOrigin = hint.crossorigin;
    if (hint.media) link.media = hint.media;
    if (hint.importance) link.setAttribute('importance', hint.importance);

    document.head.appendChild(link);
    this.linkElements.set(key, link);
    this.preloadedResources.add(key);
  }

  /**
   * Preload critical fonts
   */
  preloadFonts(): void {
    const fonts = [
      '/fonts/inter-regular.woff2',
      '/fonts/inter-medium.woff2',
      '/fonts/inter-semibold.woff2',
    ];

    fonts.forEach(font => {
      this.addResourceHint({
        href: font,
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous',
        rel: 'preload',
        importance: 'high',
      });
    });
  }

  /**
   * Preload critical API endpoints
   */
  preloadCriticalEndpoints(): void {
    const endpoints = [
      '/api/auth/me',
      '/api/lists',
      '/api/notifications',
    ];

    endpoints.forEach(endpoint => {
      this.addResourceHint({
        href: endpoint,
        rel: 'prefetch',
        as: 'fetch',
        importance: 'high',
      });
    });
  }

  /**
   * Preconnect to external domains
   */
  preconnectToDomains(): void {
    const domains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://api.cdnjs.com',
    ];

    domains.forEach(domain => {
      this.addResourceHint({
        href: domain,
        rel: 'preconnect',
        crossorigin: 'anonymous',
      });
    });
  }

  /**
   * DNS prefetch for better connection times
   */
  dnsPrefetch(): void {
    const domains = [
      'https://cdn.jsdelivr.net',
      'https://unpkg.com',
    ];

    domains.forEach(domain => {
      this.addResourceHint({
        href: domain,
        rel: 'dns-prefetch',
      });
    });
  }

  /**
   * Preload critical images
   */
  preloadCriticalImages(): void {
    const images = [
      '/icons/icon-192x192.png',
      '/icons/icon-512x512.png',
      '/vite.svg',
    ];

    images.forEach(image => {
      this.addResourceHint({
        href: image,
        as: 'image',
        rel: 'preload',
        importance: 'low',
      });
    });
  }

  /**
   * Initialize all critical resource preloading
   */
  initializeCriticalResources(): void {
    // High priority resources
    this.preconnectToDomains();
    this.dnsPrefetch();
    
    // Wait a bit before loading non-critical resources
    setTimeout(() => {
      this.preloadFonts();
      this.preloadCriticalImages();
      
      // Preload API endpoints only if user is likely authenticated
      if (localStorage.getItem('authToken')) {
        this.preloadCriticalEndpoints();
      }
    }, 1000);
  }

  /**
   * Preload resources based on user interaction hints
   */
  preloadOnUserHint(action: 'login' | 'logout' | 'navigation'): void {
    switch (action) {
      case 'login':
        this.preloadCriticalEndpoints();
        break;
      case 'logout':
        // Preload login-related resources
        this.addResourceHint({
          href: '/login',
          rel: 'prefetch',
        });
        break;
      case 'navigation':
        // Preload likely next pages
        this.addResourceHint({
          href: '/dashboard',
          rel: 'prefetch',
        });
        this.addResourceHint({
          href: '/lists',
          rel: 'prefetch',
        });
        break;
    }
  }

  /**
   * Clean up resource hints
   */
  cleanup(): void {
    this.linkElements.forEach(link => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    });
    
    this.linkElements.clear();
    this.preloadedResources.clear();
  }

  /**
   * Get preload statistics
   */
  getStats() {
    return {
      totalPreloaded: this.preloadedResources.size,
      preloadedResources: Array.from(this.preloadedResources),
    };
  }
}

// Export singleton instance and utility functions
export const resourcePreloader = ResourcePreloader.getInstance();

export const initializeCriticalResources = () => {
  resourcePreloader.initializeCriticalResources();
};

export const preloadOnUserHint = (action: 'login' | 'logout' | 'navigation') => {
  resourcePreloader.preloadOnUserHint(action);
};

export const addResourceHint = (hint: ResourceHint) => {
  resourcePreloader.addResourceHint(hint);
};

export default resourcePreloader;