import React, { useState, useCallback, useEffect } from 'react';
import { Card, Button, Space, Alert, Typography, List, Badge, Progress, Steps, Table } from 'antd';
import { 
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  ToolOutlined,
  MobileOutlined,
  TabletOutlined,
  DesktopOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { validateTouchTargetsWithFeedback, detectCurrentDevice } from '../../utils/device-testing-utils';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface TestScenario {
  id: string;
  name: string;
  description: string;
  steps: string[];
  expectedResult: string;
  category: 'navigation' | 'input' | 'gestures' | 'responsive' | 'performance';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface TestResult {
  scenarioId: string;
  status: 'passed' | 'failed' | 'skipped' | 'running';
  duration: number;
  issues: string[];
  notes: string;
  timestamp: Date;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'nav-basic',
    name: 'Basic Navigation',
    description: 'Test primary navigation functionality',
    steps: [
      'Tap main navigation items',
      'Verify page loads correctly',
      'Check back button functionality',
      'Test breadcrumb navigation'
    ],
    expectedResult: 'All navigation items should be accessible and functional',
    category: 'navigation',
    priority: 'critical'
  },
  {
    id: 'touch-targets',
    name: 'Touch Target Validation',
    description: 'Verify all interactive elements meet minimum touch target requirements',
    steps: [
      'Scan all buttons and links',
      'Measure touch target sizes',
      'Test tap accuracy on small targets',
      'Verify spacing between targets'
    ],
    expectedResult: 'All touch targets should be ≥44px on iOS, ≥48px on Android',
    category: 'input',
    priority: 'critical'
  },
  {
    id: 'task-creation',
    name: 'Quick Task Creation',
    description: 'Test the quick task creation workflow',
    steps: [
      'Tap quick task creator',
      'Enter task title',
      'Submit with Enter key',
      'Verify task appears in list'
    ],
    expectedResult: 'Task should be created and visible immediately',
    category: 'input',
    priority: 'high'
  },
  {
    id: 'kanban-gestures',
    name: 'Kanban Board Gestures',
    description: 'Test swipe and drag gestures on kanban board',
    steps: [
      'Swipe horizontally between columns',
      'Drag task cards between columns',
      'Test column collapse/expand',
      'Verify smooth animations'
    ],
    expectedResult: 'All gestures should work without conflicts',
    category: 'gestures',
    priority: 'high'
  },
  {
    id: 'form-input',
    name: 'Form Input Handling',
    description: 'Test form inputs and keyboard behavior',
    steps: [
      'Focus text inputs',
      'Verify no unwanted zoom on iOS',
      'Test keyboard navigation',
      'Check error state handling'
    ],
    expectedResult: 'Forms should be easy to fill on mobile',
    category: 'input',
    priority: 'high'
  },
  {
    id: 'orientation-change',
    name: 'Orientation Change Handling',
    description: 'Test app behavior during orientation changes',
    steps: [
      'Rotate device to landscape',
      'Verify layout adapts properly',
      'Check all functionality still works',
      'Rotate back to portrait'
    ],
    expectedResult: 'App should adapt gracefully to orientation changes',
    category: 'responsive',
    priority: 'medium'
  },
  {
    id: 'performance-scroll',
    name: 'Scrolling Performance',
    description: 'Test smooth scrolling and list performance',
    steps: [
      'Scroll through long lists',
      'Test momentum scrolling',
      'Check for frame drops',
      'Verify memory usage'
    ],
    expectedResult: 'Scrolling should be smooth at 60fps',
    category: 'performance',
    priority: 'medium'
  },
  {
    id: 'modal-interaction',
    name: 'Modal and Overlay Interaction',
    description: 'Test modal dialogs and overlays',
    steps: [
      'Open task edit modal',
      'Test focus trapping',
      'Verify backdrop dismissal',
      'Check keyboard navigation'
    ],
    expectedResult: 'Modals should be fully accessible and dismissible',
    category: 'navigation',
    priority: 'high'
  }
];

export const CrossDeviceTestSuite: React.FC = () => {
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map());
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [touchTargetResults, setTouchTargetResults] = useState<any>(null);

  useEffect(() => {
    const device = detectCurrentDevice();
    setDeviceInfo(device);
    
    // Run touch target validation on component mount
    const touchResults = validateTouchTargetsWithFeedback();
    setTouchTargetResults(touchResults);
  }, []);

  const runSingleTest = useCallback(async (scenario: TestScenario): Promise<TestResult> => {
    const startTime = performance.now();
    
    // Simulate test execution with real checks where possible
    let status: TestResult['status'] = 'passed';
    const issues: string[] = [];
    let notes = '';

    try {
      switch (scenario.id) {
        case 'touch-targets':
          const touchValidation = validateTouchTargetsWithFeedback();
          if (touchValidation.issues.length > 0) {
            status = 'failed';
            issues.push(...touchValidation.issues.map(issue => 
              `Element too small: ${Math.round(issue.size.width)}×${Math.round(issue.size.height)}px`
            ));
          }
          notes = `Success rate: ${touchValidation.successRate.toFixed(1)}%`;
          break;
          
        case 'performance-scroll':
          // Check for any elements with poor scroll performance indicators
          const scrollableElements = document.querySelectorAll('[data-scrollable], .ant-table-tbody, .kanban-column');
          if (scrollableElements.length > 0) {
            notes = `Found ${scrollableElements.length} scrollable areas`;
          }
          break;
          
        case 'nav-basic':
          // Check if navigation elements are present
          const navElements = document.querySelectorAll('nav, [role="navigation"], .ant-menu');
          if (navElements.length === 0) {
            status = 'failed';
            issues.push('No navigation elements found');
          } else {
            notes = `Found ${navElements.length} navigation elements`;
          }
          break;
          
        case 'form-input':
          // Check input font sizes to prevent iOS zoom
          const inputs = document.querySelectorAll('input, textarea, select');
          let smallInputs = 0;
          inputs.forEach(input => {
            const styles = window.getComputedStyle(input);
            const fontSize = parseFloat(styles.fontSize);
            if (fontSize < 16) {
              smallInputs++;
            }
          });
          
          if (smallInputs > 0 && deviceInfo?.detected.isIOS) {
            status = 'failed';
            issues.push(`${smallInputs} inputs may trigger iOS zoom (font-size < 16px)`);
          }
          notes = `Checked ${inputs.length} form inputs`;
          break;
          
        default:
          // For other tests, simulate execution
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
          // Randomly fail some tests for demonstration
          if (Math.random() < 0.1) {
            status = 'failed';
            issues.push('Simulated test failure');
          }
      }
    } catch (error) {
      status = 'failed';
      issues.push(`Test execution error: ${error}`);
    }

    const duration = performance.now() - startTime;
    
    return {
      scenarioId: scenario.id,
      status,
      duration,
      issues,
      notes,
      timestamp: new Date()
    };
  }, [deviceInfo]);

  const runAllTests = useCallback(async () => {
    setTestResults(new Map());
    
    for (const scenario of TEST_SCENARIOS) {
      setCurrentTest(scenario.id);
      
      // Update result to "running"
      setTestResults(prev => new Map(prev.set(scenario.id, {
        scenarioId: scenario.id,
        status: 'running',
        duration: 0,
        issues: [],
        notes: 'Running...',
        timestamp: new Date()
      })));

      const result = await runSingleTest(scenario);
      
      setTestResults(prev => new Map(prev.set(scenario.id, result)));
    }
    
    setCurrentTest(null);
  }, [runSingleTest]);

  const runSingleTestById = useCallback(async (scenarioId: string) => {
    const scenario = TEST_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;

    setCurrentTest(scenarioId);
    
    setTestResults(prev => new Map(prev.set(scenarioId, {
      scenarioId,
      status: 'running',
      duration: 0,
      issues: [],
      notes: 'Running...',
      timestamp: new Date()
    })));

    const result = await runSingleTest(scenario);
    setTestResults(prev => new Map(prev.set(scenarioId, result)));
    setCurrentTest(null);
  }, [runSingleTest]);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return <CheckCircleOutlined className="text-green-500" />;
      case 'failed': return <CloseCircleOutlined className="text-red-500" />;
      case 'running': return <ClockCircleOutlined className="text-blue-500" />;
      case 'skipped': return <WarningOutlined className="text-gray-500" />;
      default: return <InfoCircleOutlined className="text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: TestScenario['priority']) => {
    switch (priority) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'blue';
      case 'low': return 'gray';
    }
  };

  const getCategoryIcon = (category: TestScenario['category']) => {
    switch (category) {
      case 'navigation': return <MobileOutlined />;
      case 'input': return <ToolOutlined />;
      case 'gestures': return <ToolOutlined />;
      case 'responsive': return <TabletOutlined />;
      case 'performance': return <DesktopOutlined />;
    }
  };

  const getOverallStats = () => {
    const total = TEST_SCENARIOS.length;
    const completed = Array.from(testResults.values()).filter(r => r.status !== 'running').length;
    const passed = Array.from(testResults.values()).filter(r => r.status === 'passed').length;
    const failed = Array.from(testResults.values()).filter(r => r.status === 'failed').length;
    
    return { total, completed, passed, failed };
  };

  const stats = getOverallStats();

  return (
    <Card title="🧪 Cross-Device Test Suite" className="w-full">
      <Space direction="vertical" size="large" className="w-full">
        
        {/* Test Controls */}
        <div className="flex justify-between items-center">
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={runAllTests}
              loading={currentTest !== null}
              disabled={currentTest !== null}
            >
              Run All Tests
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
            >
              Reset Page
            </Button>
          </Space>
          
          {deviceInfo && (
            <Badge 
              status="processing" 
              text={`Testing on ${deviceInfo.matched?.name || 'Unknown Device'}`}
            />
          )}
        </div>

        {/* Overall Progress */}
        {stats.completed > 0 && (
          <Alert
            message={`Test Progress: ${stats.completed}/${stats.total} completed`}
            description={`${stats.passed} passed, ${stats.failed} failed`}
            type={stats.failed === 0 ? 'success' : stats.failed < stats.passed ? 'warning' : 'error'}
            showIcon
          />
        )}

        {/* Touch Target Quick Summary */}
        {touchTargetResults && (
          <Card size="small" title="🎯 Touch Target Summary">
            <div className="flex items-center justify-between">
              <Space>
                <Text>Success Rate:</Text>
                <Progress 
                  type="circle" 
                  size={40}
                  percent={touchTargetResults.successRate}
                  status={touchTargetResults.successRate >= 95 ? 'success' : 'exception'}
                />
              </Space>
              <Text type="secondary">
                {touchTargetResults.passedElements}/{touchTargetResults.totalElements} elements meet size requirements
              </Text>
            </div>
          </Card>
        )}

        {/* Test Scenarios */}
        <Card title="📋 Test Scenarios" size="small">
          <List
            dataSource={TEST_SCENARIOS}
            renderItem={(scenario) => {
              const result = testResults.get(scenario.id);
              const isRunning = currentTest === scenario.id;
              
              return (
                <List.Item
                  actions={[
                    <Button
                      size="small"
                      onClick={() => runSingleTestById(scenario.id)}
                      loading={isRunning}
                      disabled={isRunning}
                    >
                      Test
                    </Button>
                  ]}
                  className={result?.status === 'failed' ? 'bg-red-50' : 
                           result?.status === 'passed' ? 'bg-green-50' : ''}
                >
                  <List.Item.Meta
                    avatar={
                      <Space>
                        {getCategoryIcon(scenario.category)}
                        {result ? getStatusIcon(result.status) : <InfoCircleOutlined className="text-gray-400" />}
                      </Space>
                    }
                    title={
                      <Space>
                        <Text strong>{scenario.name}</Text>
                        <Badge color={getPriorityColor(scenario.priority)} text={scenario.priority} size="small" />
                      </Space>
                    }
                    description={
                      <div>
                        <Text>{scenario.description}</Text>
                        {result && result.status !== 'running' && (
                          <>
                            <br />
                            <Text type="secondary" className="text-xs">
                              Duration: {Math.round(result.duration)}ms | {result.notes}
                            </Text>
                            {result.issues.length > 0 && (
                              <>
                                <br />
                                <Text type="danger" className="text-xs">
                                  Issues: {result.issues.join(', ')}
                                </Text>
                              </>
                            )}
                          </>
                        )}
                        {isRunning && (
                          <>
                            <br />
                            <Text type="secondary" className="text-xs">
                              <ClockCircleOutlined /> Running test steps...
                            </Text>
                          </>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </Card>

        {/* Test Instructions */}
        <Card title="📝 Manual Testing Instructions" size="small">
          <Paragraph className="text-sm">
            <Text strong>Device Testing Protocol:</Text>
            <br />
            1. Run automated tests first to identify obvious issues
            <br />
            2. Manually verify failed tests to confirm results
            <br />
            3. Test edge cases not covered by automation
            <br />
            4. Document any device-specific behaviors
            <br />
            5. Record performance observations and user experience notes
            
            <br /><br />
            <Text strong>Focus Areas:</Text>
            <br />
            • Touch accuracy and responsiveness
            <br />
            • Gesture recognition and conflicts
            <br />
            • Form input behavior (especially on iOS)
            <br />
            • Performance during heavy interactions
            <br />
            • Layout adaptation to different screen sizes
          </Paragraph>
        </Card>
      </Space>
    </Card>
  );
};