import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';
import { SecretsService } from './secrets.service';

@Injectable()
export class AppBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AppBootstrapService.name);

  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly secretsService: SecretsService,
  ) {}

  async onModuleInit() {
    await this.validateEnvironment();
    await this.logEnvironmentInfo();
  }

  /**
   * Validate that all required environment variables and secrets are present
   */
  private async validateEnvironment(): Promise<void> {
    this.logger.log('Starting environment validation...');

    try {
      // Required secrets for application to function
      const requiredSecrets = ['JWT_SECRET', 'DATABASE_URL'];

      // Validate required secrets are available
      this.secretsService.validateRequiredSecrets(requiredSecrets);

      // Additional validation for production environment
      const nodeEnv = this.configService.get('environment', { infer: true });
      if (nodeEnv === 'production') {
        await this.validateProductionEnvironment();
      }

      this.logger.log('✅ Environment validation completed successfully');
    } catch (error: any) {
      this.logger.error('❌ Environment validation failed:', error.message);
      throw new Error(`Application startup failed: ${error.message}`);
    }
  }

  /**
   * Additional validation for production environment
   */
  private async validateProductionEnvironment(): Promise<void> {
    this.logger.log(
      'Performing additional production environment validation...',
    );

    const productionRequirements = [
      {
        key: 'JWT_SECRET',
        minLength: 32,
        description: 'JWT secret should be at least 32 characters',
      },
      {
        key: 'DATABASE_URL',
        pattern: /^(postgresql|sqlite):\/\//,
        description: 'Database URL should be PostgreSQL or SQLite',
      },
    ];

    for (const requirement of productionRequirements) {
      const value = this.secretsService.getSecret(requirement.key);

      if (!value) {
        throw new Error(
          `Production requirement failed: ${requirement.key} is missing`,
        );
      }

      if (requirement.minLength && value.length < requirement.minLength) {
        throw new Error(
          `Production requirement failed: ${requirement.description}`,
        );
      }

      if (requirement.pattern && !requirement.pattern.test(value)) {
        throw new Error(
          `Production requirement failed: ${requirement.description}`,
        );
      }
    }

    // Warn about missing optional production configurations
    const optionalProductionConfigs = ['REDIS_URL'];

    for (const config of optionalProductionConfigs) {
      const value = this.secretsService.getSecret(config);
      if (!value) {
        this.logger.warn(`⚠️  Optional production config missing: ${config}`);
      }
    }

    this.logger.log('✅ Production environment validation completed');
  }

  /**
   * Log environment information (without sensitive data)
   */
  private async logEnvironmentInfo(): Promise<void> {
    const nodeEnv = this.configService.get('environment', { infer: true });
    const port = this.configService.get('port', { infer: true });
    const logLevel = this.configService.get('logging.level', { infer: true });

    this.logger.log('🚀 Application Configuration:');
    this.logger.log(`   Environment: ${nodeEnv}`);
    this.logger.log(`   Port: ${port}`);
    this.logger.log(`   Log Level: ${logLevel}`);

    // Database connection status (without revealing URL)
    const databaseUrl = this.secretsService.getSecret('DATABASE_URL');
    if (databaseUrl) {
      const dbHost = this.extractHostFromUrl(databaseUrl);
      this.logger.log(`   Database: Connected to ${dbHost || 'configured'}`);
    }

    // JWT configuration status
    const jwtSecret = this.secretsService.getSecret('JWT_SECRET');
    if (jwtSecret) {
      this.logger.log(`   JWT: Configured (length: ${jwtSecret.length} chars)`);
    }

    // CORS configuration
    const corsOrigin = this.configService.get('cors.origin', { infer: true });
    if (corsOrigin && corsOrigin.length > 0) {
      this.logger.log(`   CORS: ${corsOrigin.length} origin(s) configured`);
    }
  }

  /**
   * Safely extract hostname from database URL without exposing credentials
   */
  private extractHostFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  /**
   * Perform health check to ensure application is ready
   */
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    environment: string;
  }> {
    const nodeEnv = this.configService.get('environment', { infer: true });

    try {
      // Verify critical secrets are still available
      this.secretsService.getSecret('JWT_SECRET');
      this.secretsService.getSecret('DATABASE_URL');

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: nodeEnv || 'unknown',
      };
    } catch (error: any) {
      this.logger.error('Health check failed:', error.message);
      throw new Error('Application health check failed');
    }
  }
}
