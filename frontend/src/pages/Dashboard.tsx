import React, { useState, useMemo } from 'react';
import {
  Typography,
  Button,
  Card,
  Progress,
  List,
  Tag,
  Skeleton,
  Empty,
  Alert,
  Space,
  Statistic,
  Row,
  Col,
} from 'antd';
import { 
  PlusOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  TeamOutlined,
  FolderOutlined,
  RightOutlined,
  FireOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useLists } from '../hooks';
import { useNavigate } from 'react-router-dom';
import { CreateListModal } from '../components';
import type { ListWithStats, TaskWithAssignee, TaskStatus } from '@simple-todo-app/shared';
import apiClient from '../services/api.service';
import { useQuery } from '@tanstack/react-query';

const { Title, Text } = Typography;

// Helper function to get status icon (consistent icons instead of colorful emojis)
const getStatusIcon = (status: TaskStatus) => {
  const icons = {
    BACKLOG: <div className="w-3 h-3 rounded-full bg-gray-400" />,
    TODO: <div className="w-3 h-3 rounded-full bg-gray-400" />,
    IN_PROGRESS: <div className="w-3 h-3 rounded-full bg-yellow-500" />,
    REVIEW: <div className="w-3 h-3 rounded-full bg-yellow-500" />,
    DONE: <CheckCircleOutlined className="text-green-500 text-sm" />
  };
  return icons[status] || icons.TODO;
};

