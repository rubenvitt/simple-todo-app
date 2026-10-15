import React from 'react';
import { Button, Space, Card, Typography, Switch } from 'antd';
import { PlusOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons';
import { BottomSheet, useBottomSheet, TaskBottomSheet, useTaskBottomSheet, ListBottomSheet } from '../ui';
import { useResponsiveKanban } from '../../hooks/useResponsiveKanban';

const { Title, Paragraph } = Typography;

export const BottomSheetDemo: React.FC = () => {
  const { isMobile, toggleMode } = useResponsiveKanban();
  
  // Basic bottom sheet
  const basicSheet = useBottomSheet();
  const halfSheet = useBottomSheet();
  const fullSheet = useBottomSheet();
  
  // Task bottom sheet
  const taskSheet = useTaskBottomSheet();
  
  // List bottom sheet
  const [showListSheet, setShowListSheet] = React.useState(false);

  const handleTaskSubmit = async (data: any) => {
    console.log('Task data:', data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleListSubmit = async (data: any) => {
    console.log('List data:', data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Title level={2}>📱 Bottom Sheet System Demo</Title>
      
      <div className="mb-6">
        <Card title="⚙️ Einstellungen">
          <Space>
            <Switch 
              checked={isMobile} 
              onChange={toggleMode}
              checkedChildren="Mobile"
              unCheckedChildren="Desktop"
            />
            <span>Aktueller Modus: {isMobile ? 'Mobile' : 'Desktop'}</span>
          </Space>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Bottom Sheets */}
        <Card title="📋 Basic Bottom Sheets">
          <Space direction="vertical" className="w-full">
            <Button 
              type="primary" 
              icon={<SettingOutlined />}
              onClick={basicSheet.open}
              block
            >
              Auto Height Sheet
            </Button>
            
            <Button 
              type="default"
              onClick={halfSheet.open}
              block
            >
              Half Screen Sheet
            </Button>
            
            <Button 
              type="default"
              onClick={fullSheet.open}
              block
            >
              Full Screen Sheet
            </Button>
          </Space>
        </Card>

        {/* Specialized Bottom Sheets */}
        <Card title="🎯 Specialized Sheets">
          <Space direction="vertical" className="w-full">
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={taskSheet.openCreateTask}
              block
            >
              Create Task Sheet
            </Button>
            
            <Button 
              type="default"
              icon={<EditOutlined />}
              onClick={() => taskSheet.openEditTask({
                id: 'demo-task',
                title: 'Demo Task',
                description: 'This is a demo task for testing',
                priority: 'HIGH',
                status: 'TODO',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              } as any)}
              block
            >
              Edit Task Sheet
            </Button>
            
            <Button 
              type="default"
              onClick={() => setShowListSheet(true)}
              block
            >
              Create List Sheet
            </Button>
          </Space>
        </Card>
      </div>

      {/* Features Overview */}
      <Card title="✨ Features" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Title level={4}>🎨 Animations</Title>
            <ul className="list-disc pl-5 space-y-1">
              <li>Smooth slide-up/down with react-spring</li>
              <li>Backdrop blur with fade transition</li>
              <li>Drag gesture with rubber-band effect</li>
              <li>Auto-snap back animations</li>
            </ul>
          </div>
          
          <div>
            <Title level={4}>🎯 Interactions</Title>
            <ul className="list-disc pl-5 space-y-1">
              <li>Drag-to-dismiss (swipe down)</li>
              <li>Backdrop click to close</li>
              <li>Escape key support</li>
              <li>Touch-optimized gestures</li>
            </ul>
          </div>
          
          <div>
            <Title level={4}>📱 Mobile Features</Title>
            <ul className="list-disc pl-5 space-y-1">
              <li>Safe area handling for iOS</li>
              <li>Body scroll prevention</li>
              <li>Multiple size options</li>
              <li>Portal-based rendering</li>
            </ul>
          </div>
          
          <div>
            <Title level={4}>🔧 Developer Experience</Title>
            <ul className="list-disc pl-5 space-y-1">
              <li>TypeScript support</li>
              <li>React Hook Form integration</li>
              <li>Zod validation</li>
              <li>Customizable styling</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Basic Bottom Sheets */}
      <BottomSheet
        open={basicSheet.isOpen}
        onClose={basicSheet.close}
        title="⚙️ Einstellungen"
        size="auto"
      >
        <div className="space-y-4">
          <Paragraph>
            Dies ist ein auto-height Bottom Sheet. Die Höhe passt sich automatisch 
            dem Inhalt an, aber nie mehr als 80% der Bildschirmhöhe.
          </Paragraph>
          <Button type="primary" onClick={basicSheet.close} block>
            Verstanden
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={halfSheet.isOpen}
        onClose={halfSheet.close}
        title="📱 Half Screen"
        size="half"
      >
        <div className="space-y-4">
          <Paragraph>
            Dies ist ein half-screen Bottom Sheet (50% der Bildschirmhöhe).
            Perfekt für mittlere Inhalte.
          </Paragraph>
          <div className="space-y-2">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded">
                Item {i + 1}
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={fullSheet.isOpen}
        onClose={fullSheet.close}
        title="📋 Full Screen"
        size="full"
      >
        <div className="space-y-4">
          <Paragraph>
            Dies ist ein full-screen Bottom Sheet (90% der Bildschirmhöhe).
            Ideal für komplexe Formulare oder umfangreiche Inhalte.
          </Paragraph>
          <div className="space-y-2">
            {Array.from({ length: 30 }, (_, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded">
                <strong>Item {i + 1}</strong>
                <p className="text-sm text-gray-600 mt-1">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* Task Bottom Sheet */}
      <TaskBottomSheet
        open={taskSheet.isOpen}
        onClose={taskSheet.close}
        onSubmit={handleTaskSubmit}
        editingTask={taskSheet.editingTask}
        listId="demo-list"
      />

      {/* List Bottom Sheet */}
      <ListBottomSheet
        open={showListSheet}
        onClose={() => setShowListSheet(false)}
        onSubmit={handleListSubmit}
      />
    </div>
  );
};