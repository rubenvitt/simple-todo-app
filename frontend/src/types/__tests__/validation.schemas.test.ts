import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  taskSchema,
  listSchema,
  profileUpdateSchema,
  changePasswordSchema,
  listShareSchema,
  invitationAcceptSchema,
  taskFilterSchema,
  listFilterSchema,
} from '../validation.schemas'

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      }
      
      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123'
      }
      
      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid email')
      }
    })

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123'
      }
      
      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 6 characters')
      }
    })

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'password123'
      }
      
      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required')
      }
    })

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: ''
      }
      
      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required')
      }
    })
  })

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      }
      
      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject weak password', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weakpassword',
        confirmPassword: 'weakpassword'
      }
      
      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lowercase letter, one uppercase letter, and one number')
      }
    })

    it('should reject password confirmation mismatch', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!'
      }
      
      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Passwords do not match')
      }
    })

    it('should reject short name', () => {
      const invalidData = {
        name: 'J',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      }
      
      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters')
      }
    })

    it('should reject long name', () => {
      const invalidData = {
        name: 'A'.repeat(51),
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      }
      
      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('not exceed 50 characters')
      }
    })
  })

  describe('taskSchema', () => {
    it('should validate correct task data', () => {
      const validData = {
        title: 'Test Task',
        description: 'Test description',
        priority: 'MEDIUM' as const,
        status: 'TODO' as const,
        listId: 'list-123'
      }
      
      const result = taskSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid priority', () => {
      const invalidData = {
        title: 'Test Task',
        priority: 'INVALID',
        status: 'TODO' as const,
        listId: 'list-123'
      }
      
      const result = taskSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid priority')
      }
    })

    it('should reject invalid status', () => {
      const invalidData = {
        title: 'Test Task',
        priority: 'MEDIUM' as const,
        status: 'INVALID',
        listId: 'list-123'
      }
      
      const result = taskSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid status')
      }
    })

    it('should reject long title', () => {
      const invalidData = {
        title: 'A'.repeat(201),
        priority: 'MEDIUM' as const,
        status: 'TODO' as const,
        listId: 'list-123'
      }
      
      const result = taskSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('not exceed 200 characters')
      }
    })

    it('should reject long description', () => {
      const invalidData = {
        title: 'Test Task',
        description: 'A'.repeat(1001),
        priority: 'MEDIUM' as const,
        status: 'TODO' as const,
        listId: 'list-123'
      }
      
      const result = taskSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('not exceed 1000 characters')
      }
    })

    it('should reject past due date', () => {
      const pastDate = new Date('2020-01-01')
      const invalidData = {
        title: 'Test Task',
        priority: 'MEDIUM' as const,
        status: 'TODO' as const,
        dueDate: pastDate,
        listId: 'list-123'
      }
      
      const result = taskSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Due date cannot be in the past')
      }
    })
  })

  describe('listSchema', () => {
    it('should validate correct list data', () => {
      const validData = {
        title: 'Test List',
        description: 'Test description',
        color: '#ff0000',
        isPublic: false
      }
      
      const result = listSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid hex color', () => {
      const invalidData = {
        title: 'Test List',
        color: 'invalid-color'
      }
      
      const result = listSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid hex color')
      }
    })

    it('should accept valid hex colors', () => {
      const validColors = ['#ff0000', '#00FF00', '#0000ff', '#AbCdEf']
      
      validColors.forEach(color => {
        const validData = {
          title: 'Test List',
          color
        }
        
        const result = listSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('changePasswordSchema', () => {
    it('should validate correct password change data', () => {
      const validData = {
        currentPassword: 'currentPassword123',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!'
      }
      
      const result = changePasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject password confirmation mismatch', () => {
      const invalidData = {
        currentPassword: 'currentPassword123',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'DifferentPassword123!'
      }
      
      const result = changePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Passwords do not match')
      }
    })
  })

  describe('listShareSchema', () => {
    it('should validate correct share data', () => {
      const validData = {
        email: 'user@example.com',
        permission: 'EDITOR' as const,
        message: 'Welcome to the team!'
      }
      
      const result = listShareSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid permission', () => {
      const invalidData = {
        email: 'user@example.com',
        permission: 'INVALID'
      }
      
      const result = listShareSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid permission level')
      }
    })

    it('should reject long message', () => {
      const invalidData = {
        email: 'user@example.com',
        permission: 'EDITOR' as const,
        message: 'A'.repeat(301)
      }
      
      const result = listShareSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('not exceed 300 characters')
      }
    })
  })

  describe('taskFilterSchema', () => {
    it('should validate correct filter data', () => {
      const validData = {
        search: 'test',
        status: 'TODO' as const,
        priority: 'HIGH' as const,
        assigneeId: 'user-123'
      }
      
      const result = taskFilterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept empty filter data', () => {
      const validData = {}
      
      const result = taskFilterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid status in filter', () => {
      const invalidData = {
        status: 'INVALID'
      }
      
      const result = taskFilterSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('invitationAcceptSchema', () => {
    it('should validate correct invitation acceptance data', () => {
      const validData = {
        invitationId: 'invitation-123',
        accept: true
      }
      
      const result = invitationAcceptSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty invitation ID', () => {
      const invalidData = {
        invitationId: '',
        accept: true
      }
      
      const result = invitationAcceptSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invitation ID is required')
      }
    })
  })
})