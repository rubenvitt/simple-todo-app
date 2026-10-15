import React, { useState, useCallback } from 'react';
import { Modal, Form, Input, Select, DatePicker, Upload, Button, Space, message, Popconfirm, Avatar, Spin } from 'antd';
import type { UploadFile } from 'antd';
import { DeleteOutlined, InboxOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { debounce } from 'lodash';
import { listSharesService, type SearchUsersResponse } from '../services/list-shares.service';
import type { Task, TaskPriority } from '@simple-todo-app/shared';
import { useMobileDetection } from '../hooks';
import { MobileFormField } from './forms';

const { TextArea } = Input;
const { Dragger } = Upload;

const taskFormSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich').max(200, 'Titel zu lang'),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData & { attachments?: File[] }) => Promise<void>;
  onDelete?: () => Promise<void>;
  editingTask?: Task | null;
  listId: string;
  loading?: boolean;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  open,
  onClose,
  onSubmit,
  onDelete,
  editingTask,
  listId,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const { isMobile } = useMobileDetection();
  
  // User search state
  const [userSearchResults, setUserSearchResults] = useState<SearchUsersResponse[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  
  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  // Auto-save state
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    watch,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: editingTask ? {
      title: editingTask.title,
      description: editingTask.description || '',
      dueDate: editingTask.dueDate ? new Date(editingTask.dueDate) : undefined,
      priority: editingTask.priority,
      assigneeId: editingTask.assigneeId || undefined,
    } : {
      title: '',
      description: '',
      priority: 'MEDIUM' as TaskPriority,
    },
  });

  const isEditing = !!editingTask;
  const title = isEditing ? 'Task bearbeiten' : 'Neue Task erstellen';

  // User search functionality
  const debouncedUserSearch = useCallback(
    debounce(async (query: string) => {
      if (query.trim().length < 2) {
        setUserSearchResults([]);
        return;
      }
      
      setUserSearchLoading(true);
      try {
        const results = await listSharesService.searchUsers(query);
        setUserSearchResults(results);
      } catch {
        setUserSearchResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 300),
    []
  );

  const handleUserSearch = (value: string) => {
    debouncedUserSearch(value);
  };

  // Auto-save draft functionality
  const draftKey = `task-draft-${listId}-${editingTask?.id || 'new'}`;
  
  const saveDraft = useCallback(
    debounce((data: Partial<TaskFormData>) => {
      if (!isEditing && Object.keys(data).length > 0) {
        localStorage.setItem(draftKey, JSON.stringify(data));
        setIsDraftSaved(true);
        setTimeout(() => setIsDraftSaved(false), 2000);
      }
    }, 1000),
    [draftKey, isEditing]
  );

  // Watch form changes for auto-save
  const watchedValues = watch();
  
  // Auto-save effect
  React.useEffect(() => {
    if (open && !isEditing) {
      // Load draft on open
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          reset(draftData);
        } catch {
          // Ignore draft loading errors
        }
      }
    }
  }, [open, draftKey, isEditing, reset]);

  React.useEffect(() => {
    if (open) {
      saveDraft(watchedValues);
    }
  }, [watchedValues, open, saveDraft]);

  const handleFormSubmit = async (data: TaskFormData) => {
    try {
      await onSubmit({ ...data, attachments: uploadedFiles });
      
      // Clear draft after successful submit
      if (!isEditing) {
        localStorage.removeItem(draftKey);
      }
      
      reset();
      setUploadedFiles([]);
      onClose();
      message.success(isEditing ? 'Task erfolgreich aktualisiert! 🎉' : 'Task erfolgreich erstellt! 🎉');
    } catch {
      message.error('Fehler beim Speichern der Task 😞');
    }
  };

  const handleFileChange = (info: { fileList: Array<{ originFileObj?: File }> }) => {
    const files = info.fileList.map((file) => file.originFileObj).filter(Boolean) as File[];
    setUploadedFiles(files);
  };

  const handleCancel = () => {
    if (isDirty) {
      Modal.confirm({
        title: 'Ungespeicherte Änderungen',
        content: 'Sie haben ungespeicherte Änderungen. Möchten Sie wirklich abbrechen?',
        onOk: () => {
          reset();
          onClose();
        },
      });
    } else {
      reset();
      onClose();
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      try {
        await onDelete();
        message.success('Task erfolgreich gelöscht! 🗑️');
        onClose();
      } catch {
        message.error('Fehler beim Löschen der Task 😞');
      }
    }
  };

  return (
    <Modal
      title={
        <Space>
          <span>{title}</span>
          {isDirty && <SaveOutlined style={{ color: '#faad14' }} title="Ungespeicherte Änderungen" />}
          {isDraftSaved && <span style={{ color: '#52c41a', fontSize: '12px' }}>✓ Entwurf gespeichert</span>}
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Abbrechen
        </Button>,
        ...(isEditing && onDelete ? [
          <Popconfirm
            key="delete"
            title="Task löschen"
            description="Sind Sie sicher, dass Sie diese Task löschen möchten?"
            onConfirm={handleDelete}
            okText="Löschen"
            cancelText="Abbrechen"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} loading={loading}>
              Löschen
            </Button>
          </Popconfirm>
        ] : []),
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit(handleFormSubmit)}
          loading={loading}
        >
          {isEditing ? 'Aktualisieren' : 'Erstellen'}
        </Button>,
      ]}
      width={700}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
      >
        {/* Title Field */}
        {isMobile ? (
          <MobileFormField
            name="title"
            control={control}
            type="text"
            label="Titel"
            required
            autoFocus
            inputProps={{
              placeholder: "Task-Titel eingeben...",
            }}
          />
        ) : (
          <Form.Item
            label="Titel"
            validateStatus={errors.title ? 'error' : ''}
            help={errors.title?.message}
            required
          >
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Task-Titel eingeben..."
                  size="large"
                />
              )}
            />
          </Form.Item>
        )}

        {/* Description Field */}
        {isMobile ? (
          <MobileFormField
            name="description"
            control={control}
            type="textarea"
            label="Beschreibung"
            rows={3}
            autoResize
            maxLength={500}
            inputProps={{
              placeholder: "Detaillierte Beschreibung der Task...",
            }}
          />
        ) : (
          <Form.Item
            label="Beschreibung"
            validateStatus={errors.description ? 'error' : ''}
            help={errors.description?.message}
          >
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  rows={4}
                  placeholder="Detaillierte Beschreibung der Task..."
                  showCount
                  maxLength={1000}
                />
              )}
            />
          </Form.Item>
        )}

    {/* Priority and Due Date Row */}
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
      {isMobile ? (
        <>
          <MobileFormField
            name="priority"
            control={control}
            type="select"
            label="Priorität"
            options={[
              { value: 'LOW', label: '🟢 Niedrig' },
              { value: 'MEDIUM', label: '🟡 Mittel' },
              { value: 'HIGH', label: '🔴 Hoch' },
              { value: 'URGENT', label: '🚨 Dringend' },
            ]}
            selectProps={{
              placeholder: "Priorität wählen",
            }}
          />

          <MobileFormField
            name="dueDate"
            control={control}
            type="date"
            label="Fälligkeitsdatum"
            format="DD.MM.YYYY"
            showNativeInput
            dateProps={{
              placeholder: "Datum wählen",
            }}
          />
        </>
      ) : (
        <>
          <Form.Item
            label="Priorität"
            validateStatus={errors.priority ? 'error' : ''}
            help={errors.priority?.message}
          >
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  placeholder="Priorität wählen"
                  options={[
                    { value: 'LOW', label: '🟢 Niedrig' },
                    { value: 'MEDIUM', label: '🟡 Mittel' },
                    { value: 'HIGH', label: '🔴 Hoch' },
                    { value: 'URGENT', label: '🚨 Dringend' },
                  ]}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Fälligkeitsdatum"
            validateStatus={errors.dueDate ? 'error' : ''}
            help={errors.dueDate?.message}
          >
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value ? field.value as unknown as undefined : undefined}
                  onChange={(date) => field.onChange(date?.toDate())}
                  style={{ width: '100%' }}
                  placeholder="Datum wählen"
                  format="DD.MM.YYYY"
                />
              )}
            />
          </Form.Item>
        </>
      )}
    </div>

    {/* Assignee Field */}
    {isMobile ? (
      <MobileFormField
        name="assigneeId"
        control={control}
        type="select"
        label="Zugewiesen an"
        searchable
        selectProps={{
          placeholder: "Person zuweisen...",
          allowClear: true,
          showSearch: true,
          onSearch: handleUserSearch,
          loading: userSearchLoading,
          filterOption: false,
          notFoundContent: userSearchLoading ? <Spin size="small" /> : 'Keine Benutzer gefunden',
        }}
        options={userSearchResults.map(user => ({
          value: user.id,
          label: (
            <Space>
              <Avatar size="small" icon={<UserOutlined />} />
              <div>
                <div>{user.name}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>{user.email}</div>
              </div>
            </Space>
          ),
        }))}
      />
    ) : (
      <Form.Item
        label="Zugewiesen an"
        validateStatus={errors.assigneeId ? 'error' : ''}
        help={errors.assigneeId?.message}
      >
        <Controller
          name="assigneeId"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              placeholder="Person zuweisen..."
              allowClear
              showSearch
              onSearch={handleUserSearch}
              loading={userSearchLoading}
              filterOption={false}
              notFoundContent={userSearchLoading ? <Spin size="small" /> : 'Keine Benutzer gefunden'}
            >
              {userSearchResults.map(user => (
                <Select.Option key={user.id} value={user.id}>
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} />
                    <div>
                      <div>{user.name}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{user.email}</div>
                    </div>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          )}
        />
      </Form.Item>
    )}

        {/* File Upload */}
        <Form.Item label="Anhänge">
          <Dragger
            name="files"
            multiple
            beforeUpload={() => false} // Prevent automatic upload
            onChange={handleFileChange}
            fileList={uploadedFiles.map((file, index) => ({
              uid: `${index}`,
              name: file.name,
              status: 'done' as const,
              originFileObj: file as any,
            } as UploadFile))}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
            maxCount={10}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Dateien hier hineinziehen oder klicken zum Auswählen
            </p>
            <p className="ant-upload-hint">
              Max. 10 Dateien. Unterstützte Formate: PDF, DOC, TXT, Bilder
            </p>
          </Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
};