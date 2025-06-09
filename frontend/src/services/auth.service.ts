import axios from 'axios';
// Use local types as fallback
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types';
import { tokenStorage } from './token-storage.service';

interface UpdateProfileData {
  name?: string;
  email?: string;
  avatar?: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth endpoints are available via API prefix
const authApi = axios.create({
  baseURL: '/api/auth',
  withCredentials: true, // For httpOnly cookies
});

export class AuthService {
  /**
   * Login user with email and password
   */
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await authApi.post<AuthResponse>('/login', credentials);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Login failed');
      }
      throw error;
    }
  }

  /**
   * Register new user
   */
  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await authApi.post<AuthResponse>('/register', userData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || error.response?.statusText || 'Registration failed');
      }
      throw error;
    }
  }

  /**
   * Logout user and clear tokens
   */
  static async logout(): Promise<void> {
    try {
      await authApi.post('/logout');
    } catch (error) {
      // Even if logout fails, we should clear local state
      console.warn('Logout request failed:', error);
    }
  }

  /**
   * Refresh access token using stored refresh token
   */
  static async refreshToken(): Promise<AuthResponse> {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authApi.post<AuthResponse>('/refresh', {
        refresh_token: refreshToken,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Token refresh failed');
      }
      throw error;
    }
  }

  /**
   * Validate current access token by calling the profile endpoint
   */
  static async validateToken(token: string): Promise<boolean> {
    try {
      const response = await authApi.get('/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<void> {
    try {
      await authApi.post('/password-reset/request', { email });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Password reset request failed');
      }
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await authApi.post('/password-reset/confirm', {
        token,
        password: newPassword,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Password reset failed');
      }
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    try {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await axios.put<UserProfile>('/api/users/profile', data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Profile update failed');
      }
      throw error;
    }
  }

  /**
   * Change user password
   */
  static async changePassword(data: ChangePasswordData): Promise<void> {
    try {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      await axios.put('/api/users/change-password', data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Password change failed');
      }
      throw error;
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(): Promise<void> {
    try {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      await axios.delete('/api/users/account', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Account deletion failed');
      }
      throw error;
    }
  }
}