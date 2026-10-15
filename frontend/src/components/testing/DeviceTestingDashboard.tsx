import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Space, Alert, Typography, List, Badge, Progress, Divider } from 'antd';
import { 
  MobileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  BugOutlined,
  WifiOutlined,
  EyeOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { 
  detectCurrentDevice, 
  checkDeviceTestingReadiness,
  simulateScreenReaderInteraction,
  validateTouchTargetsWithFeedback,
  TARGET_DEVICES,
  NETWORK_CONDITIONS
} from '../../utils/device-testing-utils';

const { Title, Text, Paragraph } = Typography;

interface DeviceTestingState {
  deviceInfo: any;
  readinessCheck: any;
  touchTargetValidation: any;
  screenReaderSimulation: any;
  lastUpdated: Date;
}

export const DeviceTestingDashboard: React.FC = () => {
  const [testingState, setTestingState] = useState<DeviceTestingState | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDeviceTests = useCallback(async () => {
    setIsRunning(true);
    
    try {
      // Detect current device
      const deviceInfo = detectCurrentDevice();
      
      // Check testing readiness
      const readinessCheck = checkDeviceTestingReadiness();
      
      // Validate touch targets
      const touchTargetValidation = validateTouchTargetsWithFeedback();
      
      // Initialize screen reader simulation
      const screenReaderSimulation = simulateScreenReaderInteraction();

      setTestingState({
        deviceInfo,
        readinessCheck,
        touchTargetValidation,
        screenReaderSimulation,
        lastUpdated: new Date()
      });

    } catch (error) {
      console.error('Device testing failed:', error);
    } finally {
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    runDeviceTests();
  }, [runDeviceTests]);

  if (!testingState) {
    return (
      <Card title="📱 Device Testing Dashboard" loading={true}>
        <Paragraph>Initializing device testing...</Paragraph>
      </Card>
    );
  }

  const { deviceInfo, readinessCheck, touchTargetValidation, screenReaderSimulation } = testingState;

  const getDeviceMatchBadge = () => {
    if (deviceInfo.isTargetDevice) {
      return <Badge status="success" text={`Target Device: ${deviceInfo.matched.name}`} />;
    } else {
      return <Badge status="warning" text="Non-target Device" />;
    }
  };

  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  return (
    <Card title="📱 Device Testing Dashboard" className="w-full">
      <Space direction="vertical" size="large" className="w-full">
        
        {/* Test Controls */}
        <div className="flex justify-between items-center">
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={runDeviceTests}
            loading={isRunning}
          >
            Refresh Device Tests
          </Button>
          <Text type="secondary" className="text-xs">
            Last updated: {testingState.lastUpdated.toLocaleTimeString()}
          </Text>
        </div>

        {/* Device Information */}
        <Card size="small" title={
          <Space>
            <MobileOutlined />
            <Text>Current Device Information</Text>
            {getDeviceMatchBadge()}
          </Space>
        }>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Text strong>Platform:</Text>
              <br />
              <Text>{deviceInfo.detected.platform} {deviceInfo.detected.category}</Text>
              
              <br /><br />
              <Text strong>Screen:</Text>
              <br />
              <Text>{deviceInfo.detected.screen.width}×{deviceInfo.detected.screen.height}</Text>
              <Text type="secondary"> (@{deviceInfo.detected.screen.pixelRatio}x)</Text>
              
              <br /><br />
              <Text strong>Viewport:</Text>
              <br />
              <Text>{deviceInfo.detected.viewport.width}×{deviceInfo.detected.viewport.height}</Text>
            </div>
            
            <div>
              <Text strong>Device Features:</Text>
              <br />
              <Space direction="vertical" size="small">
                <Badge 
                  status={deviceInfo.detected.isMobile ? "success" : "default"} 
                  text="Mobile Device" 
                />
                <Badge 
                  status={deviceInfo.detected.isTablet ? "success" : "default"} 
                  text="Tablet Device" 
                />
                <Badge 
                  status={deviceInfo.detected.isIOS ? "success" : "default"} 
                  text="iOS Platform" 
                />
                <Badge 
                  status={deviceInfo.detected.isAndroid ? "success" : "default"} 
                  text="Android Platform" 
                />
              </Space>
            </div>
          </div>
        </Card>

        {/* Testing Readiness */}
        <Card size="small" title={
          <Space>
            <BugOutlined />
            <Text>Testing Readiness</Text>
            <Progress 
              type="circle" 
              size={24} 
              percent={readinessCheck.score} 
              status={getReadinessColor(readinessCheck.score)}
              format={() => `${readinessCheck.score}%`}
            />
          </Space>
        }>
          {readinessCheck.issues.length > 0 && (
            <div className="mb-3">
              <Text strong className="text-red-600">Issues (Critical):</Text>
              <List
                size="small"
                dataSource={readinessCheck.issues}
                renderItem={(issue: string) => (
                  <List.Item>
                    <Space>
                      <CloseCircleOutlined className="text-red-500" />
                      <Text>{issue}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          )}
          
          {readinessCheck.warnings.length > 0 && (
            <div className="mb-3">
              <Text strong className="text-orange-600">Warnings:</Text>
              <List
                size="small"
                dataSource={readinessCheck.warnings}
                renderItem={(warning: string) => (
                  <List.Item>
                    <Space>
                      <WarningOutlined className="text-orange-500" />
                      <Text>{warning}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          )}
          
          {readinessCheck.info.length > 0 && (
            <div>
              <Text strong className="text-blue-600">Information:</Text>
              <List
                size="small"
                dataSource={readinessCheck.info}
                renderItem={(info: string) => (
                  <List.Item>
                    <Space>
                      <InfoCircleOutlined className="text-blue-500" />
                      <Text>{info}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          )}
        </Card>

        {/* Touch Target Validation */}
        <Card size="small" title={
          <Space>
            <ToolOutlined />
            <Text>Touch Target Validation</Text>
            <Badge 
              count={touchTargetValidation.issues.length} 
              status={touchTargetValidation.issues.length === 0 ? "success" : "error"}
            />
          </Space>
        }>
          <div className="mb-3">
            <Progress 
              percent={touchTargetValidation.successRate}
              status={touchTargetValidation.successRate >= 95 ? 'success' : 
                     touchTargetValidation.successRate >= 80 ? 'normal' : 'exception'}
              format={(percent) => `${percent?.toFixed(1)}% Success Rate`}
            />
            <Text type="secondary" className="text-xs">
              {touchTargetValidation.passedElements}/{touchTargetValidation.totalElements} elements pass minimum size requirements
            </Text>
          </div>
          
          {touchTargetValidation.issues.length > 0 && (
            <div>
              <Text strong>Issues Found:</Text>
              <List
                size="small"
                dataSource={touchTargetValidation.issues.slice(0, 5)} // Show only first 5
                renderItem={(issue: any) => (
                  <List.Item>
                    <Space>
                      {issue.severity === 'error' ? 
                        <CloseCircleOutlined className="text-red-500" /> :
                        <WarningOutlined className="text-orange-500" />
                      }
                      <div>
                        <Text>
                          Element too small: {Math.round(issue.size.width)}×{Math.round(issue.size.height)}px
                        </Text>
                        <br />
                        <Text type="secondary" className="text-xs">
                          Position: {Math.round(issue.position.x)}, {Math.round(issue.position.y)}
                        </Text>
                      </div>
                    </Space>
                  </List.Item>
                )}
              />
              {touchTargetValidation.issues.length > 5 && (
                <Text type="secondary" className="text-xs">
                  ...and {touchTargetValidation.issues.length - 5} more issues
                </Text>
              )}
            </div>
          )}
        </Card>

        {/* Target Device Matrix */}
        <Card size="small" title={
          <Space>
            <EyeOutlined />
            <Text>Target Device Matrix</Text>
          </Space>
        }>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(TARGET_DEVICES).map(([deviceName, deviceSpec]) => {
              const isCurrentDevice = deviceInfo.matched?.name === deviceName;
              return (
                <div 
                  key={deviceName}
                  className={`p-3 border rounded ${isCurrentDevice ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <Text strong>{deviceName}</Text>
                      {isCurrentDevice && <Badge status="processing" text="Current" className="ml-2" />}
                      <br />
                      <Text type="secondary" className="text-xs">
                        {deviceSpec.viewport.width}×{deviceSpec.viewport.height} • {deviceSpec.platform}
                      </Text>
                      <br />
                      <Badge 
                        color={deviceSpec.priority === 'primary' ? 'blue' : 'gray'} 
                        text={deviceSpec.priority} 
                        size="small"
                      />
                    </div>
                  </div>
                  <Paragraph className="text-xs mt-2 mb-0">
                    {deviceSpec.notes}
                  </Paragraph>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Network Conditions */}
        <Card size="small" title={
          <Space>
            <WifiOutlined />
            <Text>Network Test Conditions</Text>
          </Space>
        }>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(NETWORK_CONDITIONS).map(([key, condition]) => (
              <div key={key} className="p-3 border rounded border-gray-200">
                <Text strong>{condition.name}</Text>
                <br />
                <Text type="secondary" className="text-xs">
                  ↓{condition.downloadThroughput}kbps ↑{condition.uploadThroughput}kbps
                </Text>
                <br />
                <Text type="secondary" className="text-xs">
                  Latency: {condition.latency}ms
                </Text>
                <br />
                <Badge 
                  status={condition.downloadThroughput > 2000 ? 'success' : 
                           condition.downloadThroughput > 500 ? 'warning' : 'error'} 
                  text={condition.description}
                  size="small"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Setup Instructions */}
        <Alert
          message="Quick Device Setup"
          description={
            <div>
              <Text strong>iOS:</Text> Settings → Accessibility → VoiceOver → On
              <br />
              <Text strong>Android:</Text> Settings → Accessibility → TalkBack → On
              <br />
              <Text strong>Testing:</Text> Use the accessibility tab for screen reader simulation
            </div>
          }
          type="info"
          showIcon
        />
      </Space>
    </Card>
  );
};