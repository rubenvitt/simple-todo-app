import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { AuthService } from '../../services/auth.service'
import { tokenStorage } from '../../services/token-storage.service'
import { createMockUser } from '../../test/factories'
import { ReactNode } from 'react'

// Mock the services
vi.mock('../../services/auth.service')
vi.mock('../../services/token-storage.service')

const mockAuthService = vi.mocked(AuthService)
const mockTokenStorage = vi.mocked(tokenStorage)

// Helper function to render hook with provider
const renderAuthHook = () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )
  return renderHook(() => useAuth(), { wrapper })
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default mock behaviors
    mockTokenStorage.isAuthenticated.mockReturnValue(false)
    mockTokenStorage.getUser.mockReturnValue(null)
    mockTokenStorage.getAccessToken.mockReturnValue(null)
    mockTokenStorage.initializeFromLocalStorage.mockImplementation(() => {})
    mockTokenStorage.setAccessToken.mockImplementation(() => {})
    mockTokenStorage.setRefreshToken.mockImplementation(() => {})
    mockTokenStorage.setUser.mockImplementation(() => {})
    mockTokenStorage.persistToLocalStorage.mockImplementation(() => {})
    mockTokenStorage.clear.mockImplementation(() => {})
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderAuthHook()
      
      expect(result.current.isLoading).toBe(true)
      expect(result.current.user).toBe(null)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should initialize from token storage when valid token exists', async () => {
      const mockUser = createMockUser()
      mockTokenStorage.getUser.mockReturnValue(mockUser)
      mockTokenStorage.getAccessToken.mockReturnValue('valid-token')
      mockAuthService.validateToken.mockResolvedValue(true)

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-token')
    })

    it('should attempt token refresh when access token is invalid', async () => {
      const mockUser = createMockUser()
      mockTokenStorage.getUser.mockReturnValue(mockUser)
      mockTokenStorage.getAccessToken.mockReturnValue('invalid-token')
      mockAuthService.validateToken.mockResolvedValue(false)
      mockAuthService.refreshToken.mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        user: mockUser
      })

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockAuthService.refreshToken).toHaveBeenCalled()
      expect(mockTokenStorage.setAccessToken).toHaveBeenCalledWith('new-access-token')
      expect(mockTokenStorage.setRefreshToken).toHaveBeenCalledWith('new-refresh-token')
      expect(result.current.user).toEqual(mockUser)
    })

    it('should clear storage when token refresh fails', async () => {
      const mockUser = createMockUser()
      mockTokenStorage.getUser.mockReturnValue(mockUser)
      mockTokenStorage.getAccessToken.mockReturnValue('invalid-token')
      mockAuthService.validateToken.mockResolvedValue(false)
      mockAuthService.refreshToken.mockRejectedValue(new Error('Refresh failed'))

      const { result } = renderAuthHook()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockTokenStorage.clear).toHaveBeenCalled()
      expect(result.current.user).toBe(null)
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('login', () => {
    it('should successfully login user', async () => {
      const { result } = renderAuthHook()
      const mockUser = createMockUser()
      const loginData = { email: 'test@example.com', password: 'password' }
      const loginResponse = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: mockUser
      }

      mockAuthService.login.mockResolvedValue(loginResponse)

      await act(async () => {
        await result.current.login(loginData)
      })

      expect(mockAuthService.login).toHaveBeenCalledWith(loginData)
      expect(mockTokenStorage.setAccessToken).toHaveBeenCalledWith('access-token')
      expect(mockTokenStorage.setRefreshToken).toHaveBeenCalledWith('refresh-token')
      expect(mockTokenStorage.setUser).toHaveBeenCalledWith(mockUser)
      expect(mockTokenStorage.persistToLocalStorage).toHaveBeenCalled()
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.error).toBe(null)
    })

    it('should handle login error', async () => {
      const { result } = renderAuthHook()
      const loginData = { email: 'test@example.com', password: 'wrong-password' }
      const error = new Error('Invalid credentials')

      mockAuthService.login.mockRejectedValue(error)

      await act(async () => {
        try {
          await result.current.login(loginData)
        } catch (err) {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Invalid credentials')
      expect(result.current.user).toBe(null)
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should set loading state during login', async () => {
      const { result } = renderAuthHook()
      const mockUser = createMockUser()
      const loginData = { email: 'test@example.com', password: 'password' }

      mockAuthService.login.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          access_token: 'token',
          refresh_token: 'refresh-token',
          user: mockUser
        }), 100))
      )

      const loginPromise = act(async () => {
        await result.current.login(loginData)
      })

      // Should be loading during async operation
      expect(result.current.isLoading).toBe(true)

      await loginPromise

      // Should not be loading after completion
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('register', () => {
    it('should successfully register user', async () => {
      const { result } = renderAuthHook()
      const mockUser = createMockUser()
      const registerData = {
        email: 'test@example.com',
        password: 'password',
        confirmPassword: 'password',
        name: 'Test User'
      }
      const registerResponse = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: mockUser
      }

      mockAuthService.register.mockResolvedValue(registerResponse)

      await act(async () => {
        await result.current.register(registerData)
      })

      // Should call register without confirmPassword
      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        name: 'Test User'
      })
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.error).toBe(null)
    })

    it('should handle registration error', async () => {
      const { result } = renderAuthHook()
      const registerData = {
        email: 'invalid@email',
        password: 'weak',
        confirmPassword: 'weak',
        name: 'Test User'
      }
      const error = new Error('Validation failed')

      mockAuthService.register.mockRejectedValue(error)

      await act(async () => {
        try {
          await result.current.register(registerData)
        } catch (err) {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Validation failed')
      expect(result.current.user).toBe(null)
    })
  })

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const { result } = renderAuthHook()
      const mockUser = createMockUser()

      // Setup initial authenticated state
      await act(async () => {
        result.current.user = mockUser
      })

      mockAuthService.logout.mockResolvedValue(undefined)

      await act(async () => {
        await result.current.logout()
      })

      expect(mockAuthService.logout).toHaveBeenCalled()
      expect(mockTokenStorage.clear).toHaveBeenCalled()
      expect(result.current.user).toBe(null)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should clear local storage even if logout API fails', async () => {
      const { result } = renderAuthHook()
      
      mockAuthService.logout.mockRejectedValue(new Error('Network error'))

      await act(async () => {
        await result.current.logout()
      })

      expect(mockTokenStorage.clear).toHaveBeenCalled()
      expect(result.current.user).toBe(null)
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('updateProfile', () => {
    it('should successfully update user profile', async () => {
      const { result } = renderAuthHook()
      const mockUser = createMockUser()
      const updateData = { name: 'Updated Name' }
      const updatedUser = { ...mockUser, name: 'Updated Name' }

      mockAuthService.updateProfile.mockResolvedValue(updatedUser)

      await act(async () => {
        await result.current.updateProfile(updateData)
      })

      expect(mockAuthService.updateProfile).toHaveBeenCalledWith(updateData)
      expect(mockTokenStorage.setUser).toHaveBeenCalledWith(updatedUser)
      expect(mockTokenStorage.persistToLocalStorage).toHaveBeenCalled()
      expect(result.current.user).toEqual(updatedUser)
    })

    it('should handle profile update error', async () => {
      const { result } = renderAuthHook()
      const updateData = { name: 'Updated Name' }
      const error = new Error('Update failed')

      mockAuthService.updateProfile.mockRejectedValue(error)

      await act(async () => {
        try {
          await result.current.updateProfile(updateData)
        } catch (err) {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Update failed')
    })
  })

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const { result } = renderAuthHook()
      const passwordData = {
        currentPassword: 'old-password',
        newPassword: 'new-password'
      }

      mockAuthService.changePassword.mockResolvedValue(undefined)

      await act(async () => {
        await result.current.changePassword(passwordData)
      })

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(passwordData)
      expect(result.current.error).toBe(null)
    })

    it('should handle password change error', async () => {
      const { result } = renderAuthHook()
      const passwordData = {
        currentPassword: 'wrong-password',
        newPassword: 'new-password'
      }
      const error = new Error('Current password is incorrect')

      mockAuthService.changePassword.mockRejectedValue(error)

      await act(async () => {
        try {
          await result.current.changePassword(passwordData)
        } catch (err) {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Current password is incorrect')
    })
  })

  describe('deleteAccount', () => {
    it('should successfully delete account', async () => {
      const { result } = renderAuthHook()

      mockAuthService.deleteAccount.mockResolvedValue(undefined)

      await act(async () => {
        await result.current.deleteAccount()
      })

      expect(mockAuthService.deleteAccount).toHaveBeenCalled()
      expect(mockTokenStorage.clear).toHaveBeenCalled()
      expect(result.current.user).toBe(null)
    })

    it('should handle account deletion error', async () => {
      const { result } = renderAuthHook()
      const error = new Error('Deletion failed')

      mockAuthService.deleteAccount.mockRejectedValue(error)

      await act(async () => {
        try {
          await result.current.deleteAccount()
        } catch (err) {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Deletion failed')
    })
  })

  describe('clearError', () => {
    it('should clear error state', async () => {
      const { result } = renderAuthHook()

      // Set an error
      await act(async () => {
        try {
          mockAuthService.login.mockRejectedValue(new Error('Test error'))
          await result.current.login({ email: 'test@example.com', password: 'wrong' })
        } catch (err) {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Test error')

      // Clear the error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth must be used within an AuthProvider')
    })
  })
})