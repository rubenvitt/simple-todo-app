import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Retrieve a secret value by key from environment variables
   */
  getSecret(key: string): string | undefined {
    return this.configService.get<string>(key);
  }

  /**
   * Validate that required secrets are available
   */
  validateRequiredSecrets(requiredKeys: string[]): void {
    const missingSecrets: string[] = [];

    for (const key of requiredKeys) {
      const value = this.getSecret(key);
      if (!value) {
        missingSecrets.push(key);
      }
    }

    if (missingSecrets.length > 0) {
      throw new Error(`Missing required secrets: ${missingSecrets.join(', ')}`);
    }

    this.logger.log('All required secrets validated successfully');
  }
}
