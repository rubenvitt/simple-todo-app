import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) { }

  getHello(): string {
    const port = this.configService.get<number>('PORT', 3000);
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    return `Hello World! Running on port ${port} in ${nodeEnv} mode.`;
  }

  getHealthStatus(): object {
    return {
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
      environment: this.configService.get<string>('NODE_ENV', 'development'),
    };
  }
}
