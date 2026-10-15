import { performanceMonitoring, PerformanceMetric } from './performance-monitoring.service';
import { mobilePerformance } from './mobile-performance.service';

export interface PerformanceBudget {
  metric: string;
  budget: number;
  unit: 'ms' | 'score' | 'kb' | 'fps' | 'count';
  severity: 'warning' | 'error';
}

export interface BudgetViolation {
  metric: string;
  actual: number;
  budget: number;
  unit: string;
  severity: 'warning' | 'error';
  timestamp: number;
  message: string;
}

export interface BudgetConfig {
  budgets: PerformanceBudget[];
  enableConsoleAlerts: boolean;
  enableNotifications: boolean;
  webhookUrl?: string;
}

class PerformanceBudgetService {
  private budgets: PerformanceBudget[] = [
    // Core Web Vitals
    { metric: 'LCP', budget: 2500, unit: 'ms', severity: 'warning' },
    { metric: 'LCP', budget: 4000, unit: 'ms', severity: 'error' },
    { metric: 'FID', budget: 100, unit: 'ms', severity: 'warning' },
    { metric: 'FID', budget: 300, unit: 'ms', severity: 'error' },
    { metric: 'CLS', budget: 0.1, unit: 'score', severity: 'warning' },
    { metric: 'CLS', budget: 0.25, unit: 'score', severity: 'error' },
    
    // Additional metrics
    { metric: 'TTFB', budget: 800, unit: 'ms', severity: 'warning' },
    { metric: 'FCP', budget: 1800, unit: 'ms', severity: 'warning' },
    { metric: 'INP', budget: 200, unit: 'ms', severity: 'warning' },
    
    // Mobile-specific
    { metric: 'touchLatency', budget: 16, unit: 'ms', severity: 'warning' },
    { metric: 'scrollFPS', budget: 50, unit: 'fps', severity: 'warning' },
    { metric: 'animationFPS', budget: 50, unit: 'fps', severity: 'warning' },
    
    // Bundle size (to be implemented with build integration)
    { metric: 'bundleSize', budget: 250, unit: 'kb', severity: 'warning' },
    { metric: 'bundleSize', budget: 500, unit: 'kb', severity: 'error' }
  ];
  
  private violations: BudgetViolation[] = [];
  private listeners: ((violation: BudgetViolation) => void)[] = [];
  private config: BudgetConfig = {
    budgets: this.budgets,
    enableConsoleAlerts: true,
    enableNotifications: true
  };

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Listen to performance metrics
    window.addEventListener('performance-metric', (event: any) => {
      this.checkBudget(event.detail);
    });
    
    // Subscribe to performance monitoring
    performanceMonitoring.subscribe((metrics) => {
      Object.values(metrics).forEach(metric => {
        if (metric) this.checkBudget(metric);
      });
    });
    
