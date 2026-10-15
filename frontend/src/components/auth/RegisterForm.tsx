import React from 'react';
import { Form, Input, Button, Alert, Typography, Progress } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '../../types/validation.schemas';
import { z } from 'zod';
import { useMobileDetection } from '../../hooks';
import { MobileFormField } from '../forms';

type RegisterFormData = z.infer<typeof registerSchema>;

const { Title, Text } = Typography;

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

// Password strength indicator
const getPasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 25;
  return strength;
};

const getPasswordStrengthColor = (strength: number): string => {
  if (strength < 50) return '#ff4d4f';
  if (strength < 75) return '#faad14';
  return '#52c41a';
};

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  loading = false,
  error = null,
}) => {
  const { isMobile } = useMobileDetection();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');
  const passwordStrength = password ? getPasswordStrength(password) : 0;

  const handleFormSubmit = async (data: RegisterFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      // Error handling is managed by parent component
      console.error('Registration form submission error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Title level={4} className="mb-2 text-gray-800">
          Create Account ✨
        </Title>
        <Text type="secondary" className="text-sm">
          Join us to start organizing your tasks efficiently
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
        onFinish={handleSubmit(handleFormSubmit)}
        autoComplete="off"
        className="space-y-4"
      >
        {isMobile ? (
          <>
            <MobileFormField
              name="name"
              control={control}
              type="text"
              label={<span className="text-sm font-medium text-gray-700">Full Name</span>}
              required
              autoFocus
              autoComplete="name"
              inputProps={{
                prefix: <UserOutlined className="text-gray-400" />,
                placeholder: "Enter your full name",
              }}
              className="mb-4"
            />

            <MobileFormField
              name="email"
              control={control}
              type="email"
              label={<span className="text-sm font-medium text-gray-700">Email</span>}
              required
              autoComplete="email"
              inputProps={{
                prefix: <MailOutlined className="text-gray-400" />,
                placeholder: "Enter your email",
              }}
              className="mb-4"
            />

            <MobileFormField
              name="password"
              control={control}
              type="password"
              label={<span className="text-sm font-medium text-gray-700">Password</span>}
              required
              showPasswordStrength
              inputProps={{
                prefix: <LockOutlined className="text-gray-400" />,
                placeholder: "Create a strong password",
              }}
              className="mb-4"
            />
            {password && (
              <div className="mt-2 mb-4">
                <Text type="secondary" className="text-xs">
                  Password strength:
                </Text>
                <Progress
                  percent={passwordStrength}
                  size="small"
                  strokeColor={getPasswordStrengthColor(passwordStrength)}
                  showInfo={false}
                  className="mt-1"
                />
              </div>
            )}
          </>
        ) : (
          <>
            <Form.Item
              label={<span className="text-sm font-medium text-gray-700">Full Name</span>}
              validateStatus={errors.name ? 'error' : ''}
              help={errors.name?.message}
              className="mb-4"
            >
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    prefix={<UserOutlined className="text-gray-400" />}
                    placeholder="Enter your full name"
                    size="large"
                    autoComplete="name"
                    className="rounded-lg border-gray-300 focus:border-blue-500 transition-colors"
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-sm font-medium text-gray-700">Email</span>}
              validateStatus={errors.email ? 'error' : ''}
              help={errors.email?.message}
              className="mb-4"
            >
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    prefix={<MailOutlined className="text-gray-400" />}
                    placeholder="Enter your email"
                    size="large"
                    type="email"
                    autoComplete="email"
                    className="rounded-lg border-gray-300 focus:border-blue-500 transition-colors"
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-sm font-medium text-gray-700">Password</span>}
              validateStatus={errors.password ? 'error' : ''}
              help={errors.password?.message}
              className="mb-4"
            >
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <Input.Password
                    {...field}
                    prefix={<LockOutlined className="text-gray-400" />}
                    placeholder="Create a strong password"
                    size="large"
                    autoComplete="new-password"
                    className="rounded-lg border-gray-300 focus:border-blue-500 transition-colors"
                  />
                )}
              />
              {password && (
                <div className="mt-2">
                  <Text type="secondary" className="text-xs">
                    Password strength:
                  </Text>
                  <Progress
                    percent={passwordStrength}
                    size="small"
                    strokeColor={getPasswordStrengthColor(passwordStrength)}
                    showInfo={false}
                    className="mt-1"
                  />
                </div>
              )}
            </Form.Item>
          </>
        )}

        {isMobile ? (
          <MobileFormField
            name="confirmPassword"
            control={control}
            type="password"
            label={<span className="text-sm font-medium text-gray-700">Confirm Password</span>}
            required
            inputProps={{
              prefix: <LockOutlined className="text-gray-400" />,
              placeholder: "Confirm your password",
            }}
            className="mb-6"
          />
        ) : (
          <Form.Item
            label={<span className="text-sm font-medium text-gray-700">Confirm Password</span>}
            validateStatus={errors.confirmPassword ? 'error' : ''}
            help={errors.confirmPassword?.message}
            className="mb-6"
          >
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="Confirm your password"
                  size="large"
                  autoComplete="new-password"
                  className="rounded-lg border-gray-300 focus:border-blue-500 transition-colors"
                />
              )}
            />
          </Form.Item>
        )}

        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading || isSubmitting}
            className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700 border-0 font-medium text-base transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading || isSubmitting ? 'Creating Account...' : 'Create Account'}
          </Button>
        </Form.Item>

        <div className="text-center mt-4">
          <Text type="secondary" className="text-xs">
            Already have an account? Switch to the Sign In tab above
          </Text>
        </div>
      </Form>
    </div>
  );
};