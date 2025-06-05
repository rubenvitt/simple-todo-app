import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './common/config/app.config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService<AppConfig>) {}

  getHello(): string {
    const port = this.configService.get('port', { infer: true });
    const nodeEnv = this.configService.get('environment', { infer: true });

    return `Hello World! Running on port ${port} in ${nodeEnv} mode.`;
  }

  /**
   * Get application health status and basic info
   */
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('environment', { infer: true }),
      uptime: process.uptime(),
    };
  }

  /**
   * Get application configuration (non-sensitive)
   */
  getConfig() {
    return {
      environment: this.configService.get('environment', { infer: true }),
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
    };
  }
}
