import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoginForm } from '../LoginForm'

// Mock the hooks and components that are causing issues
vi.mock('../../../hooks', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key
  }),
  useFormConfig: () => ({
    control: {},
    createSubmitHandler: (handler: any) => handler,
    setError: vi.fn(),
    isSubmitting: false,
  })
}))

// Mock Ant Design components
vi.mock('antd', () => ({
  Form: ({ children, onFinish, ...props }: any) => (
    <form {...props} onSubmit={onFinish} data-testid="login-form">
      {children}
    </form>
  ),
  'Form.Item': ({ children }: any) => <div>{children}</div>,
  Button: ({ children, loading, ...props }: any) => (
    <button {...props} disabled={loading}>
      {loading ? 'Loading...' : children}
    </button>
  ),
  Alert: ({ message }: any) => <div role="alert">{message}</div>,
  Typography: {
    Title: ({ children }: any) => <h1>{children}</h1>,
    Text: ({ children }: any) => <span>{children}</span>,
  }
}))

// Mock form components
vi.mock('../../forms', () => ({
  SimpleFormField: ({ name, inputProps }: any) => (
    <input 
      name={name}
      aria-label={name}
      placeholder={inputProps?.placeholder}
    />
  ),
  FormErrorBoundary: ({ children }: any) => <div>{children}</div>
}))

describe('LoginForm (Simple)', () => {
  const mockOnSubmit = vi.fn()
  
  const defaultProps = {
    onSubmit: mockOnSubmit,
    loading: false,
    error: null,
  }

  it('should render without crashing', () => {
    render(<LoginForm {...defaultProps} />)
    
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<LoginForm {...defaultProps} loading={true} />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display error message', () => {
    render(<LoginForm {...defaultProps} error="Test error" />)
    
    expect(screen.getByRole('alert')).toHaveTextContent('Test error')
  })

  it('should render form fields', () => {
    render(<LoginForm {...defaultProps} />)
    
    expect(screen.getByLabelText('email')).toBeInTheDocument()
    expect(screen.getByLabelText('password')).toBeInTheDocument()
  })
})