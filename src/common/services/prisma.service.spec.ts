import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

// Create a minimal PrismaService for testing
class TestPrismaService extends PrismaService {
  constructor(configService: ConfigService) {
    super(configService);
    // Override logger to prevent errors
    (this as any).logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };
  }

  // Override methods that would require actual database connection
  async onModuleInit() {
    // Don't connect in tests
  }

  async onModuleDestroy() {
    // Don't disconnect in tests
  }
}

describe('PrismaService', () => {
  let service: TestPrismaService;
  let configService: ConfigService;
  let mockLogger: jest.Mocked<Logger>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
        NODE_ENV: 'test',
        DATABASE_BATCH_SIZE: 10,
        DATABASE_MAX_RETRIES: 3,
        DATABASE_RETRY_DELAY: 1000,
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useFactory: (configService: ConfigService) => new TestPrismaService(configService),
          inject: [ConfigService],
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TestPrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Construction and Configuration', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should configure with correct database URL from config', () => {
      expect(configService.get).toHaveBeenCalledWith('DATABASE_URL');
    });
  });

  describe('Health Check', () => {
    it('should perform health check with query timing', async () => {
      // Mock $queryRaw to simulate database query
      jest.spyOn(service, '$queryRaw').mockResolvedValueOnce([{ result: 1 }]);

      const result = await service.healthCheck();

      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('query_time_ms');
      expect(typeof result.query_time_ms).toBe('number');
    });

    it('should handle health check failure', async () => {
      // Mock $queryRaw to simulate database error
      jest.spyOn(service, '$queryRaw').mockRejectedValueOnce(new Error('Query failed'));

      const result = await service.healthCheck();

      expect(result).toHaveProperty('status', 'unhealthy');
      expect(result).toHaveProperty('error', 'Query failed');
    });
  });

  describe('Query Execution with Retry', () => {
    it('should execute operation successfully', async () => {
      const mockOperation = jest.fn().mockResolvedValueOnce('success');

      const result = await service.executeWithRetry(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on connection errors', async () => {
      const connectionError = new Error('connection failed');
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(connectionError)
        .mockResolvedValueOnce('success');

      // Mock setTimeout to avoid actual delays
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return {} as any;
      });

      const result = await service.executeWithRetry(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-connection errors', async () => {
      const nonConnectionError = new Error('validation error');
      const mockOperation = jest.fn().mockRejectedValueOnce(nonConnectionError);

      await expect(service.executeWithRetry(mockOperation)).rejects.toThrow(
        'validation error',
      );

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should throw error after max retries', async () => {
      const connectionError = new Error('timeout');
      const mockOperation = jest.fn().mockRejectedValue(connectionError);

      // Mock setTimeout to avoid actual delays
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return {} as any;
      });

      await expect(service.executeWithRetry(mockOperation, 2)).rejects.toThrow(
        'timeout',
      );

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Batch Execution', () => {
    it('should execute operations in batches', async () => {
      const operations = [
        jest.fn().mockResolvedValueOnce('result1'),
        jest.fn().mockResolvedValueOnce('result2'),
        jest.fn().mockResolvedValueOnce('result3'),
      ];

      const results = await service.executeBatch(operations);

      expect(results).toEqual(['result1', 'result2', 'result3']);
      operations.forEach((op) => expect(op).toHaveBeenCalledTimes(1));
    });

    it('should respect batch size configuration', async () => {
      // Create operations with individual resolved values
      const operations = [
        () => Promise.resolve('result1'),
        () => Promise.resolve('result2'),
        () => Promise.resolve('result3'),
        () => Promise.resolve('result4'),
        () => Promise.resolve('result5'),
      ];

      const results = await service.executeBatch(operations);

      expect(results).toHaveLength(5);
      expect(results).toEqual([
        'result1',
        'result2',
        'result3',
        'result4',
        'result5',
      ]);
    });
  });

  describe('Connection Info', () => {
    it('should return connection information', () => {
      const info = service.getConnectionInfo();

      expect(info).toHaveProperty('isConnected');
      expect(info).toHaveProperty('connectionAttempts');
      expect(info).toHaveProperty('maxConnectionAttempts');
      expect(info).toHaveProperty('nodeEnv');
      expect(info).toHaveProperty('performanceStats');
      expect(info.maxConnectionAttempts).toBe(5);
    });
  });

  describe('Connection Error Detection', () => {
    it('should detect connection errors correctly', () => {
      const connectionErrors = [
        new Error('connection refused'),
        new Error('connect ECONNREFUSED'),
        new Error('timeout occurred'),
        new Error('ENOTFOUND host'),
        new Error('network error'),
        new Error('pool error'),
      ];

      connectionErrors.forEach((error) => {
        expect(service.isConnectionError(error)).toBe(true);
      });
    });

    it('should not detect non-connection errors as connection errors', () => {
      const nonConnectionErrors = [
        new Error('validation failed'),
        new Error('syntax error'),
        new Error('permission denied'),
      ];

      nonConnectionErrors.forEach((error) => {
        expect(service.isConnectionError(error)).toBe(false);
      });
    });
  });

  describe('Performance Stats', () => {
    it('should return performance statistics', () => {
      const stats = service.getPerformanceStats();

      expect(stats).toHaveProperty('totalQueries');
      expect(stats).toHaveProperty('averageDuration');
      expect(stats).toHaveProperty('slowQueries');
      expect(stats).toHaveProperty('recentSlowQueries');
      expect(stats).toHaveProperty('queriesByModel');
      expect(stats).toHaveProperty('queriesByOperation');
    });

    it('should clear performance metrics', () => {
      service.clearPerformanceMetrics();
      // Should not throw and should reset metrics
      expect(() => service.clearPerformanceMetrics()).not.toThrow();
    });
  });
});