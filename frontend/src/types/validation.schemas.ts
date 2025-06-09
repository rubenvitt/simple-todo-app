import { z } from 'zod';

// Login form validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

// Registration form validation schema
export const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

// Password reset confirmation schema
export const passwordResetSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Task creation/editing schemas
export const taskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title must not exceed 200 characters'),
  description: z
    .string()
    .optional()
    .refine((val) => !val || val.length <= 1000, {
      message: 'Description must not exceed 1000 characters',
    }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH'], {
    errorMap: () => ({ message: 'Please select a valid priority' }),
  }),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'], {
    errorMap: () => ({ message: 'Please select a valid status' }),
  }),
  dueDate: z
    .date()
    .optional()
    .refine((date) => !date || date >= new Date(), {
      message: 'Due date cannot be in the past',
    }),
  assigneeId: z.string().optional(),
  listId: z.string().min(1, 'List is required'),
});

// List creation/editing schemas
export const listSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(2, 'Title must be at least 2 characters')
    .max(100, 'Title must not exceed 100 characters'),
  description: z
    .string()
    .optional()
    .refine((val) => !val || val.length <= 500, {
      message: 'Description must not exceed 500 characters',
    }),
  color: z
    .string()
    .optional()
    .refine((val) => !val || /^#[0-9A-F]{6}$/i.test(val), {
      message: 'Please enter a valid hex color',
    }),
  isPublic: z.boolean().default(false),
});

// User profile update schema
export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  bio: z
    .string()
    .optional()
    .refine((val) => !val || val.length <= 200, {
      message: 'Bio must not exceed 200 characters',
    }),
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(1, 'New password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  confirmNewPassword: z
    .string()
    .min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
});

// List sharing schema
export const listShareSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  permission: z.enum(['VIEWER', 'EDITOR', 'OWNER'], {
    errorMap: () => ({ message: 'Please select a valid permission level' }),
  }),
  message: z
    .string()
    .optional()
    .refine((val) => !val || val.length <= 300, {
      message: 'Message must not exceed 300 characters',
    }),
});

// Invitation acceptance schema
export const invitationAcceptSchema = z.object({
  invitationId: z.string().min(1, 'Invitation ID is required'),
  accept: z.boolean(),
});

// Search and filter schemas
export const taskFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  assigneeId: z.string().optional(),
  listId: z.string().optional(),
  dueDateFrom: z.date().optional(),
  dueDateTo: z.date().optional(),
});

export const listFilterSchema = z.object({
  search: z.string().optional(),
  isPublic: z.boolean().optional(),
  hasUncompletedTasks: z.boolean().optional(),
});

// Type inference from schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type PasswordResetRequestFormData = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
export type TaskFormData = z.infer<typeof taskSchema>;
export type ListFormData = z.infer<typeof listSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ListShareFormData = z.infer<typeof listShareSchema>;
export type InvitationAcceptFormData = z.infer<typeof invitationAcceptSchema>;
export type TaskFilterFormData = z.infer<typeof taskFilterSchema>;
export type ListFilterFormData = z.infer<typeof listFilterSchema>;