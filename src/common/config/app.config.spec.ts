import { environmentConfig, validateEnvironment } from './app.config';

describe('AppConfig', () => {
  describe('validateEnvironment', () => {
    it('should validate a complete valid configuration', () => {
      const validConfig = {
        NODE_ENV: 'development',
        PORT: '3000',
        JWT_SECRET: 'test-secret-key-for-testing-purposes-only',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
        FRONTEND_URL: 'http://localhost:3000',
        LOG_LEVEL: 'info',
      };

      expect(() => validateEnvironment(validConfig)).not.toThrow();
    });

    it('should throw error when JWT_SECRET is missing', () => {
      const invalidConfig = {
        NODE_ENV: 'development',
        PORT: '3000',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
      };

      expect(() => validateEnvironment(invalidConfig)).toThrow('JWT_SECRET');
    });

    it('should throw error when DATABASE_URL is missing', () => {
      const invalidConfig = {
        NODE_ENV: 'development',
        PORT: '3000',
        JWT_SECRET: 'test-secret-key-for-testing-purposes-only',
      };

      expect(() => validateEnvironment(invalidConfig)).toThrow('DATABASE_URL');
    });

    it('should validate with production environment', () => {
      const prodConfig = {
        NODE_ENV: 'production',
        PORT: '8080',
        JWT_SECRET: 'super-secure-production-jwt-secret-key',
        DATABASE_URL: 'postgresql://user:pass@prod-db:5432/proddb',
        CORS_ORIGIN: 'https://app.example.com',
        LOG_LEVEL: 'warn',
        SENTRY_DSN: 'https://example@sentry.io/123',
      };

      expect(() => validateEnvironment(prodConfig)).not.toThrow();
    });

    it('should set default values for optional fields', () => {
      const minimalConfig = {
        JWT_SECRET: 'test-secret',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
      };

      const result = validateEnvironment(minimalConfig);

      expect(result.NODE_ENV).toBe('development');
      expect(result.PORT).toBe(3000);
      expect(result.JWT_EXPIRES_IN).toBe('15m');
      expect(result.LOG_LEVEL).toBe('info');
    });

    it('should validate URL format for API_URL', () => {
      const configWithInvalidUrl = {
        JWT_SECRET: 'test-secret',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
        API_URL: 'not-a-valid-url',
      };

      expect(() => validateEnvironment(configWithInvalidUrl)).toThrow();
    });

    it('should convert string numbers to numbers', () => {
      const configWithStringNumbers = {
        JWT_SECRET: 'test-secret',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
        PORT: '8080',
        RATE_LIMIT_TTL: '30000',
        RATE_LIMIT_MAX: '50',
      };

      const result = validateEnvironment(configWithStringNumbers);

      expect(result.PORT).toBe(8080);
      expect(result.RATE_LIMIT_TTL).toBe(30000);
      expect(result.RATE_LIMIT_MAX).toBe(50);
    });
  });

  describe('environmentConfig', () => {
    beforeEach(() => {
      // Clear process.env before each test
      delete process.env.NODE_ENV;
      delete process.env.PORT;
      delete process.env.JWT_SECRET;
      delete process.env.DATABASE_URL;
    });

    it('should return default configuration', () => {
      const config = environmentConfig();

      expect(config.environment).toBe('development');
      expect(config.port).toBe(3000);
      expect(config.jwt.expiresIn).toBe('15m');
      expect(config.logging.level).toBe('info');
    });

    it('should use environment variables when provided', () => {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '8080';
      process.env.JWT_SECRET = 'prod-secret';
      process.env.DATABASE_URL = 'postgresql://prod:pass@prod-db:5432/prod';
      process.env.LOG_LEVEL = 'error';

      const config = environmentConfig();

      expect(config.environment).toBe('production');
      expect(config.port).toBe(8080);
      expect(config.jwt.secret).toBe('prod-secret');
      expect(config.database.url).toBe(
        'postgresql://prod:pass@prod-db:5432/prod',
      );
      expect(config.logging.level).toBe('error');
    });

    it('should handle database configuration', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      process.env.DATABASE_POOL_SIZE = '20';
      process.env.DATABASE_CONNECTION_LIMIT = '200';

      const config = environmentConfig();

      expect(config.database.url).toBe(
        'postgresql://user:pass@localhost:5432/testdb',
      );
      expect(config.database.poolSize).toBe(20);
      expect(config.database.connectionLimit).toBe(200);
    });

    it('should handle CORS configuration', () => {
      process.env.CORS_ORIGIN = 'http://localhost:3000,https://app.example.com';

      const config = environmentConfig();

      expect(config.cors.origin).toEqual([
        'http://localhost:3000',
        'https://app.example.com',
      ]);
      expect(config.cors.credentials).toBe(true);
    });

    it('should handle rate limiting configuration', () => {
      process.env.RATE_LIMIT_TTL = '120000';
      process.env.RATE_LIMIT_MAX = '200';

      const config = environmentConfig();

      expect(config.rateLimit.global.ttl).toBe(120000);
      expect(config.rateLimit.global.max).toBe(200);
    });

    it('should handle rate limit auth configuration', () => {
      process.env.RATE_LIMIT_AUTH_TTL = '600000';
      process.env.RATE_LIMIT_AUTH_MAX = '20';

      const config = environmentConfig();

      expect(config.rateLimit.auth.ttl).toBe(600000);
      expect(config.rateLimit.auth.max).toBe(20);
    });

    it('should handle rate limit api configuration', () => {
      process.env.RATE_LIMIT_API_TTL = '30000';
      process.env.RATE_LIMIT_API_MAX = '500';

      const config = environmentConfig();

      expect(config.rateLimit.api.ttl).toBe(30000);
      expect(config.rateLimit.api.max).toBe(500);
    });
  });
});
