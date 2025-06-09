import React, { useState } from 'react';
import { Typography, Card, Form, Input, Button, Space, message, Spin, Modal, Alert } from 'antd';
import { UserOutlined, MailOutlined, SaveOutlined, LockOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks';
import { useTranslation } from '../hooks';
import AvatarUpload from '../components/AvatarUpload';

const { Title, Text } = Typography;

interface ProfileFormData {
  name: string;
  email: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Profile: React.FC = () => {
  const { user, updateProfile, changePassword, deleteAccount } = useAuth();
  const { t } = useTranslation('common');
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  const handleProfileUpdate = async (values: ProfileFormData) => {
    setIsUpdatingProfile(true);
    try {
      await updateProfile({ ...values, avatar: avatarUrl });
      message.success(t('profile.updateSuccess'));
    } catch (error: any) {
      message.error(error.message || t('common.error'));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAvatarChange = (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl);
  };

  const handlePasswordChange = async (values: PasswordFormData) => {
    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success(t('profile.passwordChangeSuccess'));
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error.message || t('common.error'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      message.success(t('profile.deleteSuccess'));
      setIsDeleteModalVisible(false);
    } catch (error: any) {
      message.error(error.message || t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const showDeleteModal = () => {
    setIsDeleteModalVisible(true);
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalVisible(false);
  };

  // Initialize avatar when user data is loaded
  React.useEffect(() => {
    if (user?.avatar) {
      setAvatarUrl(user.avatar);
    }
  }, [user]);

  if (!user) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 50 }} />;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        {t('profile.title')}
      </Title>

      {/* Profile Information Card */}
      <Card 
        title={
          <Space>
            <UserOutlined />
            {t('profile.personalInfo')}
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <div style={{ marginBottom: 24 }}>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            {t('profile.avatar')}
          </Typography.Text>
          <AvatarUpload
            currentAvatar={avatarUrl}
            onAvatarChange={handleAvatarChange}
            size={100}
          />
        </div>
        
        <Form
          form={profileForm}
          layout="vertical"
          initialValues={{
            name: user.name,
            email: user.email,
          }}
          onFinish={handleProfileUpdate}
        >
          <Form.Item
            label={t('profile.name')}
            name="name"
            rules={[
              { required: true, message: t('profile.nameRequired') },
              { min: 2, message: t('profile.nameMinLength') },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('profile.namePlaceholder')}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label={t('profile.email')}
            name="email"
            rules={[
              { required: true, message: t('profile.emailRequired') },
              { type: 'email', message: t('profile.emailInvalid') },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder={t('profile.emailPlaceholder')}
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isUpdatingProfile}
              icon={<SaveOutlined />}
              size="large"
            >
              {t('profile.updateProfile')}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Password Change Card */}
      <Card 
        title={
          <Space>
            <LockOutlined />
            {t('profile.changePassword')}
          </Space>
        }
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
        >
          <Form.Item
            label={t('profile.currentPassword')}
            name="currentPassword"
            rules={[
              { required: true, message: t('profile.currentPasswordRequired') },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('profile.currentPasswordPlaceholder')}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label={t('profile.newPassword')}
            name="newPassword"
            rules={[
              { required: true, message: t('profile.newPasswordRequired') },
              { min: 6, message: t('profile.passwordMinLength') },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('profile.newPasswordPlaceholder')}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label={t('profile.confirmPassword')}
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: t('profile.confirmPasswordRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('profile.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('profile.confirmPasswordPlaceholder')}
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isChangingPassword}
              icon={<LockOutlined />}
              size="large"
            >
              {t('profile.changePassword')}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Account Deletion Card */}
      <Card 
        title={
          <Space>
            <DeleteOutlined />
            {t('profile.dangerZone')}
          </Space>
        }
        style={{ marginTop: 24, borderColor: '#ff4d4f' }}
      >
        <Alert
          message={t('profile.deleteWarningTitle')}
          description={t('profile.deleteWarningDescription')}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Button
          type="primary"
          danger
          icon={<DeleteOutlined />}
          size="large"
          onClick={showDeleteModal}
        >
          {t('profile.deleteAccount')}
        </Button>
      </Card>

      {/* Delete Account Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            {t('profile.confirmDeleteTitle')}
          </Space>
        }
        open={isDeleteModalVisible}
        onCancel={handleDeleteCancel}
        footer={[
          <Button key="cancel" onClick={handleDeleteCancel}>
            {t('actions.cancel')}
          </Button>,
          <Button 
            key="delete" 
            type="primary" 
            danger 
            loading={isDeleting}
            onClick={handleDeleteAccount}
          >
            {t('profile.confirmDelete')}
          </Button>,
        ]}
      >
        <Alert
          message={t('profile.deleteConfirmWarning')}
          description={t('profile.deleteConfirmDescription')}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Typography.Text strong>
          {t('profile.deleteConfirmText')}
        </Typography.Text>
      </Modal>
    </div>
  );
};

export default Profile;