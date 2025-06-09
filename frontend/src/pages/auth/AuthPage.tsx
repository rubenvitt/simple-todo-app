import React, { useState } from 'react';
import { Card, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { LoginForm, RegisterForm } from '../../components/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { loginSchema, registerSchema } from '../../types/validation.schemas';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export const AuthPage: React.FC = () => {
  const { login, register, isLoading, error } = useAuth();
  const { t } = useTranslation('auth');
  const [activeTab, setActiveTab] = useState<string>('login');
  const navigate = useNavigate();

  const handleLogin = async (data: LoginFormData) => {
    try {
      await login(data);
      // Navigate to dashboard after successful login
      navigate('/dashboard');
    } catch (error) {
      // Error is already handled in AuthContext
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    try {
      await register(data);
      // Navigate to dashboard after successful registration
      navigate('/dashboard');
    } catch (error) {
      // Error is already handled in AuthContext
    }
  };

  const items: TabsProps['items'] = [
    {
      key: 'login',
      label: t('login.title'),
      children: (
        <LoginForm
          onSubmit={handleLogin}
          loading={isLoading}
          error={error}
        />
      ),
    },
    {
      key: 'register',
      label: t('register.title'),
      children: (
        <RegisterForm
          onSubmit={handleRegister}
          loading={isLoading}
          error={error}
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('appName', { ns: 'common' })}</h1>
          <p className="text-gray-600">{t('tagline')}</p>
        </div>
        <Card className="shadow-2xl border-0 rounded-lg">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            centered
            items={items}
            tabBarStyle={{ marginBottom: '24px' }}
          />
        </Card>
      </div>
    </div>
  );
};