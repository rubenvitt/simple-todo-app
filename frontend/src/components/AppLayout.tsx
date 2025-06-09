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
import { useTranslation } from '../hooks/useTranslation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationBadge, NotificationDrawer } from './notifications';

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
            height: 32, 
            margin: 16,
            background: token.colorPrimary,
            borderRadius: token.borderRadius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: collapsed ? '12px' : '16px',
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
      
      <Layout>
        <Header 
          style={{ 
            padding: '0 16px',
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorder}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          
          <Space size="middle">
            <LanguageSwitcher />
            
            <Button
              type="text"
              icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
              style={{
                fontSize: '16px',
                width: 40,
                height: 40,
              }}
            />
            
            <NotificationBadge onClick={() => setNotificationDrawerOpen(true)} />
            
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <div style={{ cursor: 'pointer' }}>
                <Space>
                  <Avatar 
                    size="small" 
                    src={user?.avatar}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: token.colorPrimary }}
                  />
                  {!collapsed && (
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
            margin: '24px 16px',
            padding: 24,
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
    </Layout>
  );
};