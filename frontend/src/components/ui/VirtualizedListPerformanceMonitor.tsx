import React, { useEffect, useRef, useState } from 'react';
import { Card, Typography, Space, Badge } from 'antd';

const { Text } = Typography;

interface PerformanceMetrics {
  fps: number;
  scrollEvents: number;
  renderTime: number;
  memoryUsage?: number;
}

interface VirtualizedListPerformanceMonitorProps {
  isActive: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export const VirtualizedListPerformanceMonitor: React.FC<VirtualizedListPerformanceMonitorProps> = ({
  isActive,
  onMetricsUpdate,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    scrollEvents: 0,
    renderTime: 0,
    memoryUsage: 0,
  });

  const fpsRef = useRef(0);
  const scrollEventsRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const renderStartTimeRef = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    let animationFrameId: number;
    let intervalId: NodeJS.Timeout;

    // FPS Monitoring
    const measureFPS = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;
      
      fpsRef.current = Math.round(1000 / deltaTime);
      animationFrameId = requestAnimationFrame(measureFPS);
    };

    // Scroll Event Monitoring
    const handleScroll = () => {
      scrollEventsRef.current++;
    };

    // Memory Usage Monitoring (if available)
    const getMemoryUsage = () => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
      }
      return undefined;
    };

    // Render Time Monitoring
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('virtualized-list')) {
          setMetrics(prev => ({
            ...prev,
            renderTime: entry.duration,
          }));
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });

    // Start monitoring
    measureFPS();
    document.addEventListener('scroll', handleScroll, { passive: true });

    // Update metrics every second
    intervalId = setInterval(() => {
      const newMetrics: PerformanceMetrics = {
        fps: fpsRef.current,
        scrollEvents: scrollEventsRef.current,
        renderTime: metrics.renderTime,
        memoryUsage: getMemoryUsage(),
      };

      setMetrics(newMetrics);
      onMetricsUpdate?.(newMetrics);

      // Reset scroll events counter
      scrollEventsRef.current = 0;
    }, 1000);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(intervalId);
      document.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [isActive, metrics.renderTime, onMetricsUpdate]);

  if (!isActive || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'green';
    if (fps >= 30) return 'orange';
    return 'red';
  };

  const getScrollEventColor = (events: number) => {
    if (events <= 10) return 'green';
    if (events <= 30) return 'orange';
    return 'red';
  };

  return (
    <Card
      size="small"
      className="fixed bottom-4 right-4 z-50 w-64"
      title={
        <Space>
          📊 Virtual Scrolling Performance
          <Badge status="processing" />
        </Space>
      }
    >
      <Space direction="vertical" size="small" className="w-full">
        <div className="flex justify-between">
          <Text strong>FPS:</Text>
          <Badge color={getFPSColor(metrics.fps)} text={`${metrics.fps}`} />
        </div>
        
        <div className="flex justify-between">
          <Text strong>Scroll Events/s:</Text>
          <Badge color={getScrollEventColor(metrics.scrollEvents)} text={`${metrics.scrollEvents}`} />
        </div>
        
        <div className="flex justify-between">
          <Text strong>Render Time:</Text>
          <Text>{metrics.renderTime.toFixed(2)}ms</Text>
        </div>
        
        {metrics.memoryUsage !== undefined && (
          <div className="flex justify-between">
            <Text strong>Memory:</Text>
            <Text>{metrics.memoryUsage.toFixed(1)}MB</Text>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-2">
          🎯 Target: FPS ≥55, Scroll events ≤10/s
        </div>
      </Space>
    </Card>
  );
};

// Hook für Performance-Tracking
export const useVirtualScrollPerformance = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);

  const startMonitoring = () => setIsMonitoring(true);
  const stopMonitoring = () => setIsMonitoring(false);
  const toggleMonitoring = () => setIsMonitoring(prev => !prev);

  return {
    isMonitoring,
    currentMetrics,
    startMonitoring,
    stopMonitoring,
    toggleMonitoring,
    onMetricsUpdate: setCurrentMetrics,
  };
};