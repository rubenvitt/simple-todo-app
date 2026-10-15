import React, { useState } from 'react';
import { Card, Space, Typography, Tag } from 'antd';
import { MobileOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { HapticButton } from '../ui/HapticButton';
import { useHaptics, useSwipeHaptics } from '../../hooks';

const { Title, Text } = Typography;

export const HapticDemo: React.FC = () => {
  const { isSupported, isEnabled, preferences } = useHaptics();
  const [swipeCount, setSwipeCount] = useState(0);
  
  const swipeHaptics = useSwipeHaptics({
    enableSwipeStart: true,
    enableSwipeEnd: true,
    enableSwipeSuccess: true,
    swipeThreshold: 30
  });

  const handleSwipeComplete = () => {
    setSwipeCount(prev => prev + 1);
    swipeHaptics.triggerSwipeEnd(true);
  };

  const handleSwipeCancel = () => {
    swipeHaptics.triggerSwipeEnd(false);
  };

  if (!isSupported) {
    return (
      <Card className="w-full">
        <div className="text-center p-6">
          <MobileOutlined className="text-4xl text-gray-400 mb-4" />
          <Title level={4} className="text-gray-600">
            Haptic Feedback Not Available
          </Title>
          <Text type="secondary">
            Your device doesn't support haptic feedback
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card
        title={
          <Space>
            <ThunderboltOutlined />
            <span>Haptic Feedback Demo</span>
          </Space>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Text>Status:</Text>
            <Tag color={isEnabled ? 'green' : 'default'}>
              {isEnabled ? 'Enabled' : 'Disabled'}
            </Tag>
          </div>
          
          <div className="flex items-center justify-between">
            <Text>Intensity:</Text>
            <Tag color="blue">{preferences.intensity}</Tag>
          </div>
          
          <div className="flex items-center justify-between">
            <Text>Device Support:</Text>
            <Tag color="green">Supported</Tag>
          </div>
        </div>
      </Card>

      {/* Button Patterns Demo */}
      <Card title="Button Haptic Patterns">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <HapticButton 
            hapticPattern="light" 
            size="large" 
            block
          >
            Light Tap
          </HapticButton>
          
          <HapticButton 
            hapticPattern="medium" 
            size="large" 
            type="primary"
            block
          >
            Medium Press
          </HapticButton>
          
          <HapticButton 
            hapticPattern="heavy" 
            size="large" 
            type="primary"
            block
          >
            Heavy Press
          </HapticButton>
          
          <HapticButton 
            hapticPattern="success" 
            size="large" 
            type="primary"
            className="bg-green-500 border-green-500 hover:bg-green-600"
            block
          >
            Success
          </HapticButton>
          
          <HapticButton 
            hapticPattern="error" 
            size="large" 
            danger
            block
          >
            Error
          </HapticButton>
          
          <HapticButton 
            hapticPattern="warning" 
            size="large" 
            className="bg-yellow-500 border-yellow-500 hover:bg-yellow-600 text-white"
            block
          >
            Warning
          </HapticButton>
          
          <HapticButton 
            customHapticSequence={['light', 'medium']}
            size="large" 
            type="dashed"
            block
          >
            Sequence
          </HapticButton>
          
          <HapticButton 
            hapticPattern="none" 
            size="large" 
            block
          >
            No Haptic
          </HapticButton>
        </div>
      </Card>

      {/* Swipe Gestures Demo */}
      <Card title="Swipe Gestures Demo">
        <div className="space-y-4">
          <Text type="secondary">
            Try swiping or dragging on the area below to test swipe haptics:
          </Text>
          
          <div 
            className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-8 border-2 border-dashed border-blue-300 text-center select-none cursor-grab active:cursor-grabbing transition-colors"
            {...swipeHaptics}
            onTouchEnd={() => handleSwipeComplete()}
            onMouseUp={() => handleSwipeComplete()}
          >
            <div className="space-y-2">
              <MobileOutlined className="text-3xl text-blue-500" />
              <div>
                <Text strong>Swipe Test Area</Text>
                <br />
                <Text type="secondary" className="text-sm">
                  Touch and drag to test swipe haptics
                </Text>
              </div>
              <div className="mt-4">
                <Text>Successful swipes: <strong>{swipeCount}</strong></Text>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 justify-center">
            <HapticButton 
              size="small" 
              onClick={handleSwipeComplete}
              hapticPattern="success"
            >
              Trigger Success
            </HapticButton>
            <HapticButton 
              size="small" 
              onClick={handleSwipeCancel}
              hapticPattern="error"
            >
              Trigger Cancel
            </HapticButton>
          </div>
        </div>
      </Card>

      {/* Usage Info */}
      <Card title="Implementation Guide">
        <div className="space-y-3 text-sm">
          <div>
            <Text strong>Basic Usage:</Text>
            <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
{`import { HapticButton, useHaptics } from '@/components';

// Use HapticButton for automatic haptic feedback
<HapticButton hapticPattern="success">
  Submit
</HapticButton>

// Or use useHaptics hook for custom control
const { successFeedback, tapFeedback } = useHaptics();`}
            </pre>
          </div>
          
          <div>
            <Text strong>Available Patterns:</Text>
            <div className="mt-1 flex flex-wrap gap-1">
              {['light', 'medium', 'heavy', 'success', 'error', 'warning'].map(pattern => (
                <Tag key={pattern} className="text-xs">{pattern}</Tag>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};