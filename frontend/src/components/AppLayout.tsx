import { useState } from 'react';
import { Layout, Menu, Dropdown, Avatar, Button, Space, theme } from 'antd';
import { 
  DashboardOutlined, 
  UnorderedListOutlined, 
  UserOutlined, 
  SettingOutlined, 
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SunOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation, useMobileDetection } from '../hooks';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationBadge, NotificationDrawer, PWAUpdateNotification, usePWAUpdate } from './notifications';

const { Header, Sider, Content } = Layout;

export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { t } = useTranslation('common');
  const { token } = theme.useToken();
  const { updateAvailable, updateApp, dismissUpdate } = usePWAUpdate();
  const { isMobile } = useMobileDetection();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: t('navigation.dashboard'),
    },
    {
      key: '/lists',
      icon: <UnorderedListOutlined />,
      label: t('navigation.lists'),
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('navigation.profile'),
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('navigation.settings'),
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('navigation.logout'),
      onClick: logout,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider 
          trigger={null} 
          collapsible 
          collapsed={collapsed}
          style={{
            background: token.colorBgContainer,
            borderRight: `1px solid ${token.colorBorder}`,
          }}
        >
          <div 
            style={{ 
              height: isMobile ? 24 : 32, 
              margin: isMobile ? 8 : 16,
              background: token.colorPrimary,
              borderRadius: token.borderRadius,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: collapsed ? '12px' : isMobile ? '14px' : '16px',
            }}
          >
            {collapsed ? 'TD' : t('appName')}
          </div>
          
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ 
              borderRight: 0,
              background: 'transparent',
            }}
          />
        </Sider>
      )}
      
      <Layout>
        <Header 
          style={{ 
            padding: isMobile ? '0 8px' : '0 16px',
            height: isMobile ? 48 : 64,
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorder}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {isMobile ? (
            <div 
              style={{ 
                height: 28,
                background: token.colorPrimary,
                borderRadius: token.borderRadius,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '14px',
                padding: '0 12px',
              }}
            >
              {t('appName')}
            </div>
          ) : (
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="compact-button"
            />
          )}
          
          <Space size={isMobile ? "small" : "middle"}>
            {!isMobile && <LanguageSwitcher />}
            
            <Button
              type="text"
              icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
              className={isMobile ? "compact-button" : ""}
              style={{
                fontSize: isMobile ? '14px' : '16px',
                width: isMobile ? 32 : 40,
                height: isMobile ? 32 : 40,
              }}
            />
            
            <NotificationBadge onClick={() => setNotificationDrawerOpen(true)} />
            
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <div style={{ cursor: 'pointer' }}>
                <Space size="small">
                  <Avatar 
                    size={isMobile ? 24 : "small"}
                    src={user?.avatar}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: token.colorPrimary }}
                  />
                  {!isMobile && !collapsed && (
                    <span style={{ color: token.colorText }}>
                      {user?.email}
                    </span>
                  )}
                </Space>
              </div>
            </Dropdown>
          </Space>
        </Header>
        
        <Content
          style={{
            margin: isMobile ? '8px 8px' : '16px 16px',
            padding: isMobile ? 12 : 16,
            minHeight: 280,
            background: token.colorBgContainer,
            borderRadius: token.borderRadius,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
      
      <NotificationDrawer 
        open={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
      />
      
      {updateAvailable && (
        <PWAUpdateNotification 
          onUpdate={updateApp}
          onDismiss={dismissUpdate}
        />
      )}
    </Layout>
  );
};