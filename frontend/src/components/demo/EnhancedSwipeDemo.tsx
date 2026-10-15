import React, { useState } from 'react';
import { Card, Space, Typography, Tag, Button, List, Badge } from 'antd';
import { 
  SwapOutlined, 
  DeleteOutlined, 
  CheckOutlined, 
  EditOutlined,
  InboxOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { SwipeGestureEnhancer, SwipeAction } from '../gestures';

const { Title, Text, Paragraph } = Typography;

interface DemoItem {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'deleted' | 'archived';
  priority: 'low' | 'medium' | 'high';
}

export const EnhancedSwipeDemo: React.FC = () => {
  const [items, setItems] = useState<DemoItem[]>([
    {
      id: '1',
      title: 'Design new user interface',
      description: 'Create mockups and prototypes for the new dashboard',
      status: 'active',
      priority: 'high'
    },
    {
      id: '2',
      title: 'Implement haptic feedback',
      description: 'Add vibration feedback for touch interactions',
      status: 'completed',
      priority: 'medium'
    },
    {
      id: '3',
      title: 'Write documentation',
      description: 'Document the new swipe gesture system',
      status: 'active',
      priority: 'low'
    },
    {
      id: '4',
      title: 'Code review meeting',
      description: 'Review pull requests with the team',
      status: 'active',
      priority: 'medium'
    },
    {
      id: '5',
      title: 'Fix performance issues',
      description: 'Optimize rendering performance on mobile devices',
      status: 'active',
      priority: 'high'
    }
  ]);

  const [stats, setStats] = useState({
    swipeActions: 0,
    deletions: 0,
    completions: 0,
    edits: 0,
    archives: 0
  });

  const updateItem = (id: string, updates: Partial<DemoItem>) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const resetDemo = () => {
    setItems([
      {
        id: '1',
        title: 'Design new user interface',
        description: 'Create mockups and prototypes for the new dashboard',
        status: 'active',
        priority: 'high'
      },
      {
        id: '2',
        title: 'Implement haptic feedback',
        description: 'Add vibration feedback for touch interactions',
        status: 'completed',
        priority: 'medium'
      },
      {
        id: '3',
        title: 'Write documentation',
        description: 'Document the new swipe gesture system',
        status: 'active',
        priority: 'low'
      },
      {
        id: '4',
        title: 'Code review meeting',
        description: 'Review pull requests with the team',
        status: 'active',
        priority: 'medium'
      },
      {
        id: '5',
        title: 'Fix performance issues',
        description: 'Optimize rendering performance on mobile devices',
        status: 'active',
        priority: 'high'
      }
    ]);
    setStats({
      swipeActions: 0,
      deletions: 0,
      completions: 0,
      edits: 0,
      archives: 0
    });
  };

  const createSwipeActions = (item: DemoItem): { left: SwipeAction; right: SwipeAction } => {
    return {
      left: {
        type: item.status === 'active' ? 'confirm' : 'edit',
        label: item.status === 'active' ? 'Complete' : 'Edit',
        icon: item.status === 'active' ? <CheckOutlined /> : <EditOutlined />,
        color: item.status === 'active' ? 'rgb(34 197 94)' : 'rgb(59 130 246)',
        onAction: () => {
          if (item.status === 'active') {
            updateItem(item.id, { status: 'completed' });
            setStats(prev => ({ ...prev, completions: prev.completions + 1, swipeActions: prev.swipeActions + 1 }));
          } else {
            setStats(prev => ({ ...prev, edits: prev.edits + 1, swipeActions: prev.swipeActions + 1 }));
          }
        }
      },
      right: item.priority === 'low' ? {
        type: 'archive',
        label: 'Archive',
        icon: <InboxOutlined />,
        color: 'rgb(107 114 128)',
        onAction: () => {
          updateItem(item.id, { status: 'archived' });
          setStats(prev => ({ ...prev, archives: prev.archives + 1, swipeActions: prev.swipeActions + 1 }));
        }
      } : {
        type: 'delete',
        label: 'Delete',
        icon: <DeleteOutlined />,
        color: 'rgb(239 68 68)',
        onAction: () => {
          removeItem(item.id);
          setStats(prev => ({ ...prev, deletions: prev.deletions + 1, swipeActions: prev.swipeActions + 1 }));
        }
      }
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'archived': return 'gray';
      case 'deleted': return 'red';
      default: return 'blue';
    }
  };

  const visibleItems = items.filter(item => item.status !== 'deleted');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card
        title={
          <Space>
            <SwapOutlined />
            <span>Enhanced Swipe Gestures Demo</span>
          </Space>
        }
      >
        <div className="space-y-4">
          <Paragraph>
            This demo showcases the enhanced swipe gesture system with visual feedback, haptic feedback, 
            and smooth animations. Try swiping left or right on the items below to see the effects.
          </Paragraph>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{stats.swipeActions}</div>
              <div className="text-sm text-gray-500">Total Actions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{stats.completions}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{stats.deletions}</div>
              <div className="text-sm text-gray-500">Deleted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{stats.edits}</div>
              <div className="text-sm text-gray-500">Edited</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500">{stats.archives}</div>
              <div className="text-sm text-gray-500">Archived</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Instructions */}
      <Card title="How to Use">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Title level={5} className="!mb-2">
              <CheckOutlined className="text-green-500 mr-2" />
              Swipe Left Actions
            </Title>
            <ul className="text-sm space-y-1">
              <li>• <strong>Active items:</strong> Mark as complete</li>
              <li>• <strong>Completed items:</strong> Edit or modify</li>
              <li>• Swipe distance determines intensity</li>
            </ul>
          </div>
          
          <div>
            <Title level={5} className="!mb-2">
              <DeleteOutlined className="text-red-500 mr-2" />
              Swipe Right Actions
            </Title>
            <ul className="text-sm space-y-1">
              <li>• <strong>High/Medium priority:</strong> Delete item</li>
              <li>• <strong>Low priority:</strong> Archive item</li>
              <li>• Red border indicates delete threshold</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Demo Items */}
      <Card title="Interactive Demo Items">
        <div className="space-y-3">
          {visibleItems.length === 0 ? (
            <div className="text-center py-12">
              <TrophyOutlined className="text-6xl text-yellow-500 mb-4" />
              <Title level={3}>Great job! 🎉</Title>
              <Paragraph>You've swiped through all the demo items!</Paragraph>
              <Button onClick={resetDemo} type="primary" size="large">
                Reset Demo
              </Button>
            </div>
          ) : (
            visibleItems.map((item) => {
              const actions = createSwipeActions(item);
              
              return (
                <SwipeGestureEnhancer
                  key={item.id}
                  leftAction={actions.left}
                  rightAction={actions.right}
                  animationIntensity="enhanced"
                  swipeConfig={{
                    enableHaptics: true,
                    enableRubberBand: true,
                    thresholds: {
                      confirm: 60,
                      delete: 120,
                      hapticStart: 10,
                      hapticProgress: 30
                    }
                  }}
                  onSwipeStart={() => {
                    console.log(`Started swiping item: ${item.title}`);
                  }}
                  onSwipeComplete={(action, direction) => {
                    console.log(`Completed ${direction} swipe on "${item.title}": ${action.label}`);
                  }}
                >
                  <Card 
                    className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    size="small"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Text strong className="text-base">{item.title}</Text>
                          <Tag color={getStatusColor(item.status)} size="small">
                            {item.status}
                          </Tag>
                          <Tag color={getPriorityColor(item.priority)} size="small">
                            {item.priority}
                          </Tag>
                        </div>
                        <Text type="secondary" className="text-sm">
                          {item.description}
                        </Text>
                      </div>
                      
                      <div className="flex flex-col items-end text-xs text-gray-400 ml-4">
                        <span>← {actions.left.label}</span>
                        <span>{actions.right.label} →</span>
                      </div>
                    </div>
                  </Card>
                </SwipeGestureEnhancer>
              );
            })
          )}
        </div>
        
        {visibleItems.length > 0 && (
          <div className="mt-6 text-center">
            <Button onClick={resetDemo} type="dashed">
              Reset Demo Items
            </Button>
          </div>
        )}
      </Card>

      {/* Features */}
      <Card title="Enhanced Features">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <ThunderboltOutlined className="text-3xl text-yellow-500 mb-3" />
            <Title level={5}>Haptic Feedback</Title>
            <Text type="secondary" className="text-sm">
              Feel vibrations at start, progress, and action thresholds
            </Text>
          </div>
          
          <div className="text-center">
            <EyeOutlined className="text-3xl text-blue-500 mb-3" />
            <Title level={5}>Visual Progress</Title>
            <Text type="secondary" className="text-sm">
              Color transitions and progress indicators show swipe status
            </Text>
          </div>
          
          <div className="text-center">
            <SwapOutlined className="text-3xl text-purple-500 mb-3" />
            <Title level={5}>Rubber Band Physics</Title>
            <Text type="secondary" className="text-sm">
              Smooth overscroll effects with momentum-based returns
            </Text>
          </div>
        </div>
      </Card>

      {/* Technical Details */}
      <Card title="Technical Implementation">
        <div className="space-y-3 text-sm">
          <div>
            <Text strong>Performance Optimizations:</Text>
            <ul className="mt-1 ml-4 space-y-1">
              <li>• GPU-accelerated transforms (translateX, scale, rotateZ)</li>
              <li>• RequestAnimationFrame for smooth momentum animations</li>
              <li>• Proper cleanup to prevent memory leaks</li>
              <li>• Debounced haptic feedback to avoid over-triggering</li>
            </ul>
          </div>
          
          <div>
            <Text strong>Accessibility Features:</Text>
            <ul className="mt-1 ml-4 space-y-1">
              <li>• Reduced motion preference support</li>
              <li>• Configurable animation intensity</li>
              <li>• Graceful degradation on unsupported devices</li>
              <li>• Clear visual indicators for thresholds</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};