/**
 * Animation Performance Monitoring and Accessibility
 * 
 * Provides tools for:
 * - Reduced motion preference detection
 * - Animation performance monitoring
 * - Frame rate tracking
 * - Performance budgets and alerts
 * - Accessibility compliance
 */

import React from 'react';

// Performance monitoring configuration
export interface AnimationPerformanceConfig {
  targetFPS: number;
  warningThreshold: number;
  criticalThreshold: number;
  monitoringEnabled: boolean;
  debugMode: boolean;
}

const defaultConfig: AnimationPerformanceConfig = {
  targetFPS: 60,
  warningThreshold: 45,
  criticalThreshold: 30,
  monitoringEnabled: process.env.NODE_ENV === 'development',
  debugMode: process.env.NODE_ENV === 'development'
};

// Animation performance metrics
export interface PerformanceMetrics {
  fps: number;
  frameDrops: number;
  avgFrameTime: number;
  maxFrameTime: number;
  totalFrames: number;
  timestamp: number;
}

// Reduced motion detection
export class ReducedMotionManager {
  private static instance: ReducedMotionManager;
  private mediaQuery: MediaQueryList;
  private listeners: Set<(prefersReduced: boolean) => void> = new Set();
  private prefersReduced: boolean = false;

  private constructor() {
    this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.prefersReduced = this.mediaQuery.matches;
    
    // Listen for changes
    this.mediaQuery.addEventListener('change', this.handleChange.bind(this));
  }

  static getInstance(): ReducedMotionManager {
    if (!ReducedMotionManager.instance) {
      ReducedMotionManager.instance = new ReducedMotionManager();
    }
    return ReducedMotionManager.instance;
  }

  private handleChange(event: MediaQueryListEvent): void {
    this.prefersReduced = event.matches;
    this.listeners.forEach(listener => listener(this.prefersReduced));
  }

  getPrefersReducedMotion(): boolean {
    return this.prefersReduced;
  }

  subscribe(listener: (prefersReduced: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Get safe animation configuration based on preferences
  getSafeAnimationConfig(duration: number): { duration: number; easing: string } {
    if (this.prefersReduced) {
      return {
        duration: Math.min(duration * 0.01, 0.05), // Nearly instant
        easing: 'ease'
      };
    }
    return {
      duration,
      easing: 'ease-out'
    };
  }
}

// Animation performance monitor
export class AnimationPerformanceMonitor {
  private static instance: AnimationPerformanceMonitor;
  private config: AnimationPerformanceConfig;
  private isMonitoring: boolean = false;
  private metrics: PerformanceMetrics;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private frameTimes: number[] = [];
  private animationFrame: number | null = null;
  private observers: Set<(metrics: PerformanceMetrics) => void> = new Set();

  private constructor(config: Partial<AnimationPerformanceConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.metrics = this.createInitialMetrics();
  }

  static getInstance(config?: Partial<AnimationPerformanceConfig>): AnimationPerformanceMonitor {
    if (!AnimationPerformanceMonitor.instance) {
      AnimationPerformanceMonitor.instance = new AnimationPerformanceMonitor(config);
    }
    return AnimationPerformanceMonitor.instance;
  }

  private createInitialMetrics(): PerformanceMetrics {
    return {
      fps: 0,
      frameDrops: 0,
      avgFrameTime: 0,
      maxFrameTime: 0,
      totalFrames: 0,
      timestamp: performance.now()
    };
  }

  startMonitoring(): void {
    if (this.isMonitoring || !this.config.monitoringEnabled) return;

    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.frameTimes = [];
    this.metrics = this.createInitialMetrics();

    this.monitorFrame();

    if (this.config.debugMode) {
      console.log('🎭 Animation performance monitoring started');
    }
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.config.debugMode) {
      console.log('🎭 Animation performance monitoring stopped');
      this.logMetrics();
    }
  }

  private monitorFrame(): void {
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastTime;
    
    this.frameCount++;
    this.frameTimes.push(frameTime);
    
    // Keep only last 60 frame times (1 second at 60fps)
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    // Calculate metrics every second
    if (currentTime - this.metrics.timestamp >= 1000) {
      this.updateMetrics(currentTime);
    }

    this.lastTime = currentTime;
    
    if (this.isMonitoring) {
      this.animationFrame = requestAnimationFrame(() => this.monitorFrame());
    }
  }

  private updateMetrics(currentTime: number): void {
    const timeDelta = currentTime - this.metrics.timestamp;
    const fps = Math.round((this.frameCount * 1000) / timeDelta);
    
    const avgFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
    const maxFrameTime = Math.max(...this.frameTimes);
    
    // Count frame drops (frames that took longer than 16.67ms)
    const frameDrops = this.frameTimes.filter(time => time > 16.67).length;

    this.metrics = {
      fps,
      frameDrops,
      avgFrameTime,
      maxFrameTime,
      totalFrames: this.metrics.totalFrames + this.frameCount,
      timestamp: currentTime
    };

    // Check performance thresholds
    this.checkPerformanceThresholds(fps);

    // Notify observers
    this.observers.forEach(observer => observer(this.metrics));

    // Reset counters
    this.frameCount = 0;
  }

  private checkPerformanceThresholds(fps: number): void {
    if (fps < this.config.criticalThreshold) {
      console.error(`🎭 Critical animation performance: ${fps} FPS`);
      this.handleCriticalPerformance();
    } else if (fps < this.config.warningThreshold) {
      console.warn(`🎭 Animation performance warning: ${fps} FPS`);
      this.handleWarningPerformance();
    }
  }

  private handleCriticalPerformance(): void {
    // Automatically reduce animation complexity
    document.documentElement.style.setProperty('--animation-complexity', 'reduced');
    
    // Notify app to disable non-essential animations
    window.dispatchEvent(new CustomEvent('animation-performance-critical', {
      detail: { metrics: this.metrics }
    }));
  }

  private handleWarningPerformance(): void {
    // Notify app of performance concerns
    window.dispatchEvent(new CustomEvent('animation-performance-warning', {
      detail: { metrics: this.metrics }
    }));
  }

  private logMetrics(): void {
    console.group('🎭 Animation Performance Metrics');
    console.log('FPS:', this.metrics.fps);
    console.log('Frame Drops:', this.metrics.frameDrops);
    console.log('Avg Frame Time:', this.metrics.avgFrameTime.toFixed(2), 'ms');
    console.log('Max Frame Time:', this.metrics.maxFrameTime.toFixed(2), 'ms');
    console.log('Total Frames:', this.metrics.totalFrames);
    console.groupEnd();
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  subscribe(observer: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  updateConfig(newConfig: Partial<AnimationPerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Animation accessibility manager
export class AnimationAccessibilityManager {
  private static instance: AnimationAccessibilityManager;
  private reducedMotionManager: ReducedMotionManager;
  private performanceMonitor: AnimationPerformanceMonitor;
  private fallbackActive: boolean = false;

  private constructor() {
    this.reducedMotionManager = ReducedMotionManager.getInstance();
    this.performanceMonitor = AnimationPerformanceMonitor.getInstance();
    
    this.setupEventListeners();
  }

  static getInstance(): AnimationAccessibilityManager {
    if (!AnimationAccessibilityManager.instance) {
      AnimationAccessibilityManager.instance = new AnimationAccessibilityManager();
    }
    return AnimationAccessibilityManager.instance;
  }

  private setupEventListeners(): void {
    // Listen for reduced motion changes
    this.reducedMotionManager.subscribe((prefersReduced) => {
      this.updateAnimationComplexity(prefersReduced);
    });

    // Listen for performance warnings
    window.addEventListener('animation-performance-warning', this.handlePerformanceWarning.bind(this));
    window.addEventListener('animation-performance-critical', this.handlePerformanceCritical.bind(this));
  }

  private updateAnimationComplexity(reduced: boolean): void {
    document.documentElement.style.setProperty(
      '--animation-complexity', 
      reduced ? 'minimal' : 'full'
    );

    document.documentElement.style.setProperty(
      '--animation-duration-scale', 
      reduced ? '0.01' : '1'
    );

    // Dispatch event for components to react
    window.dispatchEvent(new CustomEvent('animation-accessibility-change', {
      detail: { reducedMotion: reduced }
    }));
  }

  private handlePerformanceWarning(): void {
    if (!this.fallbackActive) {
      console.log('🎭 Switching to performance-optimized animations');
      this.enablePerformanceFallback();
    }
  }

  private handlePerformanceCritical(): void {
    console.log('🎭 Disabling complex animations due to performance');
    this.enableMinimalAnimations();
  }

  private enablePerformanceFallback(): void {
    this.fallbackActive = true;
    document.documentElement.style.setProperty('--animation-complexity', 'optimized');
    document.documentElement.style.setProperty('--animation-duration-scale', '0.7');
  }

  private enableMinimalAnimations(): void {
    this.fallbackActive = true;
    document.documentElement.style.setProperty('--animation-complexity', 'minimal');
    document.documentElement.style.setProperty('--animation-duration-scale', '0.3');
  }

  // Public API
  shouldUseReducedMotion(): boolean {
    return this.reducedMotionManager.getPrefersReducedMotion() || this.fallbackActive;
  }

  getSafeAnimationDuration(baseDuration: number): number {
    const scale = this.shouldUseReducedMotion() ? 0.01 : 1;
    return baseDuration * scale;
  }

  getSafeAnimationVariant<T>(variants: { full: T; reduced: T }): T {
    return this.shouldUseReducedMotion() ? variants.reduced : variants.full;
  }

  // CSS custom properties for styling
  getAnimationCSS(): Record<string, string> {
    const prefersReduced = this.shouldUseReducedMotion();
    
    return {
      '--animation-duration-quick': prefersReduced ? '0.01s' : '0.15s',
      '--animation-duration-standard': prefersReduced ? '0.01s' : '0.25s',
      '--animation-duration-smooth': prefersReduced ? '0.01s' : '0.4s',
      '--animation-easing': prefersReduced ? 'ease' : 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      '--animation-complexity': prefersReduced ? 'minimal' : 'full'
    };
  }
}

// React hooks for using the systems
export const useReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = React.useState(
    ReducedMotionManager.getInstance().getPrefersReducedMotion()
  );

  React.useEffect(() => {
    const manager = ReducedMotionManager.getInstance();
    return manager.subscribe(setPrefersReduced);
  }, []);

  return prefersReduced;
};

export const useAnimationPerformance = () => {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);

  React.useEffect(() => {
    const monitor = AnimationPerformanceMonitor.getInstance();
    monitor.startMonitoring();

    const unsubscribe = monitor.subscribe(setMetrics);

    return () => {
      unsubscribe();
      monitor.stopMonitoring();
    };
  }, []);

  return metrics;
};

export const useAnimationAccessibility = () => {
  const [accessibilityState, setAccessibilityState] = React.useState({
    reducedMotion: false,
    performanceMode: 'full' as 'full' | 'optimized' | 'minimal'
  });

  React.useEffect(() => {
    const manager = AnimationAccessibilityManager.getInstance();
    
    const handleAccessibilityChange = (event: CustomEvent) => {
      setAccessibilityState(prev => ({
        ...prev,
        reducedMotion: event.detail.reducedMotion
      }));
    };

    const handlePerformanceChange = (event: CustomEvent) => {
      const mode = event.type.includes('critical') ? 'minimal' : 'optimized';
      setAccessibilityState(prev => ({
        ...prev,
        performanceMode: mode
      }));
    };

    window.addEventListener('animation-accessibility-change', handleAccessibilityChange as EventListener);
    window.addEventListener('animation-performance-warning', handlePerformanceChange as EventListener);
    window.addEventListener('animation-performance-critical', handlePerformanceChange as EventListener);

    return () => {
      window.removeEventListener('animation-accessibility-change', handleAccessibilityChange as EventListener);
      window.removeEventListener('animation-performance-warning', handlePerformanceChange as EventListener);
      window.removeEventListener('animation-performance-critical', handlePerformanceChange as EventListener);
    };
  }, []);

  return {
    ...accessibilityState,
    shouldUseReducedMotion: () => AnimationAccessibilityManager.getInstance().shouldUseReducedMotion(),
    getSafeAnimationDuration: (duration: number) => AnimationAccessibilityManager.getInstance().getSafeAnimationDuration(duration),
    getSafeAnimationVariant: <T,>(variants: { full: T; reduced: T }) => AnimationAccessibilityManager.getInstance().getSafeAnimationVariant(variants)
  };
};

// Initialize the systems
export const initializeAnimationSystems = () => {
  const accessibilityManager = AnimationAccessibilityManager.getInstance();
  const performanceMonitor = AnimationPerformanceMonitor.getInstance();
  
  // Apply initial CSS custom properties
  const css = accessibilityManager.getAnimationCSS();
  Object.entries(css).forEach(([property, value]) => {
    document.documentElement.style.setProperty(property, value);
  });

  if (process.env.NODE_ENV === 'development') {
    performanceMonitor.startMonitoring();
  }

  return {
    accessibilityManager,
    performanceMonitor
  };
};

// React context provider (if needed)

interface AnimationContextValue {
  reducedMotion: boolean;
  performanceMetrics: PerformanceMetrics | null;
  accessibilityManager: AnimationAccessibilityManager;
}

const AnimationContext = React.createContext<AnimationContextValue | null>(null);

export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const reducedMotion = useReducedMotion();
  const performanceMetrics = useAnimationPerformance();
  const accessibilityManager = AnimationAccessibilityManager.getInstance();

  return (
    <AnimationContext.Provider value={{
      reducedMotion,
      performanceMetrics,
      accessibilityManager
    }}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimationContext = () => {
  const context = React.useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimationContext must be used within AnimationProvider');
  }
  return context;
};