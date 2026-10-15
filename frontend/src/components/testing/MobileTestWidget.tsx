import React, { useState, useCallback } from 'react';
import { Button, Card, Typography, Space, Alert, Progress, Drawer, Tabs } from 'antd';
import { 
  BugOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  MobileOutlined,
  EyeOutlined,
  RocketOutlined,
  UserOutlined 
} from '@ant-design/icons';
import { runMobileTestSuite, getDeviceInfo } from '../../utils/mobile-testing';
import { AccessibilityTestPanel } from './AccessibilityTestPanel';
import { DeviceTestingDashboard } from './DeviceTestingDashboard';
import { CrossDeviceTestSuite } from './CrossDeviceTestSuite';
import { PWAPerformanceOptimizer } from './PWAPerformanceOptimizer';
import { UserTestingDashboard } from './UserTestingDashboard';

const { Title, Text, Paragraph } = Typography;

interface TestResult {
  touchTargets: { passed: boolean; issues: string[] };
  viewport: { passed: boolean; issues: string[] };
  fontSizes: { passed: boolean; issues: string[] };
  horizontalScroll: { passed: boolean; issues: string[] };
  gestures: { passed: boolean; issues: string[] };
  accessibility: { passed: boolean; issues: string[] };
  performance: { lcp: number; fid: number; cls: number; ttfb: number };
  overallScore: number;
}

