import React, { useState } from 'react';
import { Card, Typography, Button, Space, Switch, List, Avatar, message } from 'antd';
import { ReloadOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PullToRefreshIndicator, InlinePullIndicator } from '../ui/PullToRefreshIndicator';
import { useResponsiveKanban } from '../../hooks/useResponsiveKanban';

const { Title, Paragraph, Text } = Typography;

// Mock data for demonstration
const generateMockTasks = () => [
  { id: 1, title: 'Design überarbeiten', status: 'IN_PROGRESS', user: 'Anna Schmidt' },
  { id: 2, title: 'API-Endpunkt testen', status: 'TODO', user: 'Max Müller' },
  { id: 3, title: 'Code Review', status: 'REVIEW', user: 'Lisa Weber' },
  { id: 4, title: 'Bug #123 beheben', status: 'TODO', user: 'Tom Fischer' },
  { id: 5, title: 'Dokumentation aktualisieren', status: 'DONE', user: 'Sarah Klein' },
];

export const PullToRefreshDemo: React.FC = () => {
  const { isMobile, toggleMode } = useResponsiveKanban();
  const [tasks, setTasks] = useState(generateMockTasks());
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Pull-to-refresh hook
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update tasks with new data
      const newTasks = generateMockTasks().map(task => ({
        ...task,
        id: Math.random(),
        title: `${task.title} (aktualisiert)`,
      }));
      
      setTasks(newTasks);
      setLastRefresh(new Date());
      message.success('Liste erfolgreich aktualisiert! 🎉');
    },
    threshold: 80,
    disabled: !isMobile,
  });

  const getStatusColor = (status: string) => {
    const colors = {
      TODO: '#f59e0b',
      IN_PROGRESS: '#3b82f6', 
      REVIEW: '#8b5cf6',
      DONE: '#10b981',
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  };

  const getStatusText = (status: string) => {
    const texts = {
      TODO: 'Zu erledigen',
      IN_PROGRESS: 'In Bearbeitung',
      REVIEW: 'Review',
      DONE: 'Erledigt',
    };
    return texts[status as keyof typeof texts] || status;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Title level={2}>📱 Pull-to-Refresh Demo</Title>
      
      {/* Settings */}
      <Card title="⚙️ Einstellungen" className="mb-6">
        <Space direction="vertical">
          <Space>
            <Switch 
              checked={isMobile} 
              onChange={toggleMode}
              checkedChildren="Mobile"
              unCheckedChildren="Desktop"
            />
            <span>Modus: {isMobile ? 'Mobile (Pull-to-Refresh aktiv)' : 'Desktop (Deaktiviert)'}</span>
          </Space>
          
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={pullToRefresh.refresh}
              loading={pullToRefresh.isRefreshing}
            >
              Manuell aktualisieren
            </Button>
            {lastRefresh && (
              <Text type="secondary">
                Letzte Aktualisierung: {lastRefresh.toLocaleTimeString()}
              </Text>
            )}
          </Space>
        </Space>
      </Card>

      {/* Instructions */}
      {isMobile && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <Paragraph className="mb-0">
            <strong>📱 Mobile Anleitung:</strong> Ziehen Sie die Liste nach unten, 
            um sie zu aktualisieren. Bei Erreichen der Schwelle (80px) wird die 
            Aktualisierung ausgelöst.
          </Paragraph>
        </Card>
      )}

      {/* Demo Content */}
      <div className="relative">
        {/* Pull-to-Refresh Indicator */}
        {isMobile && (
          <PullToRefreshIndicator
            pullDistance={pullToRefresh.pullDistance}
            pullProgress={pullToRefresh.pullProgress}
            isPulling={pullToRefresh.isPulling}
            isRefreshing={pullToRefresh.isRefreshing}
            isThresholdReached={pullToRefresh.isThresholdReached}
            threshold={pullToRefresh.threshold}
          />
        )}

        {/* Scrollable Content */}
        <div
          ref={pullToRefresh.containerRef}
          {...(isMobile ? pullToRefresh.bind() : {})}
          className="bg-white rounded-lg border overflow-auto"
          style={{
            height: '500px',
            touchAction: isMobile ? 'pan-y' : 'auto',
            overscrollBehaviorY: isMobile ? 'none' : 'auto',
          }}
        >
          {/* Inline Pull Indicator */}
          <InlinePullIndicator
            pullProgress={pullToRefresh.pullProgress}
            isRefreshing={pullToRefresh.isRefreshing}
            isThresholdReached={pullToRefresh.isThresholdReached}
          />

          {/* Task List */}
          <List
            header={
              <div className="px-4 py-2 bg-gray-50">
                <Title level={4} className="mb-0">📋 Aktuelle Aufgaben</Title>
              </div>
            }
            dataSource={tasks}
            renderItem={(task) => (
              <List.Item className="px-4">
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={
                    <Space>
                      <span>{task.title}</span>
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getStatusColor(task.status) }}
                      />
                    </Space>
                  }
                  description={
                    <Space>
                      <Text type="secondary">{task.user}</Text>
                      <Text
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: getStatusColor(task.status) + '20',
                          color: getStatusColor(task.status),
                        }}
                      >
                        {getStatusText(task.status)}
                      </Text>
                    </Space>
                  }
                />
                {task.status === 'DONE' && (
                  <CheckCircleOutlined className="text-green-500" />
                )}
              </List.Item>
            )}
          />

          {/* Additional Content for Scrolling */}
          <div className="p-4 border-t bg-gray-50">
            <Title level={5}>📊 Demo-Statistiken</Title>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Card key={i} size="small">
                  <Text strong>Statistik {i + 1}</Text>
                  <br />
                  <Text type="secondary">Wert: {Math.floor(Math.random() * 100)}</Text>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Debug Info */}
        {isMobile && (
          <Card className="mt-4" size="small">
            <Title level={5}>🔧 Debug-Informationen</Title>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Pull Distance: {Math.round(pullToRefresh.pullDistance)}px</div>
              <div>Progress: {Math.round(pullToRefresh.pullProgress * 100)}%</div>
              <div>Is Pulling: {pullToRefresh.isPulling ? '✅' : '❌'}</div>
              <div>Is Refreshing: {pullToRefresh.isRefreshing ? '🔄' : '❌'}</div>
              <div>Threshold Reached: {pullToRefresh.isThresholdReached ? '🎯' : '❌'}</div>
              <div>Threshold: {pullToRefresh.threshold}px</div>
            </div>
          </Card>
        )}
      </div>

      {/* Features */}
      <Card title="✨ Pull-to-Refresh Features" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Title level={5}>🎨 Visual Feedback</Title>
            <ul className="list-disc pl-5 space-y-1">
              <li>Smooth animations mit react-spring</li>
              <li>Progress circle während des Ziehens</li>
              <li>Threshold-basierte Status-Änderungen</li>
              <li>Loading-Spinner während Refresh</li>
            </ul>
          </div>
          
          <div>
            <Title level={5}>🎯 Touch Gestures</Title>
            <ul className="list-disc pl-5 space-y-1">
              <li>Rubber-band Effect für natürliches Gefühl</li>
              <li>80px Threshold für Trigger</li>
              <li>Haptic Feedback bei Threshold</li>
              <li>Automatische Scroll-Detection</li>
            </ul>
          </div>
          
          <div>
            <Title level={5}>📱 Mobile Optimiert</Title>
            <ul className="list-disc pl-5 space-y-1">
              <li>Touch-Action und Overscroll-Behavior</li>
              <li>Nur bei Mobile-Modus aktiv</li>
              <li>Verhindert Browser-native PTR</li>
              <li>Optimierte Touch-Event-Behandlung</li>
            </ul>
          </div>
          
          <div>
            <Title level={5}>🔧 Integration</Title>
            <ul className="list-disc pl-5 space-y-1">
              <li>Einfache Hook-basierte API</li>
              <li>Wiederverwendbare Komponenten</li>
              <li>Konfigurierbare Thresholds</li>
              <li>Async refresh function support</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};