    // Monitor mobile metrics periodically
    setInterval(() => {
      this.checkMobileMetrics();
    }, 5000);
  }

  private checkBudget(metric: PerformanceMetric) {
    const relevantBudgets = this.budgets.filter(b => b.metric === metric.name);
    
    relevantBudgets.forEach(budget => {
      if (this.isViolation(metric.value, budget)) {
        this.recordViolation({
          metric: metric.name,
          actual: metric.value,
          budget: budget.budget,
          unit: budget.unit,
          severity: budget.severity,
          timestamp: Date.now(),
          message: this.generateViolationMessage(metric.name, metric.value, budget)
        });
      }
    });
  }

  private checkMobileMetrics() {
    // Check touch latency
    const avgTouchLatency = mobilePerformance.getAverageTouchLatency();
    if (avgTouchLatency > 0) {
      this.checkBudget({
        name: 'touchLatency',
        value: avgTouchLatency,
        rating: avgTouchLatency <= 16 ? 'good' : 'poor',
        timestamp: Date.now(),
        deviceType: 'mobile'
      });
    }
    
    // Check scroll FPS
    const avgScrollFPS = mobilePerformance.getAverageScrollFPS();
    if (avgScrollFPS < 60) {
      this.checkBudget({
        name: 'scrollFPS',
        value: avgScrollFPS,
        rating: avgScrollFPS >= 50 ? 'good' : 'poor',
        timestamp: Date.now(),
        deviceType: 'mobile'
      });
    }
  }

  private isViolation(value: number, budget: PerformanceBudget): boolean {
    switch (budget.unit) {
      case 'fps':
        return value < budget.budget; // For FPS, lower is worse
      default:
        return value > budget.budget; // For most metrics, higher is worse
    }
  }

  private generateViolationMessage(metric: string, value: number, budget: PerformanceBudget): string {
    const formattedValue = budget.unit === 'score' ? value.toFixed(3) : Math.round(value);
    const percentage = budget.unit === 'fps' 
      ? ((budget.budget - value) / budget.budget * 100).toFixed(0)
      : ((value - budget.budget) / budget.budget * 100).toFixed(0);
    
    return `${metric} budget ${budget.severity}: ${formattedValue}${budget.unit} (${percentage}% ${budget.unit === 'fps' ? 'below' : 'over'} budget of ${budget.budget}${budget.unit})`;
  }

  private recordViolation(violation: BudgetViolation) {
    this.violations.push(violation);
    this.cleanupOldViolations();
    
    // Alert mechanisms
    if (this.config.enableConsoleAlerts) {
      this.logViolation(violation);
    }
    
    if (this.config.enableNotifications) {
      this.showNotification(violation);
    }
    
    if (this.config.webhookUrl) {
      this.sendWebhook(violation);
    }
    
    // Notify listeners
    this.listeners.forEach(listener => listener(violation));
  }

  private logViolation(violation: BudgetViolation) {
    const logMethod = violation.severity === 'error' ? 'error' : 'warn';
    console[logMethod](`[Performance Budget] ${violation.message}`);
  }

  private showNotification(violation: BudgetViolation) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Performance Budget Violation', {
        body: violation.message,
        icon: '/icons/icon-192x192.png',
        tag: `perf-${violation.metric}`,
        requireInteraction: violation.severity === 'error'
      });
    }
  }

  private async sendWebhook(violation: BudgetViolation) {
    if (!this.config.webhookUrl) return;
    
    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'performance_budget_violation',
          violation,
          timestamp: new Date(violation.timestamp).toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.error('[Performance Budget] Webhook failed:', error);
    }
  }

  private cleanupOldViolations() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.violations = this.violations.filter(v => v.timestamp > oneHourAgo);
  }

  public configure(config: Partial<BudgetConfig>) {
    this.config = { ...this.config, ...config };
    if (config.budgets) {
      this.budgets = config.budgets;
    }
  }

  public subscribe(listener: (violation: BudgetViolation) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getViolations(): BudgetViolation[] {
    return [...this.violations];
  }

  public getBudgets(): PerformanceBudget[] {
    return [...this.budgets];
  }

  public updateBudget(metric: string, budget: number, severity?: 'warning' | 'error') {
    const index = this.budgets.findIndex(b => 
      b.metric === metric && (severity ? b.severity === severity : true)
    );
    
    if (index !== -1) {
      this.budgets[index].budget = budget;
    }
  }

  public clearViolations() {
    this.violations = [];
  }

  // CI/CD Integration helper
  public async checkBuildBudgets(stats: any): Promise<boolean> {
    let hasViolations = false;
    
    // Check bundle size
    if (stats.bundleSize) {
      const sizeInKB = stats.bundleSize / 1024;
      const sizeBudgets = this.budgets.filter(b => b.metric === 'bundleSize');
      
      sizeBudgets.forEach(budget => {
        if (sizeInKB > budget.budget) {
          hasViolations = true;
          console.error(`[Build] Bundle size violation: ${sizeInKB.toFixed(2)}KB exceeds ${budget.severity} budget of ${budget.budget}KB`);
        }
      });
    }
    
    return !hasViolations;
  }
}

export const performanceBudget = new PerformanceBudgetService();