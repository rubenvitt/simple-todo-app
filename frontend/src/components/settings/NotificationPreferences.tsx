import React from 'react';
import { Card, Switch, Select, Divider, Typography, Row, Col, Spin, Alert, Space } from 'antd';
import { BellOutlined, MailOutlined, MobileOutlined, SettingOutlined } from '@ant-design/icons';
import { useNotificationPreferences } from '../../hooks';
import { NotificationFrequency, NotificationTypePreferences } from '../../types';
import { useTranslation } from '../../hooks';

const { Title, Text } = Typography;
const { Option } = Select;

interface NotificationTypeItemProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const NotificationTypeItem: React.FC<NotificationTypeItemProps> = ({
  label,
  description,
  checked,
  onChange,
}) => (
  <Row justify="space-between" align="middle" style={{ padding: '12px 0' }}>
    <Col span={20}>
      <div>
        <Text strong>{label}</Text>
        <br />
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {description}
        </Text>
      </div>
    </Col>
    <Col span={4} style={{ textAlign: 'right' }}>
      <Switch size="small" checked={checked} onChange={onChange} />
    </Col>
  </Row>
);

export const NotificationPreferences: React.FC = () => {
  const { t } = useTranslation('common');
  const { preferences, isLoading, error, updatePreferences, isUpdating } = useNotificationPreferences();

  if (isLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>{t('settings.preferences.loading')}</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert
          message={t('settings.preferences.error')}
          description={t('settings.preferences.errorDescription')}
          type="error"
          showIcon
        />
      </Card>
    );
  }

  if (!preferences) return null;

  const handleDeliveryMethodChange = (field: 'inApp' | 'email', value: boolean) => {
    updatePreferences({ [field]: value });
  };

  const handleFrequencyChange = (frequency: NotificationFrequency) => {
    updatePreferences({ frequency });
  };

  const handleTypeChange = (type: keyof NotificationTypePreferences, enabled: boolean) => {
    updatePreferences({
      types: {
        [type]: enabled,
      },
    });
  };

  const frequencyOptions = [
    { value: NotificationFrequency.IMMEDIATE, label: t('settings.preferences.frequency.immediate') },
    { value: NotificationFrequency.DAILY_DIGEST, label: t('settings.preferences.frequency.daily') },
    { value: NotificationFrequency.WEEKLY_DIGEST, label: t('settings.preferences.frequency.weekly') },
    { value: NotificationFrequency.DISABLED, label: t('settings.preferences.frequency.disabled') },
  ];

  const notificationTypes = [
    {
      type: 'GENERAL' as const,
      label: t('settings.preferences.types.general.label'),
      description: t('settings.preferences.types.general.description'),
    },
    {
      type: 'TASK_ASSIGNMENT' as const,
      label: t('settings.preferences.types.taskAssignment.label'),
      description: t('settings.preferences.types.taskAssignment.description'),
    },
    {
      type: 'TASK_STATUS_CHANGE' as const,
      label: t('settings.preferences.types.taskStatusChange.label'),
      description: t('settings.preferences.types.taskStatusChange.description'),
    },
    {
      type: 'LIST_SHARED' as const,
      label: t('settings.preferences.types.listShared.label'),
      description: t('settings.preferences.types.listShared.description'),
    },
    {
      type: 'INVITATION_RECEIVED' as const,
      label: t('settings.preferences.types.invitationReceived.label'),
      description: t('settings.preferences.types.invitationReceived.description'),
    },
    {
      type: 'INVITATION_ACCEPTED' as const,
      label: t('settings.preferences.types.invitationAccepted.label'),
      description: t('settings.preferences.types.invitationAccepted.description'),
    },
    {
      type: 'LIST_UPDATE' as const,
      label: t('settings.preferences.types.listUpdate.label'),
      description: t('settings.preferences.types.listUpdate.description'),
    },
  ];

  return (
    <div style={{ maxWidth: 800 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Delivery Methods */}
        <Card>
          <Title level={4} style={{ margin: 0, marginBottom: 16 }}>
            <SettingOutlined style={{ marginRight: 8 }} />
            {t('settings.preferences.deliveryMethods.title')}
          </Title>
          <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
            {t('settings.preferences.deliveryMethods.description')}
          </Text>

          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <BellOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
                <div>
                  <Text strong>{t('settings.preferences.deliveryMethods.inApp')}</Text>
                  <br />
                  <Switch
                    checked={preferences.inApp}
                    onChange={(checked) => handleDeliveryMethodChange('inApp', checked)}
                    disabled={isUpdating}
                    style={{ marginTop: 8 }}
                  />
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <MailOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
                <div>
                  <Text strong>{t('settings.preferences.deliveryMethods.email')}</Text>
                  <br />
                  <Switch
                    checked={preferences.email}
                    onChange={(checked) => handleDeliveryMethodChange('email', checked)}
                    disabled={isUpdating}
                    style={{ marginTop: 8 }}
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Frequency */}
        <Card>
          <Title level={4} style={{ margin: 0, marginBottom: 16 }}>
            <MobileOutlined style={{ marginRight: 8 }} />
            {t('settings.preferences.frequency.title')}
          </Title>
          <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
            {t('settings.preferences.frequency.description')}
          </Text>

          <Select
            value={preferences.frequency}
            onChange={handleFrequencyChange}
            disabled={isUpdating}
            style={{ width: '100%' }}
            size="large"
          >
            {frequencyOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Card>

        {/* Notification Types */}
        <Card>
          <Title level={4} style={{ margin: 0, marginBottom: 16 }}>
            <BellOutlined style={{ marginRight: 8 }} />
            {t('settings.preferences.types.title')}
          </Title>
          <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
            {t('settings.preferences.types.description')}
          </Text>

          {notificationTypes.map((notificationType, index) => (
            <div key={notificationType.type}>
              <NotificationTypeItem
                label={notificationType.label}
                description={notificationType.description}
                checked={preferences.types[notificationType.type]}
                onChange={(checked) => handleTypeChange(notificationType.type, checked)}
              />
              {index < notificationTypes.length - 1 && <Divider style={{ margin: '8px 0' }} />}
            </div>
          ))}
        </Card>
      </Space>
    </div>
  );
};