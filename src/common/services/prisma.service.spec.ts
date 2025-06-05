import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let configService: ConfigService;
  let mockLogger: jest.Mocked<Logger>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
        NODE_ENV: 'test',
        DATABASE_BATCH_SIZE: 10,
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
        PrismaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    // Replace the logger instance
    (service as any).logger = mockLogger;
  });

  describe('Construction and Configuration', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should configure with correct database URL from config', () => {
      expect(configService.get).toHaveBeenCalledWith('DATABASE_URL');
    });

    it('should use development logging in development environment', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'DATABASE_URL')
          return 'postgresql://test:test@localhost:5432/test_db';
        return undefined;
      });

      // Create a new instance to test development configuration
      const devService = new PrismaService(configService);
      expect(devService).toBeDefined();
    });

    it('should use production logging in production environment', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'DATABASE_URL')
          return 'postgresql://test:test@localhost:5432/test_db';
        return undefined;
      });

      // Create a new instance to test production configuration
      const prodService = new PrismaService(configService);
      expect(prodService).toBeDefined();
    });
  });

  describe('Connection Management', () => {
    it('should handle connection with retry logic', async () => {
      // Mock successful connection
      jest.spyOn(service, '$connect').mockResolvedValueOnce(undefined);
      jest.spyOn(service, 'healthCheck').mockResolvedValueOnce({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        query_time_ms: 10,
      });

      await service.onModuleInit();

      expect(service.$connect).toHaveBeenCalled();
      expect(service.healthCheck).toHaveBeenCalled();
    });

    it('should retry connection on failure', async () => {
      // Mock connection failures then success
      jest
        .spyOn(service, '$connect')
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(undefined);

      jest.spyOn(service, 'healthCheck').mockResolvedValueOnce({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        query_time_ms: 10,
      });

      // Mock setTimeout to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return {} as any;
      });

      await service.onModuleInit();

      expect(service.$connect).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to connect to database'),
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Successfully connected to database'),
      );
    });

    it('should throw error after max connection attempts', async () => {
      // Mock all connection attempts to fail
      jest
        .spyOn(service, '$connect')
        .mockRejectedValue(new Error('Connection failed'));

      // Mock setTimeout to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return {} as any;
      });

      await expect(service.onModuleInit()).rejects.toThrow(
        'Could not connect to database after 5 attempts',
      );

      expect(service.$connect).toHaveBeenCalledTimes(5);
    });

    it('should disconnect gracefully on module destroy', async () => {
      // Set up connected state
      (service as any).isConnected = true;
      jest.spyOn(service, '$disconnect').mockResolvedValueOnce(undefined);

      await service.onModuleDestroy();

      expect(service.$disconnect).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Disconnecting from database...',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Successfully disconnected from database',
      );
    });

    it('should skip disconnect if not connected', async () => {
      // Ensure not connected state
      (service as any).isConnected = false;
      jest.spyOn(service, '$disconnect').mockResolvedValueOnce(undefined);

      await service.onModuleDestroy();

      expect(service.$disconnect).not.toHaveBeenCalled();
    });
  });

  describe('Health Check', () => {
    it('should return healthy status on successful query', async () => {
      jest
        .spyOn(service, '$queryRaw')
        .mockResolvedValueOnce([{ health_check: 1 }]);

      const result = await service.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.query_time_ms).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status on query failure', async () => {
      jest
        .spyOn(service, '$queryRaw')
        .mockRejectedValueOnce(new Error('Query failed'));

      const result = await service.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.timestamp).toBeDefined();
      expect(result.query_time_ms).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database health check failed:',
        'Query failed',
      );
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
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Query attempt 1 failed'),
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Retrying query'),
      );
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
      // Configure smaller batch size for testing
      mockConfigService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'DATABASE_BATCH_SIZE') return 2;
          return defaultValue;
        },
      );

      const operations = Array.from({ length: 5 }, (_, i) =>
        jest.fn().mockResolvedValueOnce(`result${i + 1}`),
      );

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
        expect((service as any).isConnectionError(error)).toBe(true);
      });
    });

    it('should not detect non-connection errors as connection errors', () => {
      const nonConnectionErrors = [
        new Error('validation failed'),
        new Error('syntax error'),
        new Error('permission denied'),
      ];

      nonConnectionErrors.forEach((error) => {
        expect((service as any).isConnectionError(error)).toBe(false);
      });
    });
  });
});
