export interface TouchMetric {
  touchStart: number;
  touchEnd: number;
  latency: number;
  target: string;
  timestamp: number;
}

export interface ScrollMetric {
  fps: number;
  jankCount: number;
  smoothness: number;
  timestamp: number;
}

export interface AnimationMetric {
  averageFps: number;
  droppedFrames: number;
  duration: number;
  timestamp: number;
}

export interface MemoryMetric {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  timestamp: number;
}

class MobilePerformanceService {
  private touchMetrics: TouchMetric[] = [];
  private scrollMetrics: ScrollMetric[] = [];
  private animationMetrics: AnimationMetric[] = [];
  private memoryMetrics: MemoryMetric[] = [];
  
  private isMonitoring = false;
  private touchStartTime = 0;
  private lastScrollTime = 0;
  private scrollFrames: number[] = [];
  private animationFrameId?: number;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    // Touch performance monitoring
    this.setupTouchMonitoring();
    
    // Scroll performance monitoring
    this.setupScrollMonitoring();
    
    // Memory monitoring
    this.setupMemoryMonitoring();
  }

  private setupTouchMonitoring() {
    document.addEventListener('touchstart', (e) => {
      this.touchStartTime = performance.now();
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (this.touchStartTime) {
        const touchEndTime = performance.now();
        const latency = touchEndTime - this.touchStartTime;
        
        const metric: TouchMetric = {
          touchStart: this.touchStartTime,
          touchEnd: touchEndTime,
          latency,
          target: (e.target as HTMLElement)?.tagName || 'unknown',
          timestamp: Date.now()
        };
        
        this.touchMetrics.push(metric);
        this.cleanupOldMetrics();
        
        if (process.env.NODE_ENV === 'development' && latency > 16) {
          console.warn(`[Mobile Performance] Touch latency: ${latency.toFixed(2)}ms (target: <16ms)`);
        }
      }
    }, { passive: true });
  }

  private setupScrollMonitoring() {
    let scrolling = false;
    let scrollStartTime = 0;
    
    const measureScrollPerformance = () => {
      if (!scrolling) return;
      
      const now = performance.now();
      if (scrollStartTime) {
        const frameDuration = now - this.lastScrollTime;
        this.scrollFrames.push(frameDuration);
      } else {
        scrollStartTime = now;
      }
      
      this.lastScrollTime = now;
      this.animationFrameId = requestAnimationFrame(measureScrollPerformance);
    };

    document.addEventListener('scroll', () => {
      if (!scrolling) {
        scrolling = true;
        this.scrollFrames = [];
        measureScrollPerformance();
      }
      
      // Stop monitoring after scroll ends
      clearTimeout((window as any).scrollEndTimer);
      (window as any).scrollEndTimer = setTimeout(() => {
        scrolling = false;
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
        }
        this.calculateScrollMetrics();
      }, 150);
    }, { passive: true });
  }

  private calculateScrollMetrics() {
    if (this.scrollFrames.length === 0) return;
    
    const averageFrameTime = this.scrollFrames.reduce((a, b) => a + b, 0) / this.scrollFrames.length;
    const fps = 1000 / averageFrameTime;
    const jankCount = this.scrollFrames.filter(frame => frame > 16.67).length; // 60fps threshold
    const smoothness = ((this.scrollFrames.length - jankCount) / this.scrollFrames.length) * 100;
    
    const metric: ScrollMetric = {
      fps: Math.round(fps),
      jankCount,
      smoothness: Math.round(smoothness),
      timestamp: Date.now()
    };
    
    this.scrollMetrics.push(metric);
    this.cleanupOldMetrics();
    
    if (process.env.NODE_ENV === 'development' && fps < 50) {
      console.warn(`[Mobile Performance] Scroll FPS: ${fps.toFixed(1)} (jank frames: ${jankCount})`);
    }
  }

  private setupMemoryMonitoring() {
    if (!('memory' in performance)) return;
    
    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        const metric: MemoryMetric = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        };
        
        this.memoryMetrics.push(metric);
        this.cleanupOldMetrics();
        
        // Warn if memory usage is high
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          console.warn('[Mobile Performance] High memory usage detected');
        }
      }
    }, 10000); // Check every 10 seconds
  }

  public measureAnimation(name: string, duration: number): AnimationMetric {
    const frames: number[] = [];
    let lastFrameTime = performance.now();
    let droppedFrames = 0;
    
    const measureFrame = () => {
      const now = performance.now();
      const frameDuration = now - lastFrameTime;
      frames.push(frameDuration);
      
      if (frameDuration > 16.67) { // 60fps threshold
        droppedFrames++;
      }
      
      lastFrameTime = now;
      
      if (now - frames[0] < duration) {
        requestAnimationFrame(measureFrame);
      } else {
        const averageFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
        const averageFps = 1000 / averageFrameTime;
        
        const metric: AnimationMetric = {
          averageFps: Math.round(averageFps),
          droppedFrames,
          duration: now - frames[0],
          timestamp: Date.now()
        };
        
        this.animationMetrics.push(metric);
        this.cleanupOldMetrics();
        
        if (process.env.NODE_ENV === 'development' && averageFps < 50) {
          console.warn(`[Mobile Performance] Animation "${name}" FPS: ${averageFps.toFixed(1)}`);
        }
      }
    };
    
    requestAnimationFrame(measureFrame);
    
    // Return a placeholder metric
    return {
      averageFps: 0,
      droppedFrames: 0,
      duration: 0,
      timestamp: Date.now()
    };
  }

  private cleanupOldMetrics() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    this.touchMetrics = this.touchMetrics.filter(m => m.timestamp > fiveMinutesAgo);
    this.scrollMetrics = this.scrollMetrics.filter(m => m.timestamp > fiveMinutesAgo);
    this.animationMetrics = this.animationMetrics.filter(m => m.timestamp > fiveMinutesAgo);
    this.memoryMetrics = this.memoryMetrics.filter(m => m.timestamp > fiveMinutesAgo);
  }

  public getTouchMetrics(): TouchMetric[] {
    return [...this.touchMetrics];
  }

  public getScrollMetrics(): ScrollMetric[] {
    return [...this.scrollMetrics];
  }

  public getAnimationMetrics(): AnimationMetric[] {
    return [...this.animationMetrics];
  }

  public getMemoryMetrics(): MemoryMetric[] {
    return [...this.memoryMetrics];
  }

  public getAverageTouchLatency(): number {
    if (this.touchMetrics.length === 0) return 0;
    const total = this.touchMetrics.reduce((sum, m) => sum + m.latency, 0);
    return total / this.touchMetrics.length;
  }

  public getAverageScrollFPS(): number {
    if (this.scrollMetrics.length === 0) return 60;
    const total = this.scrollMetrics.reduce((sum, m) => sum + m.fps, 0);
    return total / this.scrollMetrics.length;
  }

  public clearMetrics() {
    this.touchMetrics = [];
    this.scrollMetrics = [];
    this.animationMetrics = [];
    this.memoryMetrics = [];
  }
}

export const mobilePerformance = new MobilePerformanceService();