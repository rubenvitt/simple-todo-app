import { Modal, Form, Input, message } from 'antd';
import { useCreateList, useUpdateList, useTranslation } from '../hooks';
import type { ListWithStats } from '@simple-todo-app/shared';

const { TextArea } = Input;

interface CreateListModalProps {
  open: boolean;
  onClose: () => void;
  editingList?: ListWithStats | null;
}

interface FormValues {
  name: string;
  description: string;
}

export const CreateListModal: React.FC<CreateListModalProps> = ({
  open,
  onClose,
  editingList,
}) => {
  const [form] = Form.useForm<FormValues>();
  const createList = useCreateList();
  const updateList = useUpdateList();
  const { t } = useTranslation('common');

  const isEditing = !!editingList;
  const title = isEditing ? t('lists.edit') : t('lists.create');

  const handleSubmit = async (values: FormValues) => {
    try {
      if (isEditing && editingList) {
        await updateList.mutateAsync({
          id: editingList.id,
          data: {
            name: values.name,
            description: values.description || undefined,
          },
        });
        message.success(`${t('lists.messages.updateSuccess')} 🎉`);
      } else {
        await createList.mutateAsync({
          name: values.name,
          description: values.description || undefined,
        });
        message.success(`${t('lists.messages.createSuccess')} 🎉`);
      }
      
      form.resetFields();
      onClose();
    } catch {
      message.error(`${t('lists.messages.saveError')} 😞`);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={title}
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      confirmLoading={createList.isPending || updateList.isPending}
      okText={isEditing ? t('lists.actions.update') : t('lists.actions.create')}
      cancelText={t('actions.cancel')}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={
          editingList
            ? {
                name: editingList.name,
                description: editingList.description || '',
              }
            : {
                name: '',
                description: '',
              }
        }
      >
        <Form.Item
          name="name"
          label={t('lists.name')}
          rules={[
            { required: true, message: t('lists.validation.nameRequired') },
            { max: 100, message: t('lists.validation.nameMaxLength') },
          ]}
        >
          <Input placeholder={t('lists.placeholder.name')} />
        </Form.Item>

        <Form.Item
          name="description"
          label={t('lists.description')}
          rules={[{ max: 500, message: t('lists.validation.descriptionMaxLength') }]}
        >
          <TextArea
            rows={4}
            placeholder={t('lists.placeholder.description')}
            showCount
            maxLength={500}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};