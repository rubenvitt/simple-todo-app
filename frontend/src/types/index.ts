// Export all types and interfaces from this directory
export * from './validation.schemas';
export * from './notification-preferences.types';

// Re-export specific types to ensure they're available
export type { LoginFormData, RegisterFormData, PasswordResetRequestFormData, PasswordResetFormData } from './validation.schemas';

// Auth types (fallback if shared types don't work)
export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}
