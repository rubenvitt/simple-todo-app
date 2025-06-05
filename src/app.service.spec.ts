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
          if (key === 'PORT') return 3000;
          if (key === 'NODE_ENV') return 'development';
          return defaultValue;
        },
      );

      const result = service.getHello();

      expect(result).toBe(
        'Hello World! Running on port 3000 in development mode.',
      );
      expect(configService.get).toHaveBeenCalledWith('PORT', 3000);
      expect(configService.get).toHaveBeenCalledWith('NODE_ENV', 'development');
    });

    it('should return hello message with default port when port is not configured', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'PORT') return defaultValue;
          if (key === 'NODE_ENV') return 'test';
          return defaultValue;
        },
      );

      const result = service.getHello();

      expect(result).toBe('Hello World! Running on port 3000 in test mode.');
      expect(configService.get).toHaveBeenCalledWith('PORT', 3000);
    });

    it('should return hello message with production environment', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'PORT') return 8080;
          if (key === 'NODE_ENV') return 'production';
          return defaultValue;
        },
      );

      const result = service.getHello();

      expect(result).toBe(
        'Hello World! Running on port 8080 in production mode.',
      );
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status with correct structure', () => {
      configService.get.mockReturnValue('test');

      const result = service.getHealthStatus();

      expect(result).toEqual({
        dependencies: {
          nestjs: '^11.0.1',
          config: '^4.0.2',
        },
        modules: {
          auth: 'loaded',
          users: 'loaded',
          lists: 'loaded',
          tasks: 'loaded',
          notifications: 'loaded',
        },
        environment: 'test',
      });
    });

    it('should return correct environment from config', () => {
      configService.get.mockReturnValue('production');

      const result = service.getHealthStatus() as any;

      expect(result.environment).toBe('production');
      expect(result.dependencies).toBeDefined();
      expect(result.modules).toBeDefined();
    });

    it('should return default environment when not configured', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'NODE_ENV') return defaultValue;
          return defaultValue;
        },
      );

      const result = service.getHealthStatus() as any;

      expect(result.environment).toBe('development');
      expect(configService.get).toHaveBeenCalledWith('NODE_ENV', 'development');
    });

    it('should always include required modules status', () => {
      configService.get.mockReturnValue('test');

      const result = service.getHealthStatus() as any;

      expect(result.modules).toEqual({
        auth: 'loaded',
        users: 'loaded',
        lists: 'loaded',
        tasks: 'loaded',
        notifications: 'loaded',
      });
    });

    it('should include dependency information', () => {
      configService.get.mockReturnValue('test');

      const result = service.getHealthStatus() as any;

      expect(result.dependencies).toEqual({
        nestjs: '^11.0.1',
        config: '^4.0.2',
      });
    });
  });
});
