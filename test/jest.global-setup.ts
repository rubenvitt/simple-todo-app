export default async function globalSetup() {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'file:./test.db';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

    console.log('🧪 Global test setup completed');
    console.log('📊 Test database URL:', process.env.DATABASE_URL);
} 