import React from 'react';
import { Card, Switch, Select, Button, Space, Typography, Divider, Alert } from 'antd';
import { 
  MobileOutlined, 
  SettingOutlined, 
  ExperimentFilled,
  SoundOutlined 
} from '@ant-design/icons';
import { useHaptics, HapticPattern } from '../../hooks/useHaptics';

const { Title, Text, Paragraph } = Typography;

export const HapticPreferences: React.FC = () => {
  const {
    isSupported,
    preferences,
    updatePreferences,
    isEnabled,
    tapFeedback,
    pressFeedback,
    longPressFeedback,
    successFeedback,
    errorFeedback,
    warningFeedback,
    swipeSuccessFeedback,
    dragDropFeedback,
    notificationFeedback
  } = useHaptics();

  const handleEnabledChange = (enabled: boolean) => {
    updatePreferences({ enabled });
    if (enabled && isSupported) {
      successFeedback();
    }
  };

  const handleIntensityChange = (intensity: 'light' | 'medium' | 'strong') => {
    updatePreferences({ intensity });
    if (isEnabled) {
      pressFeedback();
    }
  };

  const testPatterns: Array<{
    name: string;
    label: string;
    description: string;
    trigger: () => void;
    icon: React.ReactNode;
  }> = [
    {
      name: 'tap',
      label: 'Light Tap',
      description: 'Quick, subtle feedback for taps and selections',
      trigger: tapFeedback,
      icon: <MobileOutlined />
    },
    {
      name: 'press',
      label: 'Medium Press',
      description: 'Standard feedback for button presses',
      trigger: pressFeedback,
      icon: <SettingOutlined />
    },
    {
      name: 'longPress',
      label: 'Long Press',
      description: 'Strong feedback for long press actions',
      trigger: longPressFeedback,
      icon: <ExperimentFilled />
    },
    {
      name: 'success',
      label: 'Success',
      description: 'Positive feedback for successful actions',
      trigger: successFeedback,
      icon: <SoundOutlined />
    },
    {
      name: 'error',
      label: 'Error',
      description: 'Alert feedback for errors or warnings',
      trigger: errorFeedback,
      icon: <SoundOutlined />
    },
    {
      name: 'swipeSuccess',
      label: 'Swipe Success',
      description: 'Multi-pattern feedback for completed swipes',
      trigger: swipeSuccessFeedback,
      icon: <MobileOutlined />
    },
    {
      name: 'dragDrop',
      label: 'Drag & Drop',
      description: 'Feedback for drag and drop interactions',
      trigger: dragDropFeedback,
      icon: <ExperimentFilled />
    },
    {
      name: 'notification',
      label: 'Notification',
      description: 'Complex pattern for important notifications',
      trigger: notificationFeedback,
      icon: <SoundOutlined />
    }
  ];

  if (!isSupported) {
    return (
      <Card
        title={
          <Space>
            <MobileOutlined />
            <span>Haptic Feedback</span>
          </Space>
        }
        className="w-full"
      >
        <Alert
          type="info"
          message="Haptic Feedback Not Supported"
          description="Your device or browser does not support haptic feedback (vibration). This feature requires a device with vibration capabilities and a compatible browser."
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <MobileOutlined />
          <span>Haptic Feedback</span>
        </Space>
      }
      className="w-full"
    >
      <div className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Text strong>Enable Haptic Feedback</Text>
            <br />
            <Text type="secondary" className="text-sm">
              Feel vibrations when interacting with the app
            </Text>
          </div>
          <Switch
            checked={preferences.enabled}
            onChange={handleEnabledChange}
            disabled={!isSupported}
          />
        </div>

        <Divider />

        {/* Intensity Selection */}
        <div className="space-y-3">
          <div>
            <Text strong>Vibration Intensity</Text>
            <br />
            <Text type="secondary" className="text-sm">
              Adjust how strong the vibrations feel
            </Text>
          </div>
          
          <Select
            value={preferences.intensity}
            onChange={handleIntensityChange}
            disabled={!isEnabled}
            className="w-full"
            options={[
              {
                value: 'light',
                label: 'Light - Subtle and gentle vibrations'
              },
              {
                value: 'medium',
                label: 'Medium - Balanced vibration strength'
              },
              {
                value: 'strong',
                label: 'Strong - More noticeable vibrations'
              }
            ]}
          />
        </div>

        <Divider />

        {/* Pattern Testing */}
        <div className="space-y-4">
          <div>
            <Title level={5} className="!mb-2">Test Haptic Patterns</Title>
            <Paragraph type="secondary" className="!mb-4">
              Try different vibration patterns to see how they feel with your current settings.
            </Paragraph>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {testPatterns.map((pattern) => (
              <Button
                key={pattern.name}
                onClick={pattern.trigger}
                disabled={!isEnabled}
                className="h-auto p-4 text-left"
                block
              >
                <div className="flex items-start space-x-3">
                  <div className="text-lg text-blue-500 mt-0.5">
                    {pattern.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {pattern.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {pattern.description}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <Title level={5} className="!mb-2 !text-blue-700 dark:!text-blue-300">
            About Haptic Feedback
          </Title>
          <Paragraph className="!mb-0 text-sm text-blue-600 dark:text-blue-400">
            Haptic feedback uses your device's vibration motor to provide tactile responses to your interactions. 
            This can make the app feel more responsive and help confirm actions, especially on touch devices.
          </Paragraph>
        </div>

        {/* Current Status */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Status: {isEnabled ? 'Enabled' : 'Disabled'}</span>
          <span>Intensity: {preferences.intensity}</span>
        </div>
      </div>
    </Card>
  );
};