import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { ListAccessGuard, ListPermissionGuard } from '../../src/common/guards';
import { UserExistsGuard } from '../../src/users/guards/user-exists.guard';

/**
 * Mock Prisma Service for unit tests
 */
export const createMockPrismaService = () => ({
    user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    list: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    task: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    listShare: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    invitation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    notification: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
});

/**
 * Common guard overrides for testing
 */
export const getCommonGuardOverrides = () => ({
    overrideGuard: (guard: any) => ({
        useValue: { canActivate: jest.fn(() => true) }
    })
});

/**
 * Setup testing module with common overrides
 */
export const setupTestingModule = async (config: {
    controllers?: any[];
    providers?: any[];
    imports?: any[];
    guards?: any[];
}) => {
    const moduleBuilder = Test.createTestingModule({
        controllers: config.controllers || [],
        providers: config.providers || [],
        imports: config.imports || [],
    });

    // Override common guards by default
    moduleBuilder
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .overrideGuard(UserExistsGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .overrideGuard(ListAccessGuard)
        .useValue({ canActivate: jest.fn(() => true) })
        .overrideGuard(ListPermissionGuard)
        .useValue({ canActivate: jest.fn(() => true) });

    // Add additional guard overrides if specified
    if (config.guards) {
        config.guards.forEach(guard => {
            moduleBuilder
                .overrideGuard(guard)
                .useValue({ canActivate: jest.fn(() => true) });
        });
    }

    return moduleBuilder.compile();
};

/**
 * Create mock request object with user
 */
export const createMockRequest = (userOverrides = {}) => ({
    user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        ...userOverrides,
    },
});

/**
 * Create mock JWT payload
 */
export const createMockJwtPayload = (overrides = {}) => ({
    sub: 'test-user-id',
    email: 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
});

/**
 * Create mock user entity
 */
export const createMockUser = (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

/**
 * Create mock list entity
 */
export const createMockList = (overrides = {}) => ({
    id: 'test-list-id',
    name: 'Test List',
    description: 'Test list description',
    color: '#3B82F6',
    userId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

/**
 * Create mock task entity
 */
export const createMockTask = (overrides = {}) => ({
    id: 'test-task-id',
    title: 'Test Task',
    description: 'Test task description',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    dueDate: null,
    listId: 'test-list-id',
    assignedUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

/**
 * Create mock notification entity
 */
export const createMockNotification = (overrides = {}) => ({
    id: 'test-notification-id',
    userId: 'test-user-id',
    type: 'GENERAL',
    title: 'Test Notification',
    message: 'Test notification message',
    readStatus: false,
    createdAt: new Date(),
    ...overrides,
});

/**
 * Create mock invitation entity
 */
export const createMockInvitation = (overrides = {}) => ({
    id: 'test-invitation-id',
    listId: 'test-list-id',
    inviterUserId: 'test-user-id',
    inviteeEmail: 'invitee@example.com',
    status: 'PENDING',
    token: 'test-token-123',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

/**
 * Reset all mocks in a test
 */
export const resetAllMocks = () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
};

/**
 * Expect common validation error format
 */
export const expectValidationError = (error: any, field?: string) => {
    expect(error).toHaveProperty('statusCode', 400);
    expect(error).toHaveProperty('message');
    expect(Array.isArray(error.message)).toBe(true);

    if (field) {
        expect(error.message.some((msg: string) => msg.includes(field))).toBe(true);
    }
};

/**
 * Expect common not found error format
 */
export const expectNotFoundError = (error: any, resource?: string) => {
    expect(error).toHaveProperty('statusCode', 404);
    expect(error).toHaveProperty('message');

    if (resource) {
        expect(error.message).toContain(resource);
    }
}; 