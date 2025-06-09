import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../../test'
import { LoginForm } from '../LoginForm'
import { user, fillForm, submitForm } from '../../../test/helpers'

// Mock the hooks
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

describe('LoginForm', () => {
  const mockOnSubmit = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps = {
    onSubmit: mockOnSubmit,
    loading: false,
    error: null,
  }

  it('should render login form with all fields', () => {
    render(<LoginForm {...defaultProps} />)
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit|sign in/i })).toBeInTheDocument()
  })

  it('should render title and subtitle', () => {
    render(<LoginForm {...defaultProps} />)
    
    expect(screen.getByText('login.title')).toBeInTheDocument()
    expect(screen.getByText('login.subtitle')).toBeInTheDocument()
  })

  it('should show error message when error prop is provided', () => {
    render(<LoginForm {...defaultProps} error="Invalid credentials" />)
    
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('should show loading state on submit button', () => {
    render(<LoginForm {...defaultProps} loading={true} />)
    
    const submitButton = screen.getByRole('button', { name: /sign|submit/i })
    expect(submitButton).toBeDisabled()
  })

  it('should call onSubmit with form data when form is submitted', async () => {
    render(<LoginForm {...defaultProps} />)
    
    await fillForm({
      email: 'test@example.com',
      password: 'password123'
    })
    
    await submitForm(/submit|sign in/i)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })
  })

  it('should handle form submission error', async () => {
    const errorMessage = 'Login failed'
    mockOnSubmit.mockRejectedValue(new Error(errorMessage))
    
    render(<LoginForm {...defaultProps} />)
    
    await fillForm({
      email: 'test@example.com',
      password: 'wrongpassword'
    })
    
    await submitForm(/submit|sign in/i)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
    })
  })

  it('should display forgot password link', () => {
    render(<LoginForm {...defaultProps} />)
    
    expect(screen.getByText('login.forgotPassword')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'login.forgotPassword' })).toBeInTheDocument()
  })

  it('should display sign up link', () => {
    render(<LoginForm {...defaultProps} />)
    
    expect(screen.getByText('login.noAccount')).toBeInTheDocument()
    expect(screen.getByText('login.signUp')).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<LoginForm {...defaultProps} />)
    
    const emailField = screen.getByLabelText(/email/i)
    const passwordField = screen.getByLabelText(/password/i)
    
    expect(emailField).toHaveAttribute('type', 'email')
    expect(emailField).toHaveAttribute('autoComplete', 'email')
    expect(passwordField).toHaveAttribute('type', 'password')
    expect(passwordField).toHaveAttribute('autoComplete', 'current-password')
  })

  it('should handle email input change', async () => {
    render(<LoginForm {...defaultProps} />)
    
    const emailField = screen.getByLabelText(/email/i)
    
    await user.type(emailField, 'test@example.com')
    
    expect(emailField).toHaveValue('test@example.com')
  })

  it('should handle password input change', async () => {
    render(<LoginForm {...defaultProps} />)
    
    const passwordField = screen.getByLabelText(/password/i)
    
    await user.type(passwordField, 'password123')
    
    expect(passwordField).toHaveValue('password123')
  })

  it('should prevent form submission when fields are empty', async () => {
    render(<LoginForm {...defaultProps} />)
    
    await submitForm(/submit|sign in/i)
    
    // Form validation should prevent submission
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should show validation errors for invalid email', async () => {
    render(<LoginForm {...defaultProps} />)
    
    await fillForm({
      email: 'invalid-email',
      password: 'password123'
    })
    
    await submitForm(/submit|sign in/i)
    
    // Should show email validation error
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  it('should show validation errors for empty password', async () => {
    render(<LoginForm {...defaultProps} />)
    
    await fillForm({
      email: 'test@example.com',
      password: ''
    })
    
    await submitForm(/submit|sign in/i)
    
    // Should show password validation error
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('should close error alert when close button is clicked', async () => {
    render(<LoginForm {...defaultProps} error="Test error message" />)
    
    const errorAlert = screen.getByRole('alert')
    expect(errorAlert).toBeInTheDocument()
    
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    
    await waitFor(() => {
      expect(errorAlert).not.toBeInTheDocument()
    })
  })

  it('should have proper form structure and layout', () => {
    render(<LoginForm {...defaultProps} />)
    
    const form = screen.getByRole('form') || screen.getByTestId('login-form')
    expect(form).toBeInTheDocument()
    
    // Check if form has vertical layout
    expect(form).toHaveAttribute('layout', 'vertical')
  })
})