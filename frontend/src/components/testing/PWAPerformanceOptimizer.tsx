import React, { useState, useCallback, useEffect } from 'react';
import { Card, Button, Space, Alert, Typography, List, Badge, Progress, Tabs, Divider } from 'antd';
import { 
  RocketOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  WifiOutlined,
  EyeOutlined,
  MobileOutlined,
  BugOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface PerformanceMetrics {
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
  fcp: number;
  tti: number;
  tbt: number;
  si: number;
}

interface PWAAuditResult {
  category: 'performance' | 'accessibility' | 'best-practices' | 'pwa' | 'seo';
  score: number;
  issues: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
    impact: number;
    recommendation: string;
  }>;
}

interface ResourceOptimization {
  type: 'image' | 'script' | 'style' | 'font';
  url: string;
  size: number;
  recommendation: string;
  potential: number;
}

export const PWAPerformanceOptimizer: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [auditResults, setAuditResults] = useState<PWAAuditResult[]>([]);
  const [resourceOptimizations, setResourceOptimizations] = useState<ResourceOptimization[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  // Collect Core Web Vitals
  const collectCoreWebVitals = useCallback((): Promise<PerformanceMetrics> => {
    return new Promise((resolve) => {
      const metrics: Partial<PerformanceMetrics> = {};

      // Largest Contentful Paint
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          metrics.lcp = entries[entries.length - 1].startTime;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // First Input Delay
      new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry: any) => {
          metrics.fid = entry.processingStart - entry.startTime;
        });
      }).observe({ type: 'first-input', buffered: true });

      // Cumulative Layout Shift
      let clsScore = 0;
      new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
          }
        });
        metrics.cls = clsScore;
      }).observe({ type: 'layout-shift', buffered: true });

      // Navigation Timing metrics
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        metrics.ttfb = navigation.responseStart - navigation.requestStart;
        metrics.fcp = navigation.responseEnd - navigation.responseStart;
        metrics.tti = navigation.loadEventEnd - navigation.navigationStart;
      }

      // Paint metrics
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          metrics.fcp = entry.startTime;
        }
      });

      // Calculate estimated metrics
      metrics.tbt = Math.max(0, (metrics.tti || 0) - (metrics.fcp || 0) - 50);
      metrics.si = (metrics.fcp || 0) + (metrics.lcp || 0) / 2;

      setTimeout(() => {
        resolve({
          lcp: metrics.lcp || 0,
          fid: metrics.fid || 0,
          cls: metrics.cls || 0,
          ttfb: metrics.ttfb || 0,
          fcp: metrics.fcp || 0,
          tti: metrics.tti || 0,
          tbt: metrics.tbt || 0,
          si: metrics.si || 0,
        });
      }, 3000);
    });
  }, []);

  // Analyze resource optimization opportunities
  const analyzeResourceOptimization = useCallback((): ResourceOptimization[] => {
    const optimizations: ResourceOptimization[] = [];

    // Analyze images
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      const rect = img.getBoundingClientRect();
      const naturalSize = img.naturalWidth * img.naturalHeight;
      const displaySize = rect.width * rect.height * window.devicePixelRatio;
      
      if (naturalSize > displaySize * 1.5) {
        optimizations.push({
          type: 'image',
          url: img.src.substring(0, 50) + '...',
          size: naturalSize,
          recommendation: 'Image is oversized - consider resizing or using responsive images',
          potential: Math.round((naturalSize - displaySize) / 1024) // KB saved
        });
      }

      if (!img.loading || img.loading !== 'lazy') {
        optimizations.push({
          type: 'image',
          url: img.src.substring(0, 50) + '...',
          size: 0,
          recommendation: 'Add lazy loading to improve initial page load',
          potential: 50 // Estimated improvement
        });
      }
    });

    // Analyze scripts
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach((script) => {
      if (!script.hasAttribute('defer') && !script.hasAttribute('async')) {
        optimizations.push({
          type: 'script',
          url: script.getAttribute('src')?.substring(0, 50) + '...' || 'Unknown',
          size: 0,
          recommendation: 'Consider adding defer or async attribute to non-critical scripts',
          potential: 100
        });
      }
    });

    // Analyze stylesheets
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    stylesheets.forEach((link) => {
      const href = link.getAttribute('href');
      if (href && !href.includes('critical')) {
        optimizations.push({
          type: 'style',
          url: href.substring(0, 50) + '...',
          size: 0,
          recommendation: 'Consider inlining critical CSS and loading non-critical CSS asynchronously',
          potential: 200
        });
      }
    });

    return optimizations;
  }, []);

  // Run PWA audit simulation
  const runPWAAudit = useCallback(async (): Promise<PWAAuditResult[]> => {
    const results: PWAAuditResult[] = [];

    // Performance audit
    const performanceIssues = [];
    if ((metrics?.lcp || 0) > 2500) {
      performanceIssues.push({
        id: 'lcp-slow',
        title: 'Largest Contentful Paint is slow',
        description: `LCP is ${Math.round(metrics?.lcp || 0)}ms, should be ≤ 2500ms`,
        severity: 'error' as const,
        impact: 15,
        recommendation: 'Optimize images, remove unused CSS, improve server response time'
      });
    }

    if ((metrics?.cls || 0) > 0.1) {
      performanceIssues.push({
        id: 'cls-poor',
        title: 'Cumulative Layout Shift is poor',
        description: `CLS is ${metrics?.cls?.toFixed(3)}, should be ≤ 0.1`,
        severity: 'error' as const,
        impact: 10,
        recommendation: 'Add size attributes to images, reserve space for dynamic content'
      });
    }

    if ((metrics?.fid || 0) > 100) {
      performanceIssues.push({
        id: 'fid-slow',
        title: 'First Input Delay is slow',
        description: `FID is ${Math.round(metrics?.fid || 0)}ms, should be ≤ 100ms`,
        severity: 'warning' as const,
        impact: 8,
        recommendation: 'Reduce JavaScript execution time, break up long tasks'
      });
    }

    const performanceScore = Math.max(0, 100 - performanceIssues.reduce((sum, issue) => sum + issue.impact, 0));
    results.push({
      category: 'performance',
      score: performanceScore,
      issues: performanceIssues
    });

    // PWA audit
    const pwaIssues = [];
    
    // Check for manifest
    const manifest = document.querySelector('link[rel="manifest"]');
    if (!manifest) {
      pwaIssues.push({
        id: 'no-manifest',
        title: 'No Web App Manifest',
        description: 'A manifest is required for PWA installation',
        severity: 'error' as const,
        impact: 20,
        recommendation: 'Add a valid web app manifest file'
      });
    }

    // Check for service worker
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      pwaIssues.push({
        id: 'no-sw',
        title: 'No Service Worker',
        description: 'Service worker is required for offline functionality',
        severity: 'error' as const,
        impact: 25,
        recommendation: 'Implement a service worker for caching and offline support'
      });
    }

    // Check for HTTPS
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      pwaIssues.push({
        id: 'no-https',
        title: 'Not served over HTTPS',
        description: 'PWAs must be served over HTTPS',
        severity: 'error' as const,
        impact: 30,
        recommendation: 'Deploy app over HTTPS'
      });
    }

    const pwaScore = Math.max(0, 100 - pwaIssues.reduce((sum, issue) => sum + issue.impact, 0));
    results.push({
      category: 'pwa',
      score: pwaScore,
      issues: pwaIssues
    });

    // Best Practices audit
    const bestPracticesIssues = [];
    
    // Check for mixed content
    if (location.protocol === 'https:') {
      const httpResources = Array.from(document.querySelectorAll('img, script, link')).filter(el => {
        const src = el.getAttribute('src') || el.getAttribute('href');
        return src && src.startsWith('http://');
      });

      if (httpResources.length > 0) {
        bestPracticesIssues.push({
          id: 'mixed-content',
          title: 'Mixed Content detected',
          description: `${httpResources.length} resources served over HTTP`,
          severity: 'warning' as const,
          impact: 10,
          recommendation: 'Serve all resources over HTTPS'
        });
      }
    }

    const bestPracticesScore = Math.max(0, 100 - bestPracticesIssues.reduce((sum, issue) => sum + issue.impact, 0));
    results.push({
      category: 'best-practices',
      score: bestPracticesScore,
      issues: bestPracticesIssues
    });

    return results;
  }, [metrics]);

  const runCompleteAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      // Collect performance metrics
      const coreVitals = await collectCoreWebVitals();
      setMetrics(coreVitals);

      // Analyze resource optimization
      const resourceOpts = analyzeResourceOptimization();
      setResourceOptimizations(resourceOpts);

      // Run PWA audit
      const auditResults = await runPWAAudit();
      setAuditResults(auditResults);

      // Get network information
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setNetworkInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });
      }

    } catch (error) {
      console.error('Performance analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [collectCoreWebVitals, analyzeResourceOptimization, runPWAAudit]);

  useEffect(() => {
    runCompleteAnalysis();
  }, [runCompleteAnalysis]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 50) return 'warning';
    return 'error';
  };

  const getMetricStatus = (value: number, good: number, needs: number) => {
    if (value <= good) return 'success';
    if (value <= needs) return 'warning';
    return 'exception';
  };

  return (
    <Card title="🚀 PWA Performance Optimizer" className="w-full">
      <Space direction="vertical" size="large" className="w-full">
        
        {/* Controls */}
        <div className="flex justify-between items-center">
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={runCompleteAnalysis}
            loading={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing Performance...' : 'Run Performance Analysis'}
          </Button>
          
          {networkInfo && (
            <Badge 
              status="processing" 
              text={`${networkInfo.effectiveType} (${networkInfo.downlink}Mbps)`}
            />
          )}
        </div>

        {/* Core Web Vitals */}
        {metrics && (
          <Card title="⚡ Core Web Vitals" size="small">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <Title level={4} className="mb-1">LCP</Title>
                <Progress
                  type="circle"
                  size={80}
                  percent={Math.min((2500 / Math.max(metrics.lcp, 1)) * 100, 100)}
                  status={getMetricStatus(metrics.lcp, 2500, 4000)}
                  format={() => `${Math.round(metrics.lcp)}ms`}
                />
                <br />
                <Text type="secondary" className="text-xs">
                  Good: ≤2.5s | Needs Work: ≤4s
                </Text>
              </div>
              
              <div className="text-center">
                <Title level={4} className="mb-1">FID</Title>
                <Progress
                  type="circle"
                  size={80}
                  percent={Math.min((100 / Math.max(metrics.fid, 1)) * 100, 100)}
                  status={getMetricStatus(metrics.fid, 100, 300)}
                  format={() => `${Math.round(metrics.fid)}ms`}
                />
                <br />
                <Text type="secondary" className="text-xs">
                  Good: ≤100ms | Needs Work: ≤300ms
                </Text>
              </div>
              
              <div className="text-center">
                <Title level={4} className="mb-1">CLS</Title>
                <Progress
                  type="circle"
                  size={80}
                  percent={Math.min((0.1 / Math.max(metrics.cls, 0.01)) * 100, 100)}
                  status={getMetricStatus(metrics.cls, 0.1, 0.25)}
                  format={() => metrics.cls.toFixed(3)}
                />
                <br />
                <Text type="secondary" className="text-xs">
                  Good: ≤0.1 | Needs Work: ≤0.25
                </Text>
              </div>
            </div>
          </Card>
        )}

        {/* Lighthouse Scores */}
        {auditResults.length > 0 && (
          <Card title="🏆 Lighthouse Scores" size="small">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {auditResults.map((result) => (
                <div key={result.category} className="text-center">
                  <Title level={5} className="capitalize mb-2">{result.category.replace('-', ' ')}</Title>
                  <Progress
                    type="circle"
                    size={60}
                    percent={result.score}
                    status={getScoreColor(result.score)}
                  />
                  <br />
                  <Badge 
                    count={result.issues.length} 
                    status={result.issues.length === 0 ? 'success' : 'error'}
                    className="mt-2"
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Issues and Recommendations */}
        <Tabs defaultActiveKey="issues">
          <TabPane tab="🔧 Issues & Fixes" key="issues">
            {auditResults.flatMap(result => result.issues).length > 0 ? (
              <List
                dataSource={auditResults.flatMap(result => result.issues)}
                renderItem={(issue) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        issue.severity === 'error' ? 
                          <CloseCircleOutlined className="text-red-500" /> :
                          <WarningOutlined className="text-orange-500" />
                      }
                      title={
                        <Space>
                          <Text strong>{issue.title}</Text>
                          <Badge 
                            color={issue.severity === 'error' ? 'red' : 'orange'} 
                            text={`-${issue.impact} points`}
                            size="small"
                          />
                        </Space>
                      }
                      description={
                        <div>
                          <Paragraph className="mb-2">{issue.description}</Paragraph>
                          <Text strong>💡 Recommendation:</Text>
                          <br />
                          <Text>{issue.recommendation}</Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Alert
                message="No issues found!"
                description="Your PWA is performing well across all categories."
                type="success"
                showIcon
              />
            )}
          </TabPane>

          <TabPane tab="📦 Resource Optimization" key="resources">
            {resourceOptimizations.length > 0 ? (
              <List
                dataSource={resourceOptimizations}
                renderItem={(optimization) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        optimization.type === 'image' ? <EyeOutlined /> :
                        optimization.type === 'script' ? <BugOutlined /> :
                        optimization.type === 'style' ? <WifiOutlined /> :
                        <MobileOutlined />
                      }
                      title={
                        <Space>
                          <Text strong className="capitalize">{optimization.type} Optimization</Text>
                          <Badge 
                            color="blue" 
                            text={`~${optimization.potential}KB potential savings`}
                            size="small"
                          />
                        </Space>
                      }
                      description={
                        <div>
                          <Text type="secondary" className="text-xs">{optimization.url}</Text>
                          <br />
                          <Text>{optimization.recommendation}</Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Alert
                message="No optimization opportunities found"
                description="Your resources are already well optimized."
                type="success"
                showIcon
              />
            )}
          </TabPane>
        </Tabs>

        {/* Quick Optimization Tips */}
        <Card title="💡 Quick Optimization Tips" size="small">
          <Paragraph className="text-sm">
            <Text strong>Performance:</Text>
            <br />
            • Use WebP images and lazy loading
            <br />
            • Implement code splitting and tree shaking
            <br />
            • Optimize JavaScript bundle sizes
            <br />
            • Use service worker for resource caching
            
            <Divider />
            
            <Text strong>PWA:</Text>
            <br />
            • Add web app manifest for installability
            <br />
            • Implement offline functionality
            <br />
            • Use HTTPS for all resources
            <br />
            • Add app icons for all platforms
            
            <Divider />
            
            <Text strong>Core Web Vitals:</Text>
            <br />
            • LCP: Optimize images and server response
            <br />
            • FID: Reduce JavaScript execution time
            <br />
            • CLS: Reserve space for dynamic content
          </Paragraph>
        </Card>
      </Space>
    </Card>
  );
};