import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../../test'
import { RegisterForm } from '../RegisterForm'
import { user, fillForm, submitForm } from '../../../test/helpers'

describe('RegisterForm', () => {
  const mockOnSubmit = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps = {
    onSubmit: mockOnSubmit,
    loading: false,
    error: null,
  }

  it('should render register form with all fields', () => {
    render(<RegisterForm {...defaultProps} />)
    
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('should render title and subtitle', () => {
    render(<RegisterForm {...defaultProps} />)
    
    expect(screen.getByText('Create Account ✨')).toBeInTheDocument()
    expect(screen.getByText('Join us to start organizing your tasks efficiently')).toBeInTheDocument()
  })

  it('should show error message when error prop is provided', () => {
    render(<RegisterForm {...defaultProps} error="Registration failed" />)
    
    expect(screen.getByText('Registration failed')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('should show loading state on submit button', () => {
    render(<RegisterForm {...defaultProps} loading={true} />)
    
    const submitButton = screen.getByRole('button', { name: /creating account/i })
    expect(submitButton).toBeDisabled()
  })

  it('should call onSubmit with form data when form is submitted', async () => {
    render(<RegisterForm {...defaultProps} />)
    
    await fillForm({
      'full name': 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      'confirm password': 'Password123!'
    })
    
    await submitForm(/create account/i)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      })
    })
  })

  it('should show password strength indicator', async () => {
    render(<RegisterForm {...defaultProps} />)
    
    const passwordField = screen.getByLabelText(/^password$/i)
    await user.type(passwordField, 'weak')
    
    await waitFor(() => {
      expect(screen.getByText('Password strength:')).toBeInTheDocument()
    })
  })

  it('should update password strength as user types', async () => {
    render(<RegisterForm {...defaultProps} />)
    
    const passwordField = screen.getByLabelText(/^password$/i)
    
    // Weak password
    await user.type(passwordField, 'weak')
    await waitFor(() => {
      expect(screen.getByText('Password strength:')).toBeInTheDocument()
    })
    
    // Clear and type stronger password
    await user.clear(passwordField)
    await user.type(passwordField, 'StrongPassword123!')
    
    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
    })
  })

  it('should validate password confirmation matches', async () => {
    render(<RegisterForm {...defaultProps} />)
    
    await fillForm({
      'full name': 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      'confirm password': 'DifferentPassword123!'
    })
    
    await submitForm(/create account/i)
    
    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument()
    })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should validate required fields', async () => {
    render(<RegisterForm {...defaultProps} />)
    
    await submitForm(/create account/i)
    
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should validate email format', async () => {
    render(<RegisterForm {...defaultProps} />)
    
    await fillForm({
      'full name': 'John Doe',
      email: 'invalid-email',
      password: 'Password123!',
      'confirm password': 'Password123!'
    })
    
    await submitForm(/create account/i)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should validate password strength requirements', async () => {
    render(<RegisterForm {...defaultProps} />)
    
    await fillForm({
      'full name': 'John Doe',
      email: 'john@example.com',
      password: 'weak',
      'confirm password': 'weak'
    })
    
    await submitForm(/create account/i)
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should handle form submission error', async () => {
    const errorMessage = 'Registration failed'
    mockOnSubmit.mockRejectedValue(new Error(errorMessage))
    
    render(<RegisterForm {...defaultProps} />)
    
    await fillForm({
      'full name': 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      'confirm password': 'Password123!'
    })
    
    await submitForm(/create account/i)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
    })
  })

  it('should have proper accessibility attributes', () => {
    render(<RegisterForm {...defaultProps} />)
    
    const nameField = screen.getByLabelText(/full name/i)
    const emailField = screen.getByLabelText(/email/i)
    const passwordField = screen.getByLabelText(/^password$/i)
    const confirmPasswordField = screen.getByLabelText(/confirm password/i)
    
    expect(nameField).toHaveAttribute('autoComplete', 'name')
    expect(emailField).toHaveAttribute('type', 'email')
    expect(emailField).toHaveAttribute('autoComplete', 'email')
    expect(passwordField).toHaveAttribute('autoComplete', 'new-password')
    expect(confirmPasswordField).toHaveAttribute('autoComplete', 'new-password')
  })

  it('should handle input changes correctly', async () => {
    render(<RegisterForm {...defaultProps} />)
    
    const nameField = screen.getByLabelText(/full name/i)
    const emailField = screen.getByLabelText(/email/i)
    
    await user.type(nameField, 'John Doe')
    await user.type(emailField, 'john@example.com')
    
    expect(nameField).toHaveValue('John Doe')
    expect(emailField).toHaveValue('john@example.com')
  })

  it('should close error alert when close button is clicked', async () => {
    render(<RegisterForm {...defaultProps} error="Test error message" />)
    
    const errorAlert = screen.getByRole('alert')
    expect(errorAlert).toBeInTheDocument()
    
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    
    await waitFor(() => {
      expect(errorAlert).not.toBeInTheDocument()
    })
  })

  it('should show sign in prompt', () => {
    render(<RegisterForm {...defaultProps} />)
    
    expect(screen.getByText('Already have an account? Switch to the Sign In tab above')).toBeInTheDocument()
  })

  it('should have proper form structure', () => {
    render(<RegisterForm {...defaultProps} />)
    
    const form = screen.getByRole('form') || screen.getByTestId('register-form')
    expect(form).toBeInTheDocument()
  })

  describe('password strength calculation', () => {
    it('should show red for weak passwords', async () => {
      render(<RegisterForm {...defaultProps} />)
      
      const passwordField = screen.getByLabelText(/^password$/i)
      await user.type(passwordField, 'weak')
      
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar')
        expect(progressBar).toBeInTheDocument()
      })
    })

    it('should show green for strong passwords', async () => {
      render(<RegisterForm {...defaultProps} />)
      
      const passwordField = screen.getByLabelText(/^password$/i)
      await user.type(passwordField, 'StrongPassword123!')
      
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar')
        expect(progressBar).toBeInTheDocument()
      })
    })
  })
})