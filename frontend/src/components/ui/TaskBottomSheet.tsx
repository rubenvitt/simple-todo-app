import React from 'react';
import { Form, Input, Select, DatePicker, Button, Space, message } from 'antd';
import { SaveOutlined, DeleteOutlined } from '@ant-design/icons';
import { BottomSheet, useBottomSheet } from './BottomSheet';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TaskWithAssignee, TaskPriority } from '@simple-todo-app/shared';
import { useResponsiveKanban } from '../../hooks/useResponsiveKanban';

const { TextArea } = Input;
const { Option } = Select;

// Validation schema
const taskSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich').max(200, 'Titel zu lang'),
  description: z.string().max(1000, 'Beschreibung zu lang').optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueDate: z.date().optional(),
  assigneeId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskBottomSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  editingTask?: TaskWithAssignee | null;
  loading?: boolean;
  listId: string;
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: '🟢 Niedrig', color: '#52c41a' },
  { value: 'MEDIUM', label: '🟡 Mittel', color: '#faad14' },
  { value: 'HIGH', label: '🟠 Hoch', color: '#ff4d4f' },
  { value: 'URGENT', label: '🔴 Dringend', color: '#f5222d' },
];

export const TaskBottomSheet: React.FC<TaskBottomSheetProps> = ({
  open,
  onClose,
  onSubmit,
  onDelete,
  editingTask,
  loading = false,
  listId,
}) => {
  const { isMobile } = useResponsiveKanban();
  
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: editingTask?.title || '',
      description: editingTask?.description || '',
      priority: editingTask?.priority || 'MEDIUM',
      dueDate: editingTask?.dueDate ? new Date(editingTask.dueDate) : undefined,
      assigneeId: editingTask?.assignedUserId || undefined,
    },
  });

  // Reset form when task changes
  React.useEffect(() => {
    if (editingTask) {
      reset({
        title: editingTask.title,
        description: editingTask.description || '',
        priority: editingTask.priority,
        dueDate: editingTask.dueDate ? new Date(editingTask.dueDate) : undefined,
        assigneeId: editingTask.assignedUserId || undefined,
      });
    } else {
      reset({
        title: '',
        description: '',
        priority: 'MEDIUM',
        dueDate: undefined,
        assigneeId: undefined,
      });
    }
  }, [editingTask, reset, open]);

  const handleFormSubmit = async (data: TaskFormData) => {
    try {
      await onSubmit(data);
      message.success(editingTask ? 'Task aktualisiert! ✅' : 'Task erstellt! 🎉');
      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
      message.error('Fehler beim Speichern 😞');
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !editingTask) return;
    
    try {
      await onDelete();
      message.success('Task gelöscht! 🗑️');
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
      message.error('Fehler beim Löschen 😞');
    }
  };

  const title = editingTask ? `✏️ Task bearbeiten` : `➕ Neue Task`;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      size={isMobile ? 'full' : 'auto'}
      closeOnSwipeDown={!isDirty}
      className="max-w-2xl mx-auto"
    >
      <Form layout="vertical" className="space-y-4">
        {/* Title Field */}
        <div>
          <label className="block text-sm font-medium mb-2">
            📝 Titel <span className="text-red-500">*</span>
          </label>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Was muss erledigt werden?"
                size="large"
                status={errors.title ? 'error' : ''}
                autoFocus={!isMobile} // Avoid auto-focus on mobile
              />
            )}
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Description Field */}
        <div>
          <label className="block text-sm font-medium mb-2">
            📄 Beschreibung
          </label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                placeholder="Weitere Details..."
                rows={3}
                size="large"
                status={errors.description ? 'error' : ''}
              />
            )}
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Priority Field */}
        <div>
          <label className="block text-sm font-medium mb-2">
            🎯 Priorität
          </label>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                size="large"
                className="w-full"
                placeholder="Priorität wählen"
              >
                {PRIORITY_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.label}</span>
                    </div>
                  </Option>
                ))}
              </Select>
            )}
          />
        </div>

        {/* Due Date Field */}
        <div>
          <label className="block text-sm font-medium mb-2">
            📅 Fälligkeitsdatum
          </label>
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                {...field}
                size="large"
                className="w-full"
                placeholder="Datum wählen"
                format="DD.MM.YYYY"
                showToday
              />
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            onClick={handleSubmit(handleFormSubmit)}
            loading={loading}
            disabled={!isValid}
            className="flex-1"
          >
            {editingTask ? 'Aktualisieren' : 'Erstellen'}
          </Button>

          {editingTask && onDelete && (
            <Button
              danger
              size="large"
              icon={<DeleteOutlined />}
              onClick={handleDelete}
              loading={loading}
            >
              Löschen
            </Button>
          )}
        </div>

        {/* Draft indicator */}
        {isDirty && (
          <div className="text-center text-sm text-gray-500 pt-2">
            💾 Nicht gespeicherte Änderungen
          </div>
        )}
      </Form>
    </BottomSheet>
  );
};

// Hook for managing task bottom sheet
export const useTaskBottomSheet = () => {
  const { isOpen, open, close } = useBottomSheet();
  const [editingTask, setEditingTask] = React.useState<TaskWithAssignee | null>(null);

  const openCreateTask = React.useCallback(() => {
    setEditingTask(null);
    open();
  }, [open]);

  const openEditTask = React.useCallback((task: TaskWithAssignee) => {
    setEditingTask(task);
    open();
  }, [open]);

  const handleClose = React.useCallback(() => {
    close();
    // Clear editing task after animation completes
    setTimeout(() => setEditingTask(null), 300);
  }, [close]);

  return {
    isOpen,
    editingTask,
    openCreateTask,
    openEditTask,
    close: handleClose,
  };
};