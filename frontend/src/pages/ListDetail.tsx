import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Typography, 
  Button, 
  Space, 
  Input, 
  Select, 
  Alert, 
  Spin,
  message,
  Tag
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  ShareAltOutlined,
  EditOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { 
  useTasks, 
  useUpdateTaskStatus, 
  useUpdateTaskOrder,
  useList,
  useAuth,
  usePermissions,
  PermissionGuard,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListPullToRefresh
} from '../hooks';
import { ShareModalLazy, TaskModalLazy } from '../components/LazyComponents';
import { ResponsiveKanbanBoard } from '../components/kanban';
import { TaskBottomSheet, useTaskBottomSheet, PullToRefreshIndicator, FloatingActionButton, type FloatingAction } from '../components/ui';
import { QuickTaskCreator } from '../components/forms';
import { useResponsiveKanban } from '../hooks/useResponsiveKanban';
import { TaskStatus, TaskPriority, PermissionLevel } from '@simple-todo-app/shared';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const PERMISSION_LABELS = {
  [PermissionLevel.VIEWER]: 'Betrachter',
  [PermissionLevel.EDITOR]: 'Bearbeiter', 
  [PermissionLevel.OWNER]: 'Besitzer',
};

const PERMISSION_COLORS = {
  [PermissionLevel.VIEWER]: 'blue',
  [PermissionLevel.EDITOR]: 'green',
  [PermissionLevel.OWNER]: 'gold',
};

const ListDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'ALL'>('ALL');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  
  // Mobile/Desktop detection and bottom sheet
  const { isMobile } = useResponsiveKanban();
  const taskBottomSheet = useTaskBottomSheet();
  
  // Filter panel state for mobile
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Fetch auth and list data
  const { user } = useAuth();
  const { data: list, isLoading: listLoading, error: listError } = useList(id!);
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError, refetch } = useTasks(id!);
  const permissions = usePermissions({ listId: id! });

  const isLoading = listLoading || tasksLoading;
  const error = listError || tasksError;

  // Pull-to-refresh for mobile
  const pullToRefresh = useListPullToRefresh(
    async () => {
      await Promise.all([
        refetch(),
        // Add a small delay for better UX
        new Promise(resolve => setTimeout(resolve, 500)),
      ]);
    },
    {
      disabled: !isMobile || isLoading,
    }
  );
  
  // Mutations
  const updateTaskStatus = useUpdateTaskStatus();
  const updateTaskOrder = useUpdateTaskOrder();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // Debug: Check what tasks actually is
  console.log('Tasks data:', tasks, 'Type:', typeof tasks, 'Is Array:', Array.isArray(tasks));

  // Filter tasks based on search and filters
  const filteredTasks = Array.isArray(tasks) ? tasks.filter((task: any) => {
    const matchesSearch = !searchTerm || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  }) : [];

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTaskStatus.mutateAsync({ taskId, status: newStatus });
      message.success('Task status updated! ✅');
    } catch (error) {
      console.error('Error updating task status:', error);
      message.error('Failed to update task status 😞');
    }
  };

  const handleTaskReorder = async (
    taskId: string, 
    newOrder: number, 
    newStatus?: TaskStatus
  ) => {
    if (!permissions.canEdit) {
      message.warning('Sie haben keine Berechtigung, Aufgaben zu bearbeiten 🔒');
      return;
    }

    try {
      await updateTaskOrder.mutateAsync({
        taskId,
        order: newOrder,
        status: newStatus,
      });
      if (newStatus) {
        message.success('Task moved to new column! 🚀');
      }
    } catch (error) {
      console.error('Error reordering task:', error);
      message.error('Failed to reorder task 😞');
    }
  };

  const handleCreateTask = () => {
    if (!permissions.canEdit) {
      message.warning('Sie haben keine Berechtigung, Aufgaben zu erstellen 🔒');
      return;
    }
    
    if (isMobile) {
      taskBottomSheet.openCreateTask();
    } else {
      setEditingTask(null);
      setShowTaskModal(true);
    }
  };

  const handleEditTask = (taskId: string) => {
    if (!permissions.canEdit) {
      message.warning('Sie haben keine Berechtigung, Aufgaben zu bearbeiten 🔒');
      return;
    }
    const task = tasks.find((t: any) => t.id === taskId);
    if (task) {
      if (isMobile) {
        taskBottomSheet.openEditTask(task);
      } else {
        setEditingTask(task);
        setShowTaskModal(true);
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!permissions.canEdit) {
      message.warning('Sie haben keine Berechtigung, Aufgaben zu löschen 🔒');
      return;
    }
    try {
      await deleteTask.mutateAsync(taskId);
      message.success('Aufgabe erfolgreich gelöscht! 🗑️');
    } catch (error) {
      console.error('Error deleting task:', error);
      message.error('Fehler beim Löschen der Aufgabe 😞');
    }
  };

  const handleTaskSubmit = async (data: any) => {
    console.log('🚀 handleTaskSubmit called!');
    try {
      // Debug: Log the received data
      console.log('📥 TaskModal data received:', data);
      
      // Transform data to match backend expectations
      const transformedData = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate ? data.dueDate.toISOString() : undefined,
        assignedUserId: data.assigneeId, // Map assigneeId to assignedUserId
      };

      // Debug: Log the transformed data
      console.log('📤 Transformed data for API:', transformedData);
      console.log('📋 List ID:', id);
      console.log('🔑 Editing task?', !!editingTask);

      if (editingTask) {
        await updateTask.mutateAsync({
          taskId: editingTask.id,
          data: transformedData,
        });
        message.success('Aufgabe erfolgreich aktualisiert! ✅');
      } else {
        await createTask.mutateAsync({
          listId: id!,
          ...transformedData,
        });
        message.success('Aufgabe erfolgreich erstellt! 🎉');
      }
      setShowTaskModal(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Error submitting task:', error);
      console.error('Full error:', (error as any)?.response?.data || error);
      message.error('Fehler beim Speichern der Aufgabe 😞');
    }
  };

  // Quick task creation handler
  const handleQuickTaskCreate = async (data: { title: string; priority: TaskPriority }) => {
    if (!permissions.canEdit) {
      message.warning('Sie haben keine Berechtigung, Aufgaben zu erstellen 🔒');
      throw new Error('No permission');
    }

    await createTask.mutateAsync({
      listId: id!,
      title: data.title,
      priority: data.priority,
      description: '', // Empty description for quick tasks
    });
  };

  const handleTaskModalClose = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  // Floating Action Button actions for mobile
  const fabActions: FloatingAction[] = permissions.canEdit ? [
    {
      key: 'create-task',
      label: 'Neue Aufgabe',
      icon: <PlusOutlined />,
      onClick: handleCreateTask,
    },
    ...(permissions.canShare ? [{
      key: 'share-list',
      label: 'Liste teilen',
      icon: <ShareAltOutlined />,
      onClick: () => setShowShareModal(true),
    }] : []),
    {
      key: 'filter',
      label: 'Filter',
      icon: <FilterOutlined />,
      onClick: () => setShowMobileFilters(!showMobileFilters),
    },
    {
      key: 'refresh',
      label: 'Aktualisieren',
      icon: <ReloadOutlined />,
      onClick: () => refetch(),
      disabled: isLoading,
    },
  ] : [
    {
      key: 'refresh',
      label: 'Aktualisieren',
      icon: <ReloadOutlined />,
      onClick: () => refetch(),
      disabled: isLoading,
    },
  ];

  if (error) {
    return (
      <div className="p-6">
        <Alert
          message="Fehler beim Laden"
          description="Es gab ein Problem beim Laden der Liste oder Tasks. Bitte versuchen Sie es später erneut."
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => refetch()}>
              Erneut versuchen
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-[1920px] mx-auto">
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

      {/* Header */}
      <div className="border-b bg-white px-4 md:px-6 py-3 md:py-4 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <Title level={2} className="!mb-2">
              {isLoading ? (
                <Spin size="small" className="mr-2" />
              ) : (
                <Space>
                  {`${list?.name || 'Liste'} 📋`}
                  {permissions.userPermission && (
                    <Tag color={PERMISSION_COLORS[permissions.userPermission]}>
                      {PERMISSION_LABELS[permissions.userPermission]}
                    </Tag>
                  )}
                </Space>
              )}
            </Title>
            {list?.description && (
              <p className="text-gray-600 mb-0">{list.description}</p>
            )}
          </div>

          {/* Desktop Actions */}
          <Space wrap className="hidden lg:flex">
            <PermissionGuard listId={id!} requires="edit">
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                size="large"
                onClick={handleCreateTask}
              >
                Neue Aufgabe
              </Button>
            </PermissionGuard>
            
            <PermissionGuard listId={id!} requires="share">
              <Button 
                icon={<ShareAltOutlined />}
                onClick={() => setShowShareModal(true)}
              >
                Teilen
              </Button>
            </PermissionGuard>
            
            <Button 
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={isLoading}
            >
              Aktualisieren
            </Button>
          </Space>
        </div>

        {/* Quick Task Creator - Positioned prominently */}
        <PermissionGuard listId={id!} requires="edit">
          <div className="mt-4">
            <QuickTaskCreator
              onCreateTask={handleQuickTaskCreate}
              disabled={isLoading}
              loading={createTask.isPending}
              placeholder={
                isMobile 
                  ? "Schnell neue Aufgabe..." 
                  : "Neue Aufgabe schnell erstellen..."
              }
              enableHaptics={isMobile}
            />
          </div>
        </PermissionGuard>

        {/* Filters - Hidden on mobile when collapsed */}
        <div 
          className={`mt-4 flex flex-col sm:flex-row gap-4 transition-all duration-300 ${
            isMobile && !showMobileFilters ? 'hidden' : ''
          }`}
        >
          <Search
            placeholder="Tasks durchsuchen..."
            allowClear
            enterButton={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: 300 }}
          />
          
          <Space wrap>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
              placeholder="Status"
            >
              <Option value="ALL">Alle Status</Option>
              <Option value="TODO">Todo</Option>
              <Option value="IN_PROGRESS">In Arbeit</Option>
              <Option value="DONE">Erledigt</Option>
            </Select>

            <Select
              value={priorityFilter}
              onChange={setPriorityFilter}
              style={{ width: 120 }}
              placeholder="Priorität"
            >
              <Option value="ALL">Alle Prioritäten</Option>
              <Option value="LOW">Niedrig</Option>
              <Option value="MEDIUM">Mittel</Option>
              <Option value="HIGH">Hoch</Option>
              <Option value="URGENT">Dringend</Option>
            </Select>

            {(searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL') && (
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setPriorityFilter('ALL');
                }}
              >
                Filter zurücksetzen
              </Button>
            )}
          </Space>
        </div>

        {/* Mobile Filter Toggle Button */}
        {isMobile && (
          <div className="mt-4">
            <Button
              type={showMobileFilters ? 'primary' : 'default'}
              icon={<FilterOutlined />}
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              block
            >
              {showMobileFilters ? 'Filter ausblenden' : 'Filter anzeigen'}
            </Button>
          </div>
        )}
      </div>

      {/* Responsive Kanban Board */}
      <div 
        ref={pullToRefresh.containerRef}
        {...(isMobile ? pullToRefresh.bind() : {})}
        className="flex-1 overflow-hidden bg-gray-50"
        style={{ 
          touchAction: isMobile ? 'pan-y' : 'auto',
          overscrollBehaviorY: isMobile ? 'none' : 'auto',
        }}
      >
        <ResponsiveKanbanBoard
          tasks={filteredTasks}
          listId={id!}
          onTaskStatusChange={handleTaskStatusChange}
          onTaskReorder={handleTaskReorder}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          loading={isLoading}
          showModeToggle={true}
          enableVirtualScrolling={true}
          virtualScrollThreshold={3}
        />
      </div>

      {/* Share Modal */}
      {showShareModal && list && user && (
        <ShareModalLazy
          list={list}
          open={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Task Modal (Desktop) */}
      {!isMobile && (
        <TaskModalLazy
          open={showTaskModal}
          onClose={handleTaskModalClose}
          onSubmit={handleTaskSubmit}
          onDelete={editingTask ? () => handleDeleteTask(editingTask.id) : undefined}
          editingTask={editingTask}
          listId={id!}
          loading={createTask.isPending || updateTask.isPending || deleteTask.isPending}
        />
      )}

      {/* Task Bottom Sheet (Mobile) */}
      <TaskBottomSheet
        open={taskBottomSheet.isOpen}
        onClose={taskBottomSheet.close}
        onSubmit={handleTaskSubmit}
        onDelete={taskBottomSheet.editingTask ? () => handleDeleteTask(taskBottomSheet.editingTask!.id) : undefined}
        editingTask={taskBottomSheet.editingTask}
        listId={id!}
        loading={createTask.isPending || updateTask.isPending || deleteTask.isPending}
      />

      {/* Floating Action Button - Only on Mobile */}
      {isMobile && (
        <FloatingActionButton
          actions={fabActions}
          tooltip="Aktionen"
          hideOnScroll={true}
          scrollContainerRef={pullToRefresh.containerRef}
          disabled={isLoading}
        />
      )}
    </div>
  );
};

export default ListDetail;