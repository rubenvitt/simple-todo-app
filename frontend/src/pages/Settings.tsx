import React, { useState, useEffect } from 'react';
import { Typography, Tabs, Card, Switch, Select, Space, Divider, Button, message } from 'antd';
import { BellOutlined, UserOutlined, SettingOutlined, SunOutlined, MoonOutlined, GlobalOutlined } from '@ant-design/icons';
import { NotificationPreferences } from '../components/settings';
import { useTranslation } from '../hooks';
import { useTheme } from '../contexts/ThemeContext';

const { Title } = Typography;

const Settings: React.FC = () => {
  const { t, currentLanguage, changeLanguage } = useTranslation('common');
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const [autoSave, setAutoSave] = useState(() => {
    const saved = localStorage.getItem('autoSave');
    return saved !== null ? saved === 'true' : true;
  });
  const [compactMode, setCompactMode] = useState(() => {
    const saved = localStorage.getItem('compactMode');
    return saved !== null ? saved === 'true' : false;
  });

  const handleLanguageChange = (value: string) => {
    changeLanguage(value);
    message.success(t('settings.languageChanged'));
  };

  const handleAutoSaveChange = (checked: boolean) => {
    setAutoSave(checked);
    localStorage.setItem('autoSave', checked.toString());
    message.success(t('settings.autoSaveUpdated'));
  };

  const handleCompactModeChange = (checked: boolean) => {
    setCompactMode(checked);
    localStorage.setItem('compactMode', checked.toString());
    message.success(t('settings.compactModeUpdated'));
  };

  // General Settings Component
  const GeneralSettings = () => (
    <div style={{ padding: '20px 0' }}>
      <Card title={t('settings.general.appearance')} style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Theme Setting */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                <Space>
                  {isDarkMode ? <MoonOutlined /> : <SunOutlined />}
                  {t('settings.general.darkMode')}
                </Space>
              </div>
              <Typography.Text type="secondary">
                {t('settings.general.darkModeDescription')}
              </Typography.Text>
            </div>
            <Switch checked={isDarkMode} onChange={toggleTheme} />
          </div>

          <Divider />

          {/* Language Setting */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                <Space>
                  <GlobalOutlined />
                  {t('settings.general.language')}
                </Space>
              </div>
              <Typography.Text type="secondary">
                {t('settings.general.languageDescription')}
              </Typography.Text>
            </div>
            <Select
              value={currentLanguage}
              onChange={handleLanguageChange}
              style={{ width: 120 }}
              options={[
                { value: 'en', label: 'English' },
                { value: 'de', label: 'Deutsch' },
              ]}
            />
          </div>

          <Divider />

          {/* Compact Mode Setting */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                {t('settings.general.compactMode')}
              </div>
              <Typography.Text type="secondary">
                {t('settings.general.compactModeDescription')}
              </Typography.Text>
            </div>
            <Switch checked={compactMode} onChange={handleCompactModeChange} />
          </div>
        </Space>
      </Card>

      <Card title={t('settings.general.behavior')}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Auto Save Setting */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                {t('settings.general.autoSave')}
              </div>
              <Typography.Text type="secondary">
                {t('settings.general.autoSaveDescription')}
              </Typography.Text>
            </div>
            <Switch checked={autoSave} onChange={handleAutoSaveChange} />
          </div>
        </Space>
      </Card>
    </div>
  );

  const tabItems = [
    {
      key: 'notifications',
      label: (
        <span>
          <BellOutlined />
          {t('settings.tabs.notifications')}
        </span>
      ),
      children: <NotificationPreferences />,
    },
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined />
          {t('settings.tabs.profile')}
        </span>
      ),
      children: (
        <div style={{ padding: '20px 0' }}>
          <Typography.Text type="secondary">
            {t('settings.tabs.profilePlaceholder')}
          </Typography.Text>
        </div>
      ),
    },
    {
      key: 'general',
      label: (
        <span>
          <SettingOutlined />
          {t('settings.tabs.general')}
        </span>
      ),
      children: <GeneralSettings />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        {t('settings.title')}
      </Title>
      
      <Tabs
        defaultActiveKey="notifications"
        items={tabItems}
        size="large"
        tabPosition="top"
      />
    </div>
  );
};

export default Settings;