export const MobileTestWidget: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult | null>(null);

  const runTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const results = await runMobileTestSuite();
      setTestResults(results);
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunning(false);
    }
  }, []);

  const deviceInfo = getDeviceInfo();

  const TestResultItem: React.FC<{ 
    title: string; 
    result: { passed: boolean; issues: string[] } 
  }> = ({ title, result }) => (
    <Card size="small" className="mb-2">
      <Space align="start">
        {result.passed ? (
          <CheckCircleOutlined className="text-green-500" />
        ) : (
          <CloseCircleOutlined className="text-red-500" />
        )}
        <div className="flex-1">
          <Text strong>{title}</Text>
          {result.issues.length > 0 && (
            <div className="mt-1">
              {result.issues.map((issue, index) => (
                <div key={index} className="text-red-600 text-xs">
                  • {issue}
                </div>
              ))}
            </div>
          )}
        </div>
      </Space>
    </Card>
  );

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <>
      {/* Floating Test Button */}
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          type="primary"
          icon={<BugOutlined />}
          onClick={() => setIsVisible(true)}
          className="shadow-lg"
        >
          UX Test
        </Button>
      </div>

      {/* Test Results Drawer */}
      <Drawer
        title="📱 Mobile UX Test Suite"
        placement="right"
        onClose={() => setIsVisible(false)}
        open={isVisible}
        width={500}
        className="mobile-test-drawer"
      >
        <Tabs
          defaultActiveKey="1"
          items={[
            {
              key: '1',
              label: (
                <span>
                  <MobileOutlined />
                  UX Tests
                </span>
              ),
              children: (
                <div className="space-y-4">
                  {/* Device Info */}
                  <Card title="📱 Device Information" size="small">
            <Space direction="vertical" size="small" className="w-full">
              <Text><strong>Platform:</strong> {
                deviceInfo.platform.isIOS ? 'iOS' :
                deviceInfo.platform.isAndroid ? 'Android' : 'Desktop'
              }</Text>
              <Text><strong>Viewport:</strong> {deviceInfo.viewport.width}×{deviceInfo.viewport.height}</Text>
              <Text><strong>Screen:</strong> {deviceInfo.screen.width}×{deviceInfo.screen.height}</Text>
              <Text><strong>Pixel Ratio:</strong> {deviceInfo.screen.pixelRatio}</Text>
              <Text><strong>Type:</strong> {
                deviceInfo.platform.isTablet ? 'Tablet' :
                deviceInfo.platform.isMobile ? 'Mobile' : 'Desktop'
              }</Text>
            </Space>
          </Card>

          {/* Test Controls */}
          <Card title="🧪 Run Tests" size="small">
            <Space direction="vertical" className="w-full">
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={runTests}
                loading={isRunning}
                block
              >
                {isRunning ? 'Running Tests...' : 'Run Mobile UX Tests'}
              </Button>
              
              {testResults && (
                <Alert
                  message={`Overall Score: ${testResults.overallScore}%`}
                  type={testResults.overallScore >= 80 ? 'success' : 
                        testResults.overallScore >= 60 ? 'warning' : 'error'}
                  showIcon
                />
              )}
            </Space>
          </Card>

          {/* Test Results */}
          {testResults && (
            <>
              <Card title="🎯 UX Tests" size="small">
                <TestResultItem title="Touch Targets" result={testResults.touchTargets} />
                <TestResultItem title="Viewport Settings" result={testResults.viewport} />
                <TestResultItem title="Font Sizes" result={testResults.fontSizes} />
                <TestResultItem title="Horizontal Scroll" result={testResults.horizontalScroll} />
                <TestResultItem title="Gesture Support" result={testResults.gestures} />
                <TestResultItem title="Accessibility" result={testResults.accessibility} />
              </Card>

              <Card title="⚡ Performance Metrics" size="small">
                <Space direction="vertical" className="w-full">
                  <div>
                    <Text strong>Largest Contentful Paint (LCP)</Text>
                    <div className="flex items-center gap-2">
                      <Progress 
                        percent={Math.min((2500 / Math.max(testResults.performance.lcp, 1)) * 100, 100)}
                        size="small"
                        status={testResults.performance.lcp <= 2500 ? 'success' : 'exception'}
                      />
                      <Text className="text-xs">{Math.round(testResults.performance.lcp)}ms</Text>
                    </div>
                  </div>

                  <div>
                    <Text strong>First Input Delay (FID)</Text>
                    <div className="flex items-center gap-2">
                      <Progress 
                        percent={Math.min((100 / Math.max(testResults.performance.fid, 1)) * 100, 100)}
                        size="small"
                        status={testResults.performance.fid <= 100 ? 'success' : 'exception'}
                      />
                      <Text className="text-xs">{Math.round(testResults.performance.fid)}ms</Text>
                    </div>
                  </div>

                  <div>
                    <Text strong>Cumulative Layout Shift (CLS)</Text>
                    <div className="flex items-center gap-2">
                      <Progress 
                        percent={Math.min((0.1 / Math.max(testResults.performance.cls, 0.01)) * 100, 100)}
                        size="small"
                        status={testResults.performance.cls <= 0.1 ? 'success' : 'exception'}
                      />
                      <Text className="text-xs">{testResults.performance.cls.toFixed(3)}</Text>
                    </div>
                  </div>

                  <div>
                    <Text strong>Time to First Byte (TTFB)</Text>
                    <div className="flex items-center gap-2">
                      <Progress 
                        percent={Math.min((600 / Math.max(testResults.performance.ttfb, 1)) * 100, 100)}
                        size="small"
                        status={testResults.performance.ttfb <= 600 ? 'success' : 'exception'}
                      />
                      <Text className="text-xs">{Math.round(testResults.performance.ttfb)}ms</Text>
                    </div>
                  </div>
                </Space>
              </Card>
            </>
          )}

                  {/* Quick Tips */}
                  <Card title="💡 Quick Tips" size="small">
                    <Paragraph className="text-xs">
                      <strong>Touch Targets:</strong> Minimum 44×44px for iOS, 48×48px for Android
                      <br />
                      <strong>Font Size:</strong> Minimum 16px on inputs to prevent iOS zoom
                      <br />
                      <strong>Performance:</strong> LCP &lt; 2.5s, FID &lt; 100ms, CLS &lt; 0.1
                      <br />
                      <strong>Accessibility:</strong> Use semantic HTML and ARIA labels
                    </Paragraph>
                  </Card>
                </div>
              ),
            },
            {
              key: '2',
              label: (
                <span>
                  <EyeOutlined />
                  Accessibility
                </span>
              ),
              children: <AccessibilityTestPanel />,
            },
            {
              key: '3',
              label: (
                <span>
                  <BugOutlined />
                  Device Setup
                </span>
              ),
              children: <DeviceTestingDashboard />,
            },
            {
              key: '4',
              label: (
                <span>
                  <ThunderboltOutlined />
                  Cross-Device Tests
                </span>
              ),
              children: <CrossDeviceTestSuite />,
            },
            {
              key: '5',
              label: (
                <span>
                  <RocketOutlined />
                  PWA Performance
                </span>
              ),
              children: <PWAPerformanceOptimizer />,
            },
            {
              key: '6',
              label: (
                <span>
                  <UserOutlined />
                  User Testing
                </span>
              ),
              children: <UserTestingDashboard />,
            },
          ]}
        />
      </Drawer>

      <style>{`
        .mobile-test-drawer .ant-drawer-body {
          padding: 16px;
        }
      `}</style>
    </>
  );
};