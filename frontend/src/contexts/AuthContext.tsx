import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthService } from '../services/auth.service';
import { tokenStorage } from '../services/token-storage.service';
import { loginSchema, registerSchema } from '../types/validation.schemas';
import { z } from 'zod';

// Type inference from schemas
type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface UpdateProfileData {
  name?: string;
  email?: string;
  avatar?: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginFormData) => Promise<void>;
  register: (userData: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user && tokenStorage.isAuthenticated();

  // Debug log for authentication state
  React.useEffect(() => {
    console.log('🔍 Auth state changed:', { 
      user: !!user, 
      tokenAuthenticated: tokenStorage.isAuthenticated(), 
      isAuthenticated,
      isLoading 
    });
  }, [user, isAuthenticated, isLoading]);

  // Initialize auth state on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Initialize from localStorage (fallback for development)
        tokenStorage.initializeFromLocalStorage();
        
        const storedUser = tokenStorage.getUser();
        const storedToken = tokenStorage.getAccessToken();
        
        if (storedUser && storedToken) {
          // Validate token with server
          const isValid = await AuthService.validateToken(storedToken);
          
          if (isValid) {
            setUser(storedUser);
          } else {
            // Token is invalid, try to refresh
            console.log('🔄 Access token invalid, attempting refresh...');
            try {
              const refreshResponse = await AuthService.refreshToken();
              const { access_token, refresh_token, user: userData } = refreshResponse;
              
              tokenStorage.setAccessToken(access_token);
              if (refresh_token) {
                tokenStorage.setRefreshToken(refresh_token);
              }
              tokenStorage.setUser(userData);
              tokenStorage.persistToLocalStorage();
              
              setUser(userData);
              console.log('✅ Token refreshed successfully');
            } catch (refreshError) {
              console.error('❌ Token refresh failed:', refreshError);
              tokenStorage.clear();
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        tokenStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Listen for logout events (from token refresh failures)
  useEffect(() => {
    const handleLogoutEvent = () => {
      setUser(null);
      setError('Your session has expired. Please log in again.');
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    
    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, []);

  const login = async (credentials: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔐 Starting login process...', credentials.email);
      const response = await AuthService.login(credentials);
      console.log('✅ Login response received:', response);
      
      const { access_token, refresh_token, user: userData } = response;
      
      // Store tokens and user data
      tokenStorage.setAccessToken(access_token);
      if (refresh_token) {
        tokenStorage.setRefreshToken(refresh_token);
      }
      tokenStorage.setUser(userData);
      
      // Always persist to localStorage to keep user logged in
      tokenStorage.persistToLocalStorage();
      
      setUser(userData);
      console.log('✅ User state updated:', userData);
    } catch (error) {
      console.error('❌ Login failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Remove confirmPassword from the data sent to server
      const { confirmPassword: _, ...registrationData } = userData;
      
      const response = await AuthService.register(registrationData);
      const { access_token, refresh_token, user: newUser } = response;
      
      // Store tokens and user data
      tokenStorage.setAccessToken(access_token);
      if (refresh_token) {
        tokenStorage.setRefreshToken(refresh_token);
      }
      tokenStorage.setUser(newUser);
      
      // Always persist to localStorage to keep user logged in
      tokenStorage.persistToLocalStorage();
      
      setUser(newUser);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Call logout endpoint to clear httpOnly cookies
      await AuthService.logout();
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      // Clear local storage regardless of API call result
      tokenStorage.clear();
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: UpdateProfileData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const updatedUser = await AuthService.updateProfile(data);
      
      // Update user in token storage and state
      tokenStorage.setUser(updatedUser);
      tokenStorage.persistToLocalStorage();
      setUser(updatedUser);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (data: ChangePasswordData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await AuthService.changePassword(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password change failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await AuthService.deleteAccount();
      
      // Clear local storage and state
      tokenStorage.clear();
      setUser(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Account deletion failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    deleteAccount,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};