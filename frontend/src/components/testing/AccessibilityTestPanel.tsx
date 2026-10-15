import React, { useState, useCallback } from 'react';
import { Card, Button, Space, Alert, Typography, List, Badge, Divider } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  WarningOutlined,
  InfoCircleOutlined,
  ScanOutlined,
  BugOutlined,
  EyeOutlined,
  InteractionOutlined,
  SoundOutlined
} from '@ant-design/icons';
import { 
  runMobileAccessibilityAudit,
  testScreenReaderCompatibility,
  checkGestureConflicts,
  respectsReducedMotion,
  checkViewportConfiguration
} from '../../utils/accessibility-audit';

const { Title, Text, Paragraph } = Typography;

interface AccessibilityTestResult {
  mobileAccessibility: { issues: any[]; passed: boolean };
  screenReader: { passed: boolean; issues: string[] };
  gestureConflicts: { passed: boolean; issues: string[] };
  viewport: { valid: boolean; issues: string[] };
  reducedMotion: boolean;
  overallScore: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
}

export const AccessibilityTestPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<AccessibilityTestResult | null>(null);

  const runAccessibilityTests = useCallback(async () => {
    setIsRunning(true);
    
    try {
      // Run all accessibility tests
      const mobileIssues = runMobileAccessibilityAudit();
      const screenReaderTest = testScreenReaderCompatibility();
      const gestureTest = checkGestureConflicts();
      const viewportTest = checkViewportConfiguration();
      const hasReducedMotion = respectsReducedMotion();

      // Categorize issues by severity
      const criticalIssues = mobileIssues.filter(issue => issue.type === 'error').length;
      const warningIssues = mobileIssues.filter(issue => issue.type === 'warning').length;
      const infoIssues = mobileIssues.filter(issue => issue.type === 'info').length;

      // Calculate overall score
      const totalTests = 5; // Mobile accessibility, screen reader, gestures, viewport, reduced motion
      let passedTests = 0;
      
      if (mobileIssues.filter(issue => issue.type === 'error').length === 0) passedTests++;
      if (screenReaderTest.passed) passedTests++;
      if (gestureTest.passed) passedTests++;
      if (viewportTest.valid) passedTests++;
      if (hasReducedMotion || mobileIssues.filter(issue => issue.issue.includes('motion')).length === 0) passedTests++;

      const overallScore = Math.round((passedTests / totalTests) * 100);

      setTestResults({
        mobileAccessibility: {
          issues: mobileIssues,
          passed: criticalIssues === 0
        },
        screenReader: screenReaderTest,
        gestureConflicts: gestureTest,
        viewport: viewportTest,
        reducedMotion: hasReducedMotion,
        overallScore,
        criticalIssues,
        warningIssues,
        infoIssues
      });

    } catch (error) {
      console.error('Accessibility test failed:', error);
    } finally {
      setIsRunning(false);
    }
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return <CloseCircleOutlined className="text-red-500" />;
      case 'warning': return <WarningOutlined className="text-orange-500" />;
      case 'info': return <InfoCircleOutlined className="text-blue-500" />;
      default: return <InfoCircleOutlined />;
    }
  };

  return (
    <Card title="♿ Mobile Accessibility Testing" className="w-full">
      <Space direction="vertical" size="large" className="w-full">
        
        {/* Test Controls */}
        <div>
          <Button
            type="primary"
            icon={<ScanOutlined />}
            onClick={runAccessibilityTests}
            loading={isRunning}
            size="large"
          >
            {isRunning ? 'Running Accessibility Tests...' : 'Run Accessibility Audit'}
          </Button>
        </div>

        {/* Overall Score */}
        {testResults && (
          <Alert
            message={`Accessibility Score: ${testResults.overallScore}%`}
            description={`${testResults.criticalIssues} critical, ${testResults.warningIssues} warnings, ${testResults.infoIssues} info`}
            type={getScoreColor(testResults.overallScore)}
            showIcon
          />
        )}

        {/* Test Categories */}
        {testResults && (
          <div className="space-y-4">
            
            {/* Screen Reader Compatibility */}
            <Card size="small" title={
              <Space>
                <SoundOutlined />
                <Text>Screen Reader Compatibility</Text>
                {testResults.screenReader.passed ? 
                  <CheckCircleOutlined className="text-green-500" /> : 
                  <CloseCircleOutlined className="text-red-500" />
                }
              </Space>
            }>
              {testResults.screenReader.issues.length > 0 ? (
                <List
                  size="small"
                  dataSource={testResults.screenReader.issues}
                  renderItem={(issue) => (
                    <List.Item>
                      <Space>
                        <WarningOutlined className="text-orange-500" />
                        <Text>{issue}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="success">✅ Screen reader compatibility looks good!</Text>
              )}
            </Card>

            {/* Touch Gesture Conflicts */}
            <Card size="small" title={
              <Space>
                <InteractionOutlined />
                <Text>Touch Gesture Support</Text>
                {testResults.gestureConflicts.passed ? 
                  <CheckCircleOutlined className="text-green-500" /> : 
                  <CloseCircleOutlined className="text-red-500" />
                }
              </Space>
            }>
              {testResults.gestureConflicts.issues.length > 0 ? (
                <List
                  size="small"
                  dataSource={testResults.gestureConflicts.issues}
                  renderItem={(issue) => (
                    <List.Item>
                      <Space>
                        <WarningOutlined className="text-orange-500" />
                        <Text>{issue}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="success">✅ No gesture conflicts detected!</Text>
              )}
            </Card>

            {/* Viewport Configuration */}
            <Card size="small" title={
              <Space>
                <EyeOutlined />
                <Text>Viewport Configuration</Text>
                {testResults.viewport.valid ? 
                  <CheckCircleOutlined className="text-green-500" /> : 
                  <CloseCircleOutlined className="text-red-500" />
                }
              </Space>
            }>
              {testResults.viewport.issues.length > 0 ? (
                <List
                  size="small"
                  dataSource={testResults.viewport.issues}
                  renderItem={(issue) => (
                    <List.Item>
                      <Space>
                        <WarningOutlined className="text-orange-500" />
                        <Text>{issue}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="success">✅ Viewport configuration is optimal!</Text>
              )}
            </Card>

            {/* Detailed Issues */}
            {testResults.mobileAccessibility.issues.length > 0 && (
              <Card size="small" title={
                <Space>
                  <BugOutlined />
                  <Text>Detailed Accessibility Issues</Text>
                  <Badge count={testResults.mobileAccessibility.issues.length} />
                </Space>
              }>
                <List
                  size="small"
                  dataSource={testResults.mobileAccessibility.issues}
                  renderItem={(issue) => (
                    <List.Item>
                      <Space align="start">
                        {getIcon(issue.type)}
                        <div>
                          <Text strong>{issue.element}:</Text>
                          <br />
                          <Text>{issue.issue}</Text>
                          <br />
                          <Text type="secondary" className="text-xs">
                            💡 {issue.suggestion}
                          </Text>
                          {issue.wcagRule && (
                            <>
                              <br />
                              <Badge 
                                size="small" 
                                color="blue" 
                                text={issue.wcagRule} 
                                className="text-xs"
                              />
                            </>
                          )}
                        </div>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {/* Reduced Motion Status */}
            <Card size="small">
              <Space>
                <Text strong>Reduced Motion Preference:</Text>
                {testResults.reducedMotion ? (
                  <Badge status="success" text="User prefers reduced motion" />
                ) : (
                  <Badge status="default" text="No motion preference set" />
                )}
              </Space>
            </Card>
          </div>
        )}

        {/* Testing Instructions */}
        <Card title="📋 Manual Testing Instructions" size="small">
          <Paragraph className="text-sm">
            <Title level={5}>iOS VoiceOver Testing:</Title>
            1. Enable: Settings → Accessibility → VoiceOver<br />
            2. Navigate: Swipe right/left, double-tap to activate<br />
            3. Test all major app functions
            
            <Divider />
            
            <Title level={5}>Android TalkBack Testing:</Title>
            1. Enable: Settings → Accessibility → TalkBack<br />
            2. Navigate: Swipe right/left, double-tap to activate<br />
            3. Test all major app functions
            
            <Divider />
            
            <Title level={5}>Keyboard Navigation:</Title>
            • Tab through all interactive elements<br />
            • Verify focus indicators are visible<br />
            • Test Escape key for modals<br />
            • Verify logical tab order
          </Paragraph>
        </Card>
      </Space>
    </Card>
  );
};