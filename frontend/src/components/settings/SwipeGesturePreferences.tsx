import React, { useState, useEffect } from 'react';
import { Card, Switch, Select, Slider, Button, Space, Typography, Divider, Alert } from 'antd';
import { 
  SwapOutlined, 
  SettingOutlined, 
  ExperimentFilled,
  ThunderboltOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { SwipeGestureEnhancer, SwipeAction } from '../gestures';

const { Title, Text, Paragraph } = Typography;

export interface SwipePreferences {
  enabled: boolean;
  hapticFeedback: boolean;
  visualFeedback: boolean;
  rubberBandEffect: boolean;
  animationIntensity: 'subtle' | 'normal' | 'enhanced';
  confirmThreshold: number;
  deleteThreshold: number;
  returnAnimationDuration: number;
  momentumDecay: number;
}

export const SwipeGesturePreferences: React.FC = () => {
  const [preferences, setPreferences] = useState<SwipePreferences>(() => {
    try {
      const stored = localStorage.getItem('swipe-gesture-preferences');
      return stored ? { ...getDefaultPreferences(), ...JSON.parse(stored) } : getDefaultPreferences();
    } catch {
      return getDefaultPreferences();
    }
  });

  const [testCount, setTestCount] = useState(0);

  function getDefaultPreferences(): SwipePreferences {
    return {
      enabled: true,
      hapticFeedback: true,
      visualFeedback: true,
      rubberBandEffect: true,
      animationIntensity: 'normal',
      confirmThreshold: 60,
      deleteThreshold: 120,
      returnAnimationDuration: 300,
      momentumDecay: 0.95
    };
  }

  useEffect(() => {
    try {
      localStorage.setItem('swipe-gesture-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('[SwipePreferences] Failed to save preferences:', error);
    }
  }, [preferences]);

  const updatePreference = <K extends keyof SwipePreferences>(
    key: K, 
    value: SwipePreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setPreferences(getDefaultPreferences());
  };

  const testActions: SwipeAction[] = [
    {
      type: 'delete',
      label: 'Delete Test',
      onAction: () => {
        setTestCount(prev => prev + 1);
        console.log('Delete action triggered!');
      }
    },
    {
      type: 'confirm',
      label: 'Complete Test',
      onAction: () => {
        setTestCount(prev => prev + 1);
        console.log('Complete action triggered!');
      }
    }
  ];

  return (
    <Card
      title={
        <Space>
          <SwapOutlined />
          <span>Swipe Gesture Settings</span>
        </Space>
      }
      className="w-full"
    >
      <div className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div>
            <Text strong>Enable Swipe Gestures</Text>
            <br />
            <Text type="secondary" className="text-sm">
              Allow swipe actions on lists and cards
            </Text>
          </div>
          <Switch
            checked={preferences.enabled}
            onChange={(enabled) => updatePreference('enabled', enabled)}
          />
        </div>

        <Divider />

        {/* Feedback Options */}
        <div className="space-y-4">
          <Title level={5} className="!mb-2">
            <ThunderboltOutlined className="mr-2" />
            Feedback Options
          </Title>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Text>Haptic Feedback</Text>
                <br />
                <Text type="secondary" className="text-xs">
                  Vibration during swipes
                </Text>
              </div>
              <Switch
                checked={preferences.hapticFeedback}
                onChange={(hapticFeedback) => updatePreference('hapticFeedback', hapticFeedback)}
                disabled={!preferences.enabled}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Text>Visual Feedback</Text>
                <br />
                <Text type="secondary" className="text-xs">
                  Colors and animations
                </Text>
              </div>
              <Switch
                checked={preferences.visualFeedback}
                onChange={(visualFeedback) => updatePreference('visualFeedback', visualFeedback)}
                disabled={!preferences.enabled}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Text>Rubber Band Effect</Text>
                <br />
                <Text type="secondary" className="text-xs">
                  Bounce at limits
                </Text>
              </div>
              <Switch
                checked={preferences.rubberBandEffect}
                onChange={(rubberBandEffect) => updatePreference('rubberBandEffect', rubberBandEffect)}
                disabled={!preferences.enabled}
              />
            </div>
          </div>
        </div>

        <Divider />

        {/* Animation Intensity */}
        <div className="space-y-3">
          <div>
            <Text strong>
              <EyeOutlined className="mr-2" />
              Animation Intensity
            </Text>
            <br />
            <Text type="secondary" className="text-sm">
              How dramatic the visual effects should be
            </Text>
          </div>
          
          <Select
            value={preferences.animationIntensity}
            onChange={(animationIntensity) => updatePreference('animationIntensity', animationIntensity)}
            disabled={!preferences.enabled || !preferences.visualFeedback}
            className="w-full"
            options={[
              {
                value: 'subtle',
                label: 'Subtle - Minimal visual effects for sensitive users'
              },
              {
                value: 'normal',
                label: 'Normal - Balanced visual feedback'
              },
              {
                value: 'enhanced',
                label: 'Enhanced - Rich visual effects and animations'
              }
            ]}
          />
        </div>

        <Divider />

        {/* Threshold Settings */}
        <div className="space-y-4">
          <Title level={5} className="!mb-2">
            <SettingOutlined className="mr-2" />
            Sensitivity Settings
          </Title>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Text>Confirm Threshold</Text>
                <Text type="secondary">{preferences.confirmThreshold}px</Text>
              </div>
              <Slider
                min={30}
                max={120}
                value={preferences.confirmThreshold}
                onChange={(confirmThreshold) => updatePreference('confirmThreshold', confirmThreshold)}
                disabled={!preferences.enabled}
                marks={{
                  30: 'Easy',
                  60: 'Normal',
                  120: 'Hard'
                }}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Text>Delete Threshold</Text>
                <Text type="secondary">{preferences.deleteThreshold}px</Text>
              </div>
              <Slider
                min={80}
                max={200}
                value={preferences.deleteThreshold}
                onChange={(deleteThreshold) => updatePreference('deleteThreshold', deleteThreshold)}
                disabled={!preferences.enabled}
                marks={{
                  80: 'Easy',
                  120: 'Normal',
                  200: 'Hard'
                }}
              />
            </div>
          </div>
        </div>

        <Divider />

        {/* Advanced Settings */}
        <div className="space-y-4">
          <Title level={5} className="!mb-2">
            <ExperimentFilled className="mr-2" />
            Advanced Settings
          </Title>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Text>Return Animation (ms)</Text>
                <Text type="secondary">{preferences.returnAnimationDuration}</Text>
              </div>
              <Slider
                min={100}
                max={800}
                step={50}
                value={preferences.returnAnimationDuration}
                onChange={(returnAnimationDuration) => updatePreference('returnAnimationDuration', returnAnimationDuration)}
                disabled={!preferences.enabled}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Text>Momentum Decay</Text>
                <Text type="secondary">{preferences.momentumDecay.toFixed(2)}</Text>
              </div>
              <Slider
                min={0.8}
                max={0.99}
                step={0.01}
                value={preferences.momentumDecay}
                onChange={(momentumDecay) => updatePreference('momentumDecay', momentumDecay)}
                disabled={!preferences.enabled}
              />
            </div>
          </div>
        </div>

        <Divider />

        {/* Test Area */}
        <div className="space-y-4">
          <Title level={5} className="!mb-2">Test Swipe Gestures</Title>
          <Paragraph type="secondary" className="!mb-4">
            Try swiping left or right on the test card below to test your settings.
          </Paragraph>
          
          <SwipeGestureEnhancer
            rightAction={testActions[0]}
            leftAction={testActions[1]}
            disabled={!preferences.enabled}
            animationIntensity={preferences.animationIntensity}
            reducedMotion={preferences.animationIntensity === 'subtle'}
            swipeConfig={{
              enableHaptics: preferences.hapticFeedback,
              enableRubberBand: preferences.rubberBandEffect,
              returnAnimationDuration: preferences.returnAnimationDuration,
              momentumDecay: preferences.momentumDecay,
              thresholds: {
                confirm: preferences.confirmThreshold,
                delete: preferences.deleteThreshold
              }
            }}
            onSwipeComplete={(action, direction) => {
              console.log(`Swipe ${direction} completed:`, action.label);
            }}
          >
            <Card className="cursor-grab active:cursor-grabbing bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-dashed border-blue-200">
              <div className="text-center py-8">
                <SwapOutlined className="text-4xl text-blue-500 mb-4" />
                <Title level={4} className="!mb-2">Swipe Test Card</Title>
                <Text type="secondary">
                  ← Swipe left to complete • Swipe right to delete →
                </Text>
                <div className="mt-4">
                  <Text>Actions triggered: <strong>{testCount}</strong></Text>
                </div>
              </div>
            </Card>
          </SwipeGestureEnhancer>
        </div>

        {/* Reset Button */}
        <div className="flex justify-center pt-4">
          <Button onClick={resetToDefaults} type="dashed">
            Reset to Defaults
          </Button>
        </div>

        {/* Info */}
        <Alert
          type="info"
          message="Swipe Gesture Tips"
          description="Swipe gestures work best on touch devices. On desktop, you can test by clicking and dragging. Adjust the thresholds based on your device size and personal preference."
          showIcon
          className="mt-4"
        />
      </div>
    </Card>
  );
};