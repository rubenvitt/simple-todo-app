import 'reflect-metadata';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://todo_user:todo_password@localhost:9001/todo_test';

// Completely disable rate limits for testing
process.env.RATE_LIMIT_AUTH_MAX = '999999';
process.env.RATE_LIMIT_AUTH_TTL = '999999999';
process.env.RATE_LIMIT_API_MAX = '999999';
process.env.RATE_LIMIT_API_TTL = '999999999';
process.env.RATE_LIMIT_MAX = '999999';
process.env.RATE_LIMIT_TTL = '999999999';

// Mock bcrypt for consistent testing
jest.mock('bcrypt', () => ({
    hash: jest.fn().mockImplementation((password: string) =>
        Promise.resolve(`hashed_${password}`)
    ),
    compare: jest.fn().mockImplementation((password: string, hash: string) =>
        Promise.resolve(hash === `hashed_${password}`)
    ),
}));

// Mock rate limiting guards for testing
jest.mock('@nestjs/throttler', () => ({
    ThrottlerGuard: jest.fn().mockImplementation(() => ({
        canActivate: jest.fn().mockResolvedValue(true),
    })),
    ThrottlerModule: {
        forRootAsync: jest.fn(() => ({
            module: class MockThrottlerModule {},
        })),
    },
}));

jest.mock('../src/common/guards/enhanced-rate-limit.guard', () => ({
    EnhancedRateLimitGuard: jest.fn().mockImplementation(() => ({
        canActivate: jest.fn().mockResolvedValue(true),
    })),
}));

// Global test utilities
global.createMockUser = (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

global.createMockJwtPayload = (overrides = {}) => ({
    sub: 'test-user-id',
    email: 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
});

// Extend Jest expect with custom matchers if needed
declare global {
    var createMockUser: (overrides?: any) => any;
    var createMockJwtPayload: (overrides?: any) => any;
}

// Configure test database
const { execSync } = require('child_process');

beforeAll(async () => {
    // Ensure test database is clean
    try {
        execSync('npx prisma migrate deploy', {
            env: { ...process.env, DATABASE_URL: 'postgresql://todo_user:todo_password@localhost:9001/todo_test' },
            stdio: 'ignore'
        });
    } catch (error) {
        console.warn('Warning: Could not set up test database:', error instanceof Error ? error.message : String(error));
    }
});

afterAll(async () => {
    // Test database cleanup is handled by docker-compose down
    // No additional cleanup needed for PostgreSQL test database
}); 