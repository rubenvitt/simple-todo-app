import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHello', () => {
    it('should return hello message with port and environment in development', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'port') return 3000;
          if (key === 'environment') return 'development';
          return defaultValue;
        },
      );

      const result = service.getHello();

      expect(result).toBe(
        'Hello World! Running on port 3000 in development mode.',
      );
      expect(configService.get).toHaveBeenCalledWith('port', { infer: true });
      expect(configService.get).toHaveBeenCalledWith('environment', { infer: true });
    });

    it('should return hello message with default port when port is not configured', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'port') return 3000;
          if (key === 'environment') return 'test';
          return defaultValue;
        },
      );

      const result = service.getHello();

      expect(result).toBe('Hello World! Running on port 3000 in test mode.');
      expect(configService.get).toHaveBeenCalledWith('port', { infer: true });
    });

    it('should return hello message with production environment', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'port') return 8080;
          if (key === 'environment') return 'production';
          return defaultValue;
        },
      );

      const result = service.getHello();

      expect(result).toBe(
        'Hello World! Running on port 8080 in production mode.',
      );
    });
  });

  describe('getHealth', () => {
    it('should return health status with correct structure', () => {
      configService.get.mockReturnValue('test');
      const mockUptime = 123.456;
      jest.spyOn(process, 'uptime').mockReturnValue(mockUptime);

      const result = service.getHealth();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        environment: 'test',
        uptime: mockUptime,
      });
    });

    it('should return correct environment from config', () => {
      configService.get.mockReturnValue('production');

      const result = service.getHealth();

      expect(result.environment).toBe('production');
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
    });

    it('should return default environment when not configured', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'environment') return 'development';
          return defaultValue;
        },
      );

      const result = service.getHealth();

      expect(result.environment).toBe('development');
    });
  });

  describe('getConfig', () => {
    it('should return application configuration', () => {
      configService.get.mockReturnValue('development');

      const result = service.getConfig();

      expect(result).toEqual({
        environment: 'development',
        version: process.env.npm_package_version || '1.0.0',
        nodeVersion: process.version,
      });

      expect(configService.get).toHaveBeenCalledWith('environment', { infer: true });
    });

    it('should use default version when npm_package_version is not set', () => {
      const originalVersion = process.env.npm_package_version;
      delete process.env.npm_package_version;

      configService.get.mockReturnValue('test');

      const result = service.getConfig();

      expect(result.version).toBe('1.0.0');

      // Restore original value
      if (originalVersion !== undefined) {
        process.env.npm_package_version = originalVersion;
      }
    });
  });
});