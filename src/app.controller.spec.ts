import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'port') return 3000;
        if (key === 'environment') return 'test';
        return defaultValue;
      }),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    configService = app.get(ConfigService);
  });

  describe('root', () => {
    it('should return "Hello World!" message with port and environment', () => {
      const result = appController.getHello();
      expect(result).toBe('Hello World! Running on port 3000 in test mode.');
      expect(configService.get).toHaveBeenCalledWith('port', { infer: true });
      expect(configService.get).toHaveBeenCalledWith('environment', {
        infer: true,
      });
    });
  });
});