// Helper function to get status text
const getStatusText = (status: TaskStatus) => {
  const texts = {
    BACKLOG: 'Backlog',
    TODO: 'Offen',
    IN_PROGRESS: 'In Bearbeitung',
    REVIEW: 'Überprüfung',
    DONE: 'Erledigt'
  };
  return texts[status] || status;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { data: lists, isLoading, error } = useLists();

  // Fetch recent tasks across all lists
  const { data: recentTasks } = useQuery({
    queryKey: ['recentTasks'],
    queryFn: async () => {
      if (!lists || lists.length === 0) return [];
      
      const allTasks: TaskWithAssignee[] = [];
      
      // Fetch tasks for each list
      for (const list of lists) {
        try {
          const response = await apiClient.get(`/tasks?listId=${list.id}`);
          const tasks = response.data?.data || response.data || [];
          allTasks.push(...tasks.map((task: TaskWithAssignee) => ({ 
            ...task, 
            listName: list.name 
          })));
        } catch (err) {
          console.error(`Failed to fetch tasks for list ${list.id}:`, err);
        }
      }
      
      // Sort by updatedAt and return top 10
      return allTasks
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10);
    },
    enabled: !!lists && lists.length > 0,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!lists) return { totalLists: 0, totalTasks: 0, completedTasks: 0, inProgressTasks: 0, sharedLists: 0 };
    
    const totalLists = lists.length;
    const totalTasks = lists.reduce((sum, list) => sum + list.taskCount, 0);
    const completedTasks = lists.reduce((sum, list) => sum + list.completedTaskCount, 0);
    const sharedLists = lists.filter(list => list.memberCount > 1).length;
    
    // Calculate in-progress tasks (this is an estimate since we don't have exact counts)
    const inProgressTasks = totalTasks - completedTasks;
    
    return { totalLists, totalTasks, completedTasks, inProgressTasks, sharedLists };
  }, [lists]);

  // Get lists with most activity (based on task count)
  const activeListsSorted = useMemo(() => {
    if (!lists) return [];
    return [...lists]
      .sort((a, b) => b.taskCount - a.taskCount)
      .slice(0, 5);
  }, [lists]);

  if (error) {
    return (
      <Alert
        message="Fehler beim Laden"
        description="Es gab ein Problem beim Laden der Daten. Bitte versuchen Sie es später erneut."
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <Title level={2} className="mb-2">👋 Willkommen zurück!</Title>
          <Text className="text-gray-600">Hier ist die Übersicht Ihrer Aufgaben und Listen</Text>
        </div>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]} className="mb-8">
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Listen"
                value={stats.totalLists}
                prefix={<FolderOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Aufgaben"
                value={stats.totalTasks}
                prefix={<FireOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Erledigt"
                value={stats.completedTasks}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
              <Progress 
                percent={stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0} 
                size="small" 
                showInfo={false}
                className="mt-2"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Geteilt"
                value={stats.sharedLists}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Main Content Grid - 70% links, 30% rechts */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Recent Tasks Column - 70% */}
          <div className="flex-1 lg:w-[70%]">
            <Card 
              title={
                <div className="border-b border-gray-200 pb-3 mb-4">
                  <Space>
                    <ClockCircleOutlined className="text-lg" style={{ color: '#1a202c' }} />
                    <span className="font-semibold text-lg" style={{ color: '#1a202c' }}>Aktuelle Aufgaben</span>
                  </Space>
                </div>
              }
              className="shadow-sm"
              styles={{ body: { padding: '0 24px 24px' } }}
            >
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 8 }} />
              ) : recentTasks && recentTasks.length > 0 ? (
                <div className="space-y-2">
                  {recentTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors max-h-[60px]"
                      onClick={() => navigate(`/lists/${task.listId}`)}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {getStatusIcon(task.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <Text className="font-medium truncate" style={{ color: '#1a202c' }}>
                              {task.title}
                            </Text>
                            {task.priority === 'high' && <StarOutlined className="text-red-500 text-xs" />}
                          </div>
                          <Text className="text-sm truncate" style={{ color: '#4a5568' }}>
                            {task.listName}
                            {task.assignee && ` • ${task.assignee.name}`}
                          </Text>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Text className="text-xs px-2 py-1 rounded" style={{ 
                          color: task.status === 'DONE' ? '#38a169' : '#718096',
                          backgroundColor: task.status === 'DONE' ? '#f0fff4' : '#edf2f7'
                        }}>
                          {getStatusText(task.status)}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty 
                  description="Keine aktuellen Aufgaben"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </div>

          {/* Active Lists Column - 30% */}
          <div className="w-full lg:w-[30%]">
            <Card
              title={
                <div className="border-b border-gray-200 pb-3 mb-4">
                  <Space>
                    <FolderOutlined className="text-lg" style={{ color: '#1a202c' }} />
                    <span className="font-semibold text-lg" style={{ color: '#1a202c' }}>Aktive Listen</span>
                  </Space>
                </div>
              }
              extra={
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => setCreateModalOpen(true)}
                  size="small"
                >
                  Neue Liste
                </Button>
              }
              className="shadow-sm"
              styles={{ body: { padding: '0 24px 24px' } }}
            >
              {isLoading ? (
                <Skeleton active paragraph={{ rows: 5 }} />
              ) : activeListsSorted.length > 0 ? (
                <div className="space-y-2">
                  {activeListsSorted.map((list) => (
                    <div
                      key={list.id}
                      className="relative p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors max-h-[100px]"
                      onClick={() => navigate(`/lists/${list.id}`)}
                    >
                      {/* Schmaler Farbstreifen am linken Rand */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" 
                        style={{ backgroundColor: list.color }}
                      />
                      
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <Text className="font-semibold block truncate" style={{ color: '#1a202c' }}>
                            {list.name}
                          </Text>
                          <Text className="text-sm block" style={{ color: '#718096' }}>
                            {list.taskCount} Aufgaben
                            {list.completedTaskCount > 0 && ` • ${list.completedTaskCount} erledigt`}
                          </Text>
                          {list.memberCount > 1 && (
                            <Text className="text-xs" style={{ color: '#a0aec0' }}>
                              {list.memberCount} Mitglieder
                            </Text>
                          )}
                        </div>
                        <Button 
                          type="link" 
                          size="small"
                          className="text-blue-600 hover:text-blue-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/lists/${list.id}`);
                          }}
                        >
                          Neue Aufgabe
                        </Button>
                      </div>
                      
                      {list.taskCount > 0 && (
                        <Progress 
                          percent={Math.round((list.completedTaskCount / list.taskCount) * 100)}
                          size="small"
                          showInfo={false}
                          className="mt-2"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  description="Noch keine Listen vorhanden"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateModalOpen(true)}
                  >
                    Erste Liste erstellen
                  </Button>
                </Empty>
              )}
            </Card>
          </div>
        </div>

        <CreateListModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default Dashboard;