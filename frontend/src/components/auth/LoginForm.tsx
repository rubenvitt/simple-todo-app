import React from 'react';
import { Form, Button, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useFormConfig, useTranslation, useMobileDetection } from '../../hooks';
import { SimpleFormField as FormField, MobileFormField, FormErrorBoundary } from '../forms';
import { loginSchema, type LoginFormData } from '../../types/validation.schemas';
import { FormErrorHandler } from '../../utils';

const { Title, Text } = Typography;

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  loading = false,
  error = null,
}) => {
  const { t } = useTranslation('auth');
  const { isMobile } = useMobileDetection();
  const form = useFormConfig(loginSchema, {
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleFormSubmit = form.createSubmitHandler(
    async (data: LoginFormData) => {
      await onSubmit(data);
    },
    {
      successMessage: t('messages.loginSuccess'),
      errorMessage: t('messages.loginError'),
      onError: (error) => {
        FormErrorHandler.handleApiError(error, form.setError, {
          fieldMapping: {
            email: 'email',
            password: 'password',
          },
        });
      },
    }
  );

  return (
    <FormErrorBoundary>
      <div className="space-y-6">
        <div className="text-center">
          <Title level={4} className="mb-2 text-gray-800">
            {t('login.title')} 👋
          </Title>
          <Text type="secondary" className="text-sm">
            {t('login.subtitle')}
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            className="rounded-lg"
            closable
          />
        )}

        <Form
          layout="vertical"
          onFinish={handleFormSubmit}
          autoComplete="off"
          className="space-y-4"
        >
          {isMobile ? (
            <>
              <MobileFormField
                name="email"
                control={form.control}
                type="email"
                label={<span className="text-sm font-medium text-gray-700">{t('login.email')}</span>}
                required
                autoFocus
                autoComplete="email"
                inputProps={{
                  prefix: <UserOutlined className="text-gray-400" />,
                  placeholder: t('login.email'),
                }}
                className="mb-4"
              />

              <MobileFormField
                name="password"
                control={form.control}
                type="password"
                label={<span className="text-sm font-medium text-gray-700">{t('login.password')}</span>}
                required
                inputProps={{
                  prefix: <LockOutlined className="text-gray-400" />,
                  placeholder: t('login.password'),
                }}
                className="mb-4"
              />
            </>
          ) : (
            <>
              <FormField
                name="email"
                control={form.control}
                type="email"
                label={<span className="text-sm font-medium text-gray-700">{t('login.email')}</span>}
                required
                inputProps={{
                  prefix: <UserOutlined className="text-gray-400" />,
                  placeholder: t('login.email'),
                  size: "large",
                  autoComplete: "email",
                  className: "rounded-lg border-gray-300 focus:border-blue-500 transition-colors",
                }}
                className="mb-4"
              />

              <FormField
                name="password"
                control={form.control}
                type="password"
                label={<span className="text-sm font-medium text-gray-700">{t('login.password')}</span>}
                required
                inputProps={{
                  prefix: <LockOutlined className="text-gray-400" />,
                  placeholder: t('login.password'),
                  size: "large",
                  autoComplete: "current-password",
                  className: "rounded-lg border-gray-300 focus:border-blue-500 transition-colors",
                }}
                className="mb-4"
              />
            </>
          )}

          <div className="flex justify-end mb-6">
            <button 
              type="button"
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors bg-transparent border-0 p-0 underline cursor-pointer"
              onClick={() => {
                // TODO: Implement forgot password functionality
              }}
            >
              {t('login.forgotPassword', 'Passwort vergessen?')}
            </button>
          </div>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading || form.isSubmitting}
              className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700 border-0 font-medium text-base transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading || form.isSubmitting ? t('login.signingIn') : t('login.submit')}
            </Button>
          </Form.Item>

          <div className="text-center mt-4">
            <Text type="secondary" className="text-xs">
              {t('login.noAccount')} {t('login.signUp')}
            </Text>
          </div>
        </Form>
      </div>
    </FormErrorBoundary>
  );
};