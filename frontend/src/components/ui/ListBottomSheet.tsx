import React from 'react';
import { Form, Input, Button, Space, message, ColorPicker } from 'antd';
import { SaveOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons';
import { BottomSheet } from './BottomSheet';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ListWithStats } from '@simple-todo-app/shared';
import { useResponsiveKanban } from '../../hooks/useResponsiveKanban';

const { TextArea } = Input;

// Validation schema
const listSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100, 'Name zu lang'),
  description: z.string().max(500, 'Beschreibung zu lang').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Ungültige Farbe').optional(),
});

type ListFormData = z.infer<typeof listSchema>;

interface ListBottomSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ListFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  editingList?: ListWithStats | null;
  loading?: boolean;
}

const DEFAULT_COLORS = [
  '#1890ff', // Blue
  '#52c41a', // Green  
  '#faad14', // Orange
  '#f5222d', // Red
  '#722ed1', // Purple
  '#13c2c2', // Cyan
  '#eb2f96', // Magenta
  '#fa541c', // Volcano
];

export const ListBottomSheet: React.FC<ListBottomSheetProps> = ({
  open,
  onClose,
  onSubmit,
  onDelete,
  editingList,
  loading = false,
}) => {
  const { isMobile } = useResponsiveKanban();
  
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid, isDirty },
  } = useForm<ListFormData>({
    resolver: zodResolver(listSchema),
    defaultValues: {
      name: editingList?.name || '',
      description: editingList?.description || '',
      color: editingList?.color || DEFAULT_COLORS[0],
    },
  });

  const selectedColor = watch('color');

  // Reset form when list changes
  React.useEffect(() => {
    if (editingList) {
      reset({
        name: editingList.name,
        description: editingList.description || '',
        color: editingList.color || DEFAULT_COLORS[0],
      });
    } else {
      reset({
        name: '',
        description: '',
        color: DEFAULT_COLORS[0],
      });
    }
  }, [editingList, reset, open]);

  const handleFormSubmit = async (data: ListFormData) => {
    try {
      await onSubmit(data);
      message.success(editingList ? 'Liste aktualisiert! ✅' : 'Liste erstellt! 🎉');
      onClose();
    } catch (error) {
      console.error('Error submitting list:', error);
      message.error('Fehler beim Speichern 😞');
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !editingList) return;
    
    try {
      await onDelete();
      message.success('Liste gelöscht! 🗑️');
      onClose();
    } catch (error) {
      console.error('Error deleting list:', error);
      message.error('Fehler beim Löschen 😞');
    }
  };

  const title = editingList ? `✏️ Liste bearbeiten` : `➕ Neue Liste`;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      size={isMobile ? 'auto' : 'auto'}
      closeOnSwipeDown={!isDirty}
      className="max-w-lg mx-auto"
    >
      <Form layout="vertical" className="space-y-4">
        {/* Preview */}
        <div className="text-center pb-4 border-b border-gray-100">
          <div 
            className="inline-flex items-center gap-3 px-4 py-3 rounded-lg text-white font-medium"
            style={{ backgroundColor: selectedColor || DEFAULT_COLORS[0] }}
          >
            <FolderOutlined className="text-lg" />
            <span>{watch('name') || 'Neue Liste'}</span>
          </div>
        </div>

        {/* Name Field */}
        <div>
          <label className="block text-sm font-medium mb-2">
            📝 Name <span className="text-red-500">*</span>
          </label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="z.B. Einkaufsliste, Projekt ABC..."
                size="large"
                status={errors.name ? 'error' : ''}
                autoFocus={!isMobile}
              />
            )}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
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
                placeholder="Worum geht es in dieser Liste?"
                rows={2}
                size="large"
                status={errors.description ? 'error' : ''}
              />
            )}
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Color Field */}
        <div>
          <label className="block text-sm font-medium mb-2">
            🎨 Farbe
          </label>
          
          {/* Preset Colors */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {DEFAULT_COLORS.map((color) => (
              <Controller
                key={color}
                name="color"
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    className={`w-12 h-12 rounded-lg border-2 transition-all ${
                      field.value === color 
                        ? 'border-gray-800 scale-110' 
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => field.onChange(color)}
                  />
                )}
              />
            ))}
          </div>

          {/* Custom Color Picker */}
          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Oder benutzerdefiniert:</span>
                <ColorPicker
                  value={field.value}
                  onChange={(_, hex) => field.onChange(hex)}
                  size="large"
                />
              </div>
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
            style={{ backgroundColor: selectedColor, borderColor: selectedColor }}
          >
            {editingList ? 'Aktualisieren' : 'Erstellen'}
          </Button>

          {editingList && onDelete && (
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