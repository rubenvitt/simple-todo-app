import React, { useState, useEffect, useCallback } from 'react';
import { X, TrendingUp, TrendingDown, Activity, Zap, MousePointer, Smartphone } from 'lucide-react';
import { performanceMonitoring, PerformanceMetrics } from '../services/performance-monitoring.service';
import { mobilePerformance } from '../services/mobile-performance.service';
import { performanceBudget, BudgetViolation } from '../services/performance-budget.service';

interface PerformanceOverlayProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({ 
  position = 'bottom-right' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [violations, setViolations] = useState<BudgetViolation[]>([]);
  const [mobileMetrics, setMobileMetrics] = useState({
    touchLatency: 0,
    scrollFPS: 60,
    memoryUsage: 0
  });
  const [fps, setFps] = useState(60);

  useEffect(() => {
    // Only show in development and if explicitly enabled
    if (process.env.NODE_ENV !== 'development' || !localStorage.getItem('showPerformanceOverlay')) {
      setIsVisible(false);
      return;
    }

    // Subscribe to performance metrics
    const unsubscribeMetrics = performanceMonitoring.subscribe((newMetrics) => {
      setMetrics(newMetrics);
    });

    // Subscribe to budget violations
    const unsubscribeViolations = performanceBudget.subscribe((violation) => {
      setViolations(prev => [violation, ...prev].slice(0, 5)); // Keep last 5
    });

    // Monitor FPS
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;

    const measureFPS = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }

      rafId = requestAnimationFrame(measureFPS);
    };

    rafId = requestAnimationFrame(measureFPS);

    // Update mobile metrics periodically
    const mobileInterval = setInterval(() => {
      setMobileMetrics({
        touchLatency: mobilePerformance.getAverageTouchLatency(),
        scrollFPS: mobilePerformance.getAverageScrollFPS(),
        memoryUsage: getMemoryUsage()
      });
    }, 1000);

    return () => {
      unsubscribeMetrics();
      unsubscribeViolations();
      cancelAnimationFrame(rafId);
      clearInterval(mobileInterval);
    };
  }, []);

  const getMemoryUsage = useCallback(() => {
    const memory = (performance as any).memory;
    if (!memory) return 0;
    return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
  }, []);

  const getMetricColor = (rating?: 'good' | 'needs-improvement' | 'poor'): string => {
    switch (rating) {
      case 'good': return 'text-green-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getFPSColor = (fps: number): string => {
    if (fps >= 55) return 'text-green-600';
    if (fps >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatMetricValue = (value?: number, name?: string): string => {
    if (value === undefined) return '-';
    
    if (name === 'CLS') {
      return value.toFixed(3);
    }
    
    return Math.round(value) + 'ms';
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Compact View */}
      {!isExpanded && (
        <div className="bg-black/90 text-white rounded-lg p-3 backdrop-blur-sm shadow-lg">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center space-x-2 hover:text-blue-400 transition-colors"
            >
              <Activity className="h-5 w-5" />
              <span className="font-mono text-sm">
                FPS: <span className={getFPSColor(fps)}>{fps}</span>
              </span>
            </button>
            
            {/* Quick Metrics */}
            <div className="flex items-center space-x-3 text-xs font-mono">
              {metrics.lcp && (
                <span className={getMetricColor(metrics.lcp.rating)}>
                  LCP: {Math.round(metrics.lcp.value)}
                </span>
              )}
              {metrics.cls && (
                <span className={getMetricColor(metrics.cls.rating)}>
                  CLS: {metrics.cls.value.toFixed(2)}
                </span>
              )}
            </div>
            
            <button
              onClick={() => setIsVisible(false)}
              className="ml-2 hover:text-red-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="bg-black/95 text-white rounded-lg p-4 backdrop-blur-sm shadow-2xl w-96 max-h-[600px] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Performance Monitor</span>
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsExpanded(false)}
                className="hover:text-blue-400 transition-colors"
              >
                <TrendingDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="hover:text-red-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Real-time Metrics */}
          <div className="space-y-4">
            {/* FPS Counter */}
            <div className="bg-white/10 rounded p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Frame Rate</span>
                <span className={`font-mono text-lg ${getFPSColor(fps)}`}>
                  {fps} FPS
                </span>
              </div>
              <div className="mt-2 h-1 bg-white/20 rounded overflow-hidden">
                <div 
                  className={`h-full transition-all duration-200 ${
                    fps >= 55 ? 'bg-green-500' : fps >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((fps / 60) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Core Web Vitals */}
            <div className="bg-white/10 rounded p-3">
              <h4 className="text-sm font-medium mb-2">Core Web Vitals</h4>
              <div className="space-y-2">
                {/* LCP */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">LCP</span>
                  <span className={`font-mono ${getMetricColor(metrics.lcp?.rating)}`}>
                    {formatMetricValue(metrics.lcp?.value)}
                  </span>
                </div>
                
                {/* FID */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">FID</span>
                  <span className={`font-mono ${getMetricColor(metrics.fid?.rating)}`}>
                    {formatMetricValue(metrics.fid?.value)}
                  </span>
                </div>
                
                {/* CLS */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">CLS</span>
                  <span className={`font-mono ${getMetricColor(metrics.cls?.rating)}`}>
                    {formatMetricValue(metrics.cls?.value, 'CLS')}
                  </span>
                </div>
                
                {/* INP */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">INP</span>
                  <span className={`font-mono ${getMetricColor(metrics.inp?.rating)}`}>
                    {formatMetricValue(metrics.inp?.value)}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Metrics */}
            <div className="bg-white/10 rounded p-3">
              <h4 className="text-sm font-medium mb-2 flex items-center space-x-2">
                <Smartphone className="h-4 w-4" />
                <span>Mobile Metrics</span>
              </h4>
              <div className="space-y-2">
                {/* Touch Latency */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 flex items-center space-x-1">
                    <MousePointer className="h-3 w-3" />
                    <span>Touch Latency</span>
                  </span>
                  <span className={`font-mono ${
                    mobileMetrics.touchLatency <= 16 ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {mobileMetrics.touchLatency.toFixed(1)}ms
                  </span>
                </div>
                
                {/* Scroll Performance */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Scroll FPS</span>
                  <span className={`font-mono ${
                    mobileMetrics.scrollFPS >= 50 ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {Math.round(mobileMetrics.scrollFPS)}
                  </span>
                </div>
                
                {/* Memory Usage */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 flex items-center space-x-1">
                    <Zap className="h-3 w-3" />
                    <span>Memory</span>
                  </span>
                  <span className={`font-mono ${
                    mobileMetrics.memoryUsage < 70 ? 'text-green-600' : 
                    mobileMetrics.memoryUsage < 90 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {mobileMetrics.memoryUsage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Budget Violations */}
            {violations.length > 0 && (
              <div className="bg-red-900/30 rounded p-3 border border-red-700/50">
                <h4 className="text-sm font-medium mb-2 text-red-400">
                  Recent Budget Violations
                </h4>
                <div className="space-y-1">
                  {violations.map((violation, index) => (
                    <div key={index} className="text-xs text-red-300">
                      <span className="font-mono">{violation.metric}:</span>{' '}
                      {violation.actual}{violation.unit} (budget: {violation.budget})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => {
                  performanceMonitoring.clearMetrics();
                  mobilePerformance.clearMetrics();
                  performanceBudget.clearViolations();
                  setViolations([]);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded transition-colors"
              >
                Clear Metrics
              </button>
              <button
                onClick={() => {
                  const report = {
                    webVitals: performanceMonitoring.getMetrics(),
                    mobile: {
                      touch: mobilePerformance.getTouchMetrics(),
                      scroll: mobilePerformance.getScrollMetrics(),
                      animation: mobilePerformance.getAnimationMetrics(),
                      memory: mobilePerformance.getMemoryMetrics()
                    },
                    violations: performanceBudget.getViolations(),
                    timestamp: new Date().toISOString()
                  };
                  console.log('[Performance Report]', report);
                  alert('Performance report logged to console');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded transition-colors"
              >
                Export Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};