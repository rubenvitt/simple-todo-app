import { onCLS, onLCP, onTTFB, onFCP, onINP, Metric } from 'web-vitals';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType?: string;
}

export interface PerformanceThresholds {
  good: number;
  poor: number;
}

export interface PerformanceMetrics {
  lcp?: PerformanceMetric;
  cls?: PerformanceMetric;
  ttfb?: PerformanceMetric;
  fcp?: PerformanceMetric;
  inp?: PerformanceMetric;
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetrics = {};
  private listeners: ((metrics: PerformanceMetrics) => void)[] = [];
  private thresholds: Record<string, PerformanceThresholds> = {
    LCP: { good: 2500, poor: 4000 },
    CLS: { good: 0.1, poor: 0.25 },
    TTFB: { good: 800, poor: 1800 },
    FCP: { good: 1800, poor: 3000 },
    INP: { good: 200, poor: 500 }
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring() {
    // Monitor Core Web Vitals
    onLCP((metric) => this.handleMetric('lcp', metric));
    onCLS((metric) => this.handleMetric('cls', metric));
    
    // Additional metrics
    onTTFB((metric) => this.handleMetric('ttfb', metric));
    onFCP((metric) => this.handleMetric('fcp', metric));
    onINP((metric) => this.handleMetric('inp', metric));
  }

  private handleMetric(key: keyof PerformanceMetrics, metric: Metric) {
    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      rating: this.getRating(metric.name, metric.value),
      timestamp: Date.now(),
      deviceType: this.getDeviceType(),
      connectionType: this.getConnectionType()
    };

    this.metrics[key] = performanceMetric;
    this.notifyListeners();
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${metric.name}: ${metric.value}ms (${performanceMetric.rating})`);
    }
  }

  private getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = this.thresholds[metricName];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getConnectionType(): string | undefined {
    const nav = navigator as any;
    return nav.connection?.effectiveType;
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.metrics));
  }

  public subscribe(listener: (metrics: PerformanceMetrics) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public clearMetrics() {
    this.metrics = {};
    this.notifyListeners();
  }

  public reportToBudgetSystem(metric: PerformanceMetric) {
    // This will be used by the performance budget alert system
    const event = new CustomEvent('performance-metric', { detail: metric });
    window.dispatchEvent(event);
  }
}

export const performanceMonitoring = new PerformanceMonitoringService();