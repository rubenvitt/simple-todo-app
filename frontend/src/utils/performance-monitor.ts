/**
 * Performance Monitor
 * Monitor bundle sizes, loading times, and optimization metrics
 */

interface PerformanceMetrics {
  bundleLoadTime: number;
  chunkLoadTimes: Map<string, number>;
  totalBundleSize: number;
  cacheHitRate: number;
  routeLoadTimes: Map<string, number>;
  memoryUsage?: MemoryInfo;
  connectionType?: string;
}

interface ChunkLoadEvent {
  chunkName: string;
  loadTime: number;
  size?: number;
  fromCache: boolean;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private observers: PerformanceObserver[] = [];
  private chunkLoadEvents: ChunkLoadEvent[] = [];
  private routeLoadStartTimes = new Map<string, number>();

  private constructor() {
    this.metrics = {
      bundleLoadTime: 0,
      chunkLoadTimes: new Map(),
      totalBundleSize: 0,
      cacheHitRate: 0,
      routeLoadTimes: new Map(),
    };

    this.initializeObservers();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    // Resource timing observer
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleResourceEntry(entry as PerformanceResourceTiming);
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource timing observer not supported:', error);
    }

    // Navigation timing observer
    try {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleNavigationEntry(entry as PerformanceNavigationTiming);
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);
    } catch (error) {
      console.warn('Navigation timing observer not supported:', error);
    }

    // Measure timing observer for route changes
    try {
      const measureObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleMeasureEntry(entry as PerformanceMeasure);
        }
      });
      measureObserver.observe({ entryTypes: ['measure'] });
      this.observers.push(measureObserver);
    } catch (error) {
      console.warn('Measure timing observer not supported:', error);
    }
  }

  /**
   * Handle resource timing entries
   */
  private handleResourceEntry(entry: PerformanceResourceTiming): void {
    const { name, transferSize, duration, decodedBodySize } = entry;
    
    // Track JavaScript chunks
    if (name.includes('.js') && (name.includes('chunk') || name.includes('assets'))) {
      const chunkName = this.extractChunkName(name);
      const fromCache = transferSize === 0 && decodedBodySize > 0;
      
      this.chunkLoadEvents.push({
        chunkName,
        loadTime: duration,
        size: decodedBodySize,
        fromCache,
      });
      
      this.metrics.chunkLoadTimes.set(chunkName, duration);
      
      // Update cache hit rate
      this.updateCacheHitRate();
    }

    // Track total bundle size
    if (transferSize > 0) {
      this.metrics.totalBundleSize += transferSize;
    }
  }

  /**
   * Handle navigation timing entries
   */
  private handleNavigationEntry(entry: PerformanceNavigationTiming): void {
    this.metrics.bundleLoadTime = entry.loadEventEnd - entry.navigationStart;
  }

  /**
   * Handle measure timing entries
   */
  private handleMeasureEntry(entry: PerformanceMeasure): void {
    if (entry.name.startsWith('route-load:')) {
      const routeName = entry.name.replace('route-load:', '');
      this.metrics.routeLoadTimes.set(routeName, entry.duration);
    }
  }

  /**
   * Extract chunk name from resource URL
   */
  private extractChunkName(url: string): string {
    const match = url.match(/([^\/]+)\.js$/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    const totalChunks = this.chunkLoadEvents.length;
    const cachedChunks = this.chunkLoadEvents.filter(event => event.fromCache).length;
    this.metrics.cacheHitRate = totalChunks > 0 ? (cachedChunks / totalChunks) * 100 : 0;
  }

  /**
   * Start measuring route load time
   */
  startRouteLoad(routeName: string): void {
    this.routeLoadStartTimes.set(routeName, performance.now());
  }

  /**
   * End measuring route load time
   */
  endRouteLoad(routeName: string): void {
    const startTime = this.routeLoadStartTimes.get(routeName);
    if (startTime) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Create performance measure
      performance.mark(`route-load-end:${routeName}`);
      performance.measure(`route-load:${routeName}`, { start: startTime, end: endTime });
      
      this.routeLoadStartTimes.delete(routeName);
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    // Update memory usage if available
    if ('memory' in performance) {
      this.metrics.memoryUsage = (performance as any).memory;
    }

    // Update connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.metrics.connectionType = connection?.effectiveType;
    }

    return { ...this.metrics };
  }

  /**
   * Get chunk load statistics
   */
  getChunkStats() {
    const chunks = Array.from(this.metrics.chunkLoadTimes.entries());
    const avgLoadTime = chunks.reduce((sum, [, time]) => sum + time, 0) / chunks.length;
    
    return {
      totalChunks: chunks.length,
      averageLoadTime: avgLoadTime,
      slowestChunk: chunks.reduce((slowest, [name, time]) => 
        time > slowest.time ? { name, time } : slowest, 
        { name: '', time: 0 }
      ),
      fastestChunk: chunks.reduce((fastest, [name, time]) => 
        time < fastest.time ? { name, time } : fastest, 
        { name: '', time: Infinity }
      ),
    };
  }

  /**
   * Get bundle size breakdown
   */
  getBundleSizeBreakdown() {
    const chunkSizes = this.chunkLoadEvents
      .filter(event => event.size)
      .map(event => ({ name: event.chunkName, size: event.size! }));

    const totalSize = chunkSizes.reduce((sum, chunk) => sum + chunk.size, 0);
    
    return {
      totalSize,
      chunks: chunkSizes.sort((a, b) => b.size - a.size),
      largestChunk: chunkSizes.reduce((largest, chunk) => 
        chunk.size > largest.size ? chunk : largest, 
        { name: '', size: 0 }
      ),
    };
  }

  /**
   * Log performance report to console
   */
  logPerformanceReport(): void {
    const metrics = this.getMetrics();
    const chunkStats = this.getChunkStats();
    const bundleBreakdown = this.getBundleSizeBreakdown();

    console.group('📊 Performance Report');
    
    console.log('Bundle Load Time:', `${metrics.bundleLoadTime.toFixed(2)}ms`);
    console.log('Total Bundle Size:', `${(bundleBreakdown.totalSize / 1024).toFixed(2)}KB`);
    console.log('Cache Hit Rate:', `${metrics.cacheHitRate.toFixed(1)}%`);
    console.log('Connection Type:', metrics.connectionType || 'Unknown');
    
    if (chunkStats.totalChunks > 0) {
      console.group('Chunk Statistics');
      console.log('Total Chunks:', chunkStats.totalChunks);
      console.log('Average Load Time:', `${chunkStats.averageLoadTime.toFixed(2)}ms`);
      console.log('Slowest Chunk:', `${chunkStats.slowestChunk.name} (${chunkStats.slowestChunk.time.toFixed(2)}ms)`);
      console.log('Largest Chunk:', `${bundleBreakdown.largestChunk.name} (${(bundleBreakdown.largestChunk.size / 1024).toFixed(2)}KB)`);
      console.groupEnd();
    }

    if (metrics.routeLoadTimes.size > 0) {
      console.group('Route Load Times');
      Array.from(metrics.routeLoadTimes.entries()).forEach(([route, time]) => {
        console.log(`${route}:`, `${time.toFixed(2)}ms`);
      });
      console.groupEnd();
    }

    if (metrics.memoryUsage) {
      console.group('Memory Usage');
      console.log('Used JS Heap Size:', `${(metrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      console.log('Total JS Heap Size:', `${(metrics.memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();
    const chunkStats = this.getChunkStats();
    const bundleBreakdown = this.getBundleSizeBreakdown();

    // Bundle size recommendations
    if (bundleBreakdown.totalSize > 1024 * 1024) { // > 1MB
      recommendations.push('Consider reducing bundle size - current size exceeds 1MB');
    }

    // Cache hit rate recommendations
    if (metrics.cacheHitRate < 50) {
      recommendations.push('Low cache hit rate - consider improving caching strategy');
    }

    // Load time recommendations
    if (metrics.bundleLoadTime > 3000) {
      recommendations.push('High bundle load time - consider code splitting or optimization');
    }

    // Chunk recommendations
    if (chunkStats.totalChunks > 20) {
      recommendations.push('High number of chunks - consider consolidating smaller chunks');
    }

    if (chunkStats.averageLoadTime > 1000) {
      recommendations.push('Slow average chunk load time - check network or chunk sizes');
    }

    return recommendations;
  }

  /**
   * Clean up observers
   */
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Export singleton instance and utility functions
export const performanceMonitor = PerformanceMonitor.getInstance();

export const startRouteLoad = (routeName: string) => {
  performanceMonitor.startRouteLoad(routeName);
};

export const endRouteLoad = (routeName: string) => {
  performanceMonitor.endRouteLoad(routeName);
};

export const logPerformanceReport = () => {
  performanceMonitor.logPerformanceReport();
};

export const getPerformanceMetrics = () => {
  return performanceMonitor.getMetrics();
};

export default performanceMonitor;