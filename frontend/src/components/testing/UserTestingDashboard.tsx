import React, { useState, useCallback } from 'react';
import { Card, Button, Space, Alert, Typography, List, Badge, Progress, Form, Input, Rate, Divider, Modal } from 'antd';
import { 
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StarOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  BugOutlined,
  ExperimentFilled,
  ThunderboltOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph, TextArea } = Typography;

interface UserTestSession {
  id: string;
  userId: string;
  deviceInfo: string;
  startTime: Date;
  endTime?: Date;
  tasks: UserTestTask[];
  overallRating: number;
  feedback: string;
  issues: string[];
}

interface UserTestTask {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  timeToComplete: number;
  difficulty: number;
  success: boolean;
  notes: string;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  steps: string[];
  successCriteria: string;
  estimatedTime: number;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'onboarding',
    name: 'App Onboarding',
    description: 'First-time user experience and setup',
    steps: [
      'Open the app for the first time',
      'Complete any initial setup or tutorial',
      'Navigate to the main dashboard',
      'Understand the primary features'
    ],
    successCriteria: 'User can successfully navigate and understand basic app structure',
    estimatedTime: 120 // seconds
  },
  {
    id: 'quick-task',
    name: 'Quick Task Creation',
    description: 'Create a new task using the quick creator',
    steps: [
      'Find the quick task creation input',
      'Enter a task title',
      'Submit the task',
      'Verify task appears in the list'
    ],
    successCriteria: 'Task is created and visible within 10 seconds',
    estimatedTime: 30
  },
  {
    id: 'kanban-interaction',
    name: 'Kanban Board Usage',
    description: 'Navigate and interact with kanban board',
    steps: [
      'Access the kanban board view',
      'Move between columns using gestures',
      'Drag a task to different column',
      'Edit a task by tapping on it'
    ],
    successCriteria: 'User can successfully manipulate tasks on kanban board',
    estimatedTime: 90
  },
  {
    id: 'search-filter',
    name: 'Search and Filter Tasks',
    description: 'Find specific tasks using search and filters',
    steps: [
      'Use search functionality to find tasks',
      'Apply filters to narrow results',
      'Clear filters to show all tasks',
      'Navigate back to main view'
    ],
    successCriteria: 'User can efficiently find specific tasks',
    estimatedTime: 60
  },
  {
    id: 'accessibility',
    name: 'Accessibility Features',
    description: 'Test app with accessibility features enabled',
    steps: [
      'Enable screen reader (VoiceOver/TalkBack)',
      'Navigate through main features using screen reader',
      'Test with high contrast mode',
      'Use voice control if available'
    ],
    successCriteria: 'App remains fully functional with accessibility features',
    estimatedTime: 180
  }
];

export const UserTestingDashboard: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<UserTestSession | null>(null);
  const [testSessions, setTestSessions] = useState<UserTestSession[]>([]);
  const [isTestingActive, setIsTestingActive] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [form] = Form.useForm();

  const startTestSession = useCallback((scenario: TestScenario) => {
    const session: UserTestSession = {
      id: `session-${Date.now()}`,
      userId: `user-${Math.random().toString(36).substring(7)}`,
      deviceInfo: `${navigator.platform} - ${navigator.userAgent.substring(0, 50)}...`,
      startTime: new Date(),
      tasks: [],
      overallRating: 0,
      feedback: '',
      issues: []
    };

    setCurrentSession(session);
    setSelectedScenario(scenario);
    setCurrentTaskIndex(0);
    setIsTestingActive(true);
  }, []);

  const completeCurrentTask = useCallback((success: boolean, timeSpent: number, notes: string = '') => {
    if (!currentSession || !selectedScenario) return;

    const task: UserTestTask = {
      id: `task-${currentTaskIndex}`,
      name: selectedScenario.steps[currentTaskIndex] || 'Task',
      description: selectedScenario.description,
      completed: true,
      timeToComplete: timeSpent,
      difficulty: 3, // Default difficulty
      success,
      notes
    };

    const updatedSession = {
      ...currentSession,
      tasks: [...currentSession.tasks, task]
    };

    setCurrentSession(updatedSession);

    if (currentTaskIndex < selectedScenario.steps.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    } else {
      // Test scenario complete
      setShowFeedbackModal(true);
    }
  }, [currentSession, selectedScenario, currentTaskIndex]);

  const endTestSession = useCallback((rating: number, feedback: string, issues: string[]) => {
    if (!currentSession) return;

    const completedSession: UserTestSession = {
      ...currentSession,
      endTime: new Date(),
      overallRating: rating,
      feedback,
      issues
    };

    setTestSessions(prev => [...prev, completedSession]);
    setCurrentSession(null);
    setSelectedScenario(null);
    setIsTestingActive(false);
    setCurrentTaskIndex(0);
    setShowFeedbackModal(false);
    form.resetFields();
  }, [currentSession, form]);

  const getSessionStats = () => {
    const totalSessions = testSessions.length;
    const avgRating = testSessions.length > 0 
      ? testSessions.reduce((sum, session) => sum + session.overallRating, 0) / testSessions.length 
      : 0;
    const totalIssues = testSessions.reduce((sum, session) => sum + session.issues.length, 0);
    const avgTaskTime = testSessions.length > 0
      ? testSessions.flatMap(s => s.tasks).reduce((sum, task, _, arr) => sum + task.timeToComplete / arr.length, 0)
      : 0;

    return { totalSessions, avgRating, totalIssues, avgTaskTime };
  };

  const stats = getSessionStats();

  const handleFeedbackSubmit = (values: any) => {
    const issues = values.issues ? values.issues.split('\n').filter((issue: string) => issue.trim()) : [];
    endTestSession(values.rating, values.feedback || '', issues);
  };

  return (
    <Card title="👥 User Testing Dashboard" className="w-full">
      <Space direction="vertical" size="large" className="w-full">
        
        {/* Testing Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card size="small" className="text-center">
            <UserOutlined className="text-2xl text-blue-500 mb-2" />
            <div>
              <Text strong>{stats.totalSessions}</Text>
              <br />
              <Text type="secondary" className="text-xs">Test Sessions</Text>
            </div>
          </Card>
          
          <Card size="small" className="text-center">
            <StarOutlined className="text-2xl text-yellow-500 mb-2" />
            <div>
              <Text strong>{stats.avgRating.toFixed(1)}/5</Text>
              <br />
              <Text type="secondary" className="text-xs">Average Rating</Text>
            </div>
          </Card>
          
          <Card size="small" className="text-center">
            <BugOutlined className="text-2xl text-red-500 mb-2" />
            <div>
              <Text strong>{stats.totalIssues}</Text>
              <br />
              <Text type="secondary" className="text-xs">Issues Found</Text>
            </div>
          </Card>
          
          <Card size="small" className="text-center">
            <ClockCircleOutlined className="text-2xl text-green-500 mb-2" />
            <div>
              <Text strong>{Math.round(stats.avgTaskTime)}s</Text>
              <br />
              <Text type="secondary" className="text-xs">Avg Task Time</Text>
            </div>
          </Card>
        </div>

        {/* Active Test Session */}
        {isTestingActive && currentSession && selectedScenario ? (
          <Card title="🧪 Active Test Session" size="small" className="border-blue-300">
            <Space direction="vertical" className="w-full">
              <div className="flex justify-between items-center">
                <div>
                  <Text strong>{selectedScenario.name}</Text>
                  <br />
                  <Text type="secondary">{selectedScenario.description}</Text>
                </div>
                <Badge status="processing" text="In Progress" />
              </div>
              
              <Progress 
                percent={Math.round(((currentTaskIndex + 1) / selectedScenario.steps.length) * 100)}
                format={(percent) => `Step ${currentTaskIndex + 1}/${selectedScenario.steps.length}`}
              />
              
              <Card size="small" className="bg-blue-50">
                <Text strong>Current Step:</Text>
                <br />
                <Text>{selectedScenario.steps[currentTaskIndex]}</Text>
                
                <div className="mt-4 flex gap-2">
                  <Button 
                    type="primary" 
                    icon={<CheckCircleOutlined />}
                    onClick={() => completeCurrentTask(true, Math.random() * 30 + 10)}
                  >
                    Success
                  </Button>
                  <Button 
                    danger 
                    icon={<CloseCircleOutlined />}
                    onClick={() => completeCurrentTask(false, Math.random() * 60 + 30)}
                  >
                    Failed
                  </Button>
                  <Button 
                    icon={<PauseCircleOutlined />}
                    onClick={() => setIsTestingActive(false)}
                  >
                    Pause
                  </Button>
                </div>
              </Card>
            </Space>
          </Card>
        ) : (
          /* Test Scenarios */
          <Card title="📋 Test Scenarios" size="small">
            <List
              dataSource={TEST_SCENARIOS}
              renderItem={(scenario) => (
                <List.Item
                  actions={[
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={() => startTestSession(scenario)}
                      disabled={isTestingActive}
                    >
                      Start Test
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<ExperimentFilled className="text-blue-500" />}
                    title={
                      <Space>
                        <Text strong>{scenario.name}</Text>
                        <Badge color="blue" text={`~${scenario.estimatedTime}s`} size="small" />
                      </Space>
                    }
                    description={
                      <div>
                        <Text>{scenario.description}</Text>
                        <br />
                        <Text type="secondary" className="text-xs">
                          {scenario.steps.length} steps | Success: {scenario.successCriteria}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}

        {/* Test Sessions History */}
        {testSessions.length > 0 && (
          <Card title="📊 Test Sessions History" size="small">
            <List
              dataSource={testSessions.slice(-5)} // Show last 5 sessions
              renderItem={(session) => {
                const duration = session.endTime 
                  ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000)
                  : 0;
                const successRate = session.tasks.length > 0
                  ? Math.round((session.tasks.filter(t => t.success).length / session.tasks.length) * 100)
                  : 0;

                return (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<UserOutlined />}
                      title={
                        <Space>
                          <Text strong>Session {session.id}</Text>
                          <Rate disabled value={session.overallRating} count={5} style={{ fontSize: 12 }} />
                        </Space>
                      }
                      description={
                        <div>
                          <Text type="secondary" className="text-xs">
                            Duration: {duration}s | Success Rate: {successRate}% | Issues: {session.issues.length}
                          </Text>
                          <br />
                          <Text type="secondary" className="text-xs">
                            Device: {session.deviceInfo}
                          </Text>
                          {session.feedback && (
                            <>
                              <br />
                              <Text className="text-xs">"{session.feedback}"</Text>
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
        )}

        {/* UX Polish Recommendations */}
        <Card title="✨ UX Polish Recommendations" size="small">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Text strong>High Priority Improvements:</Text>
              <List
                size="small"
                dataSource={[
                  'Add loading states for better perceived performance',
                  'Implement haptic feedback for touch interactions',
                  'Optimize touch target sizes for fat fingers',
                  'Add smooth transitions between views',
                  'Implement pull-to-refresh gesture'
                ]}
                renderItem={(item) => (
                  <List.Item className="border-0 py-1">
                    <Text className="text-sm">• {item}</Text>
                  </List.Item>
                )}
              />
            </div>
            
            <div>
              <Text strong>Nice-to-Have Enhancements:</Text>
              <List
                size="small"
                dataSource={[
                  'Add dark mode toggle animation',
                  'Implement swipe gestures for navigation',
                  'Add contextual help tooltips',
                  'Improve error message clarity',
                  'Add celebration animations for achievements'
                ]}
                renderItem={(item) => (
                  <List.Item className="border-0 py-1">
                    <Text className="text-sm">• {item}</Text>
                  </List.Item>
                )}
              />
            </div>
          </div>
        </Card>

        {/* Testing Guidelines */}
        <Alert
          message="User Testing Best Practices"
          description={
            <div>
              <Text strong>Before Testing:</Text> Prepare realistic scenarios, ensure device is clean, have backup devices ready
              <br />
              <Text strong>During Testing:</Text> Observe without interfering, take notes on hesitations and confusion
              <br />
              <Text strong>After Testing:</Text> Gather honest feedback, document issues immediately, prioritize critical problems
            </div>
          }
          type="info"
          showIcon
        />
      </Space>

      {/* Feedback Modal */}
      <Modal
        title="📝 Test Session Feedback"
        open={showFeedbackModal}
        onCancel={() => setShowFeedbackModal(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleFeedbackSubmit} layout="vertical">
          <Form.Item
            name="rating"
            label="Overall Experience Rating"
            rules={[{ required: true, message: 'Please rate the experience' }]}
          >
            <Rate />
          </Form.Item>
          
          <Form.Item
            name="feedback"
            label="General Feedback"
          >
            <TextArea rows={3} placeholder="How was the overall experience using the app?" />
          </Form.Item>
          
          <Form.Item
            name="issues"
            label="Issues or Problems (one per line)"
          >
            <TextArea rows={4} placeholder="List any issues, bugs, or confusing elements you encountered..." />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Submit Feedback
              </Button>
              <Button onClick={() => setShowFeedbackModal(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};