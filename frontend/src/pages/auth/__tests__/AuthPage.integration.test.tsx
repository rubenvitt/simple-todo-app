import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../../test'
import { AuthPage } from '../AuthPage'
import { user, fillForm, submitForm } from '../../../test/helpers'
import { server, useHandler } from '../../../test/mocks'
import { http, HttpResponse } from 'msw'

// Mock router navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('AuthPage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Login Flow', () => {
    it('should complete full login flow successfully', async () => {
      render(<AuthPage />, {
        isAuthenticated: false,
        user: null
      })

      // Should show login form by default
      expect(screen.getByText(/sign in/i)).toBeInTheDocument()

      // Fill and submit login form
      await fillForm({
        email: 'test@example.com',
        password: 'password'
      })

      await submitForm(/sign in/i)

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
      })

      // Should navigate to dashboard after successful login
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      }, { timeout: 5000 })
    })

    it('should handle login error gracefully', async () => {
      // Override handler to return error
      useHandler(
        http.post('*/auth/login', () => {
          return HttpResponse.json(
            { message: 'Invalid credentials' },
            { status: 401 }
          )
        })
      )

      render(<AuthPage />, {
        isAuthenticated: false,
        user: null
      })

      await fillForm({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      })

      await submitForm(/sign in/i)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should handle network errors during login', async () => {
      // Override handler to simulate network error
      useHandler(
        http.post('*/auth/login', () => {
          return HttpResponse.error()
        })
      )

      render(<AuthPage />, {
        isAuthenticated: false,
        user: null
      })

      await fillForm({
        email: 'test@example.com',
        password: 'password'
      })

      await submitForm(/sign in/i)

      // Should show network error message
      await waitFor(() => {
        expect(screen.getByText(/network error|something went wrong/i)).toBeInTheDocument()
      })
    })
  })

  describe('Registration Flow', () => {
    it('should complete full registration flow successfully', async () => {
      render(<AuthPage />, {
        isAuthenticated: false,
        user: null
      })

      // Switch to register tab
      const registerTab = screen.getByRole('tab', { name: /register|sign up/i })
      await user.click(registerTab)

      // Should show registration form
      expect(screen.getByText(/create account/i)).toBeInTheDocument()

      // Fill and submit registration form
      await fillForm({
        'full name': 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        'confirm password': 'Password123!'
      })

      await submitForm(/create account/i)

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument()
      })

      // Should navigate to dashboard after successful registration
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      }, { timeout: 5000 })
    })

    it('should handle registration validation errors', async () => {
      // Override handler to return validation errors
      useHandler(
        http.post('*/auth/register', () => {
          return HttpResponse.json(
            { 
              message: 'Validation failed',
              errors: {
                email: 'Email already exists'
              }
            },
            { status: 400 }
          )
        })
      )

      render(<AuthPage />, {
        isAuthenticated: false,
        user: null
      })

      // Switch to register tab
      const registerTab = screen.getByRole('tab', { name: /register|sign up/i })
      await user.click(registerTab)

      await fillForm({
        'full name': 'John Doe',
        email: 'existing@example.com',
        password: 'Password123!',
        'confirm password': 'Password123!'
      })

      await submitForm(/create account/i)

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
      })

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Tab Navigation', () => {
    it('should switch between login and register tabs', async () => {
      render(<AuthPage />, {
        isAuthenticated: false,
        user: null
      })

      // Should start with login tab active
      expect(screen.getByText(/sign in/i)).toBeInTheDocument()
      expect(screen.queryByText(/create account/i)).not.toBeInTheDocument()

      // Switch to register tab
      const registerTab = screen.getByRole('tab', { name: /register|sign up/i })
      await user.click(registerTab)

      // Should show register form
      expect(screen.getByText(/create account/i)).toBeInTheDocument()
      expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument()

      // Switch back to login tab
      const loginTab = screen.getByRole('tab', { name: /login|sign in/i })
      await user.click(loginTab)

      // Should show login form again
      expect(screen.getByText(/sign in/i)).toBeInTheDocument()
      expect(screen.queryByText(/create account/i)).not.toBeInTheDocument()
    })

    it('should preserve form data when switching tabs', async () => {
      render(<AuthPage />, {
        isAuthenticated: false,
        user: null
      })

      // Fill login form
      await fillForm({
        email: 'test@example.com',
        password: 'password'
      })

      // Switch to register tab
      const registerTab = screen.getByRole('tab', { name: /register|sign up/i })
      await user.click(registerTab)

      // Switch back to login tab
      const loginTab = screen.getByRole('tab', { name: /login|sign in/i })
      await user.click(loginTab)

      // Form data should be preserved
      const emailField = screen.getByLabelText(/email/i)
      const passwordField = screen.getByLabelText(/password/i)
      
      expect(emailField).toHaveValue('test@example.com')
      expect(passwordField).toHaveValue('password')
    })
  })

  describe('Authentication State', () => {
    it('should redirect authenticated users', async () => {
      render(<AuthPage />, {
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' }
      })

      // Should redirect to dashboard
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should handle authentication state changes', async () => {
      const { rerender } = render(<AuthPage />, {
        isAuthenticated: false,
        user: null
      })

      // Should show auth forms
      expect(screen.getByText(/sign in/i)).toBeInTheDocument()

      // Simulate user becoming authenticated
      rerender(<AuthPage />, {
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' }
      })

      // Should redirect
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('Error Recovery', () => {
    it('should allow retry after login error', async () => {
      // First request fails
      useHandler(
        http.post('*/auth/login', () => {
          return HttpResponse.json(
            { message: 'Server error' },
            { status: 500 }
          )
        })
      )

      render(<AuthPage />, {
        isAuthenticated: false,
        user: null
      })

      await fillForm({
        email: 'test@example.com',
        password: 'password'
      })

      await submitForm(/sign in/i)

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument()
      })

      // Reset handler to success
      server.resetHandlers()

      // Retry login
      await submitForm(/sign in/i)

      // Should succeed this time
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should clear errors when switching tabs', async () => {
      // Set up login error
      useHandler(
        http.post('*/auth/login', () => {
          return HttpResponse.json(
            { message: 'Login failed' },
            { status: 401 }
          )
        })
      )

      render(<AuthPage />, {
        isAuthenticated: false,
        user: null
      })

      await fillForm({
        email: 'test@example.com',
        password: 'wrongpassword'
      })

      await submitForm(/sign in/i)

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument()
      })

      // Switch to register tab
      const registerTab = screen.getByRole('tab', { name: /register|sign up/i })
      await user.click(registerTab)

      // Error should be cleared
      expect(screen.queryByText(/login failed/i)).not.toBeInTheDocument()
    })
  })

  describe('Form Validation Integration', () => {
    it('should show client-side validation errors', async () => {
      render(<AuthPage />, {
        isAuthenticated: false,
        user: null
      })

      // Submit empty form
      await submitForm(/sign in/i)

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('should validate email format', async () => {
      render(<AuthPage />, {
        isAuthenticated: false,
        user: null
      })

      await fillForm({
        email: 'invalid-email',
        password: 'password'
      })

      await submitForm(/sign in/i)

      // Should show email format error
      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument()
      })
    })
  })
})