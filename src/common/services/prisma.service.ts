import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../../generated/prisma';
import { QueryPerformanceService } from './query-performance.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;
  private connectionAttempts = 0;
  private readonly maxConnectionAttempts = 5;
  private performanceService: QueryPerformanceService;

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
      log:
        configService.get<string>('NODE_ENV') === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error', 'warn'],
      errorFormat: 'minimal',
    });

    this.performanceService = new QueryPerformanceService();
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      this.logger.log('Disconnecting from database...');
      await this.$disconnect();
      this.isConnected = false;
      this.logger.log('Successfully disconnected from database');
    }
  }

  private async connectWithRetry(): Promise<void> {
    while (
      this.connectionAttempts < this.maxConnectionAttempts &&
      !this.isConnected
    ) {
      try {
        this.logger.log(
          `Attempting to connect to database (attempt ${this.connectionAttempts + 1}/${this.maxConnectionAttempts})`,
        );

        await this.$connect();
        this.isConnected = true;
        this.connectionAttempts = 0;

        this.logger.log('Successfully connected to database');

        // Test the connection
        await this.healthCheck();
      } catch (error) {
        this.connectionAttempts++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to connect to database (attempt ${this.connectionAttempts}): ${errorMessage}`,
        );

        if (this.connectionAttempts >= this.maxConnectionAttempts) {
          this.logger.error(
            'Max connection attempts reached. Could not connect to database',
          );
          throw new Error(
            `Could not connect to database after ${this.maxConnectionAttempts} attempts`,
          );
        }

        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, this.connectionAttempts) * 1000;
        this.logger.log(
          `Waiting ${waitTime}ms before next connection attempt...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Health check to verify database connectivity
   */
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    query_time_ms?: number;
  }> {
    try {
      const startTime = Date.now();
      await this.$queryRaw`SELECT 1 as health_check`;
      const queryTime = Date.now() - startTime;

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        query_time_ms: queryTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Database health check failed:', errorMessage);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute queries with automatic retry on connection issues
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;
        this.logger.warn(`Query attempt ${attempt} failed: ${err.message}`);

        // Only retry on connection errors
        if (this.isConnectionError(err) && attempt < maxRetries) {
          this.logger.log(
            `Retrying query (attempt ${attempt + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        throw err;
      }
    }

    throw lastError || new Error('Operation failed after all retries');
  }

  /**
   * Batch multiple operations for better performance
   */
  async executeBatch<T>(operations: (() => Promise<T>)[]): Promise<T[]> {
    const batchSize = this.configService.get<number>('DATABASE_BATCH_SIZE', 10);
    const results: T[] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((op) => op()));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Execute query with performance tracking
   */
  async executeWithPerformanceTracking<T>(
    queryFn: () => Promise<T>,
    queryInfo: {
      query: string;
      params?: any;
      model?: string;
      operation?: string;
    },
  ): Promise<T> {
    return this.performanceService.trackQuery(queryFn, queryInfo);
  }

  /**
   * Optimized findMany with performance tracking
   */
  async findManyOptimized<T>(
    model: string,
    args: any,
    operation = 'findMany',
  ): Promise<T> {
    const queryInfo = {
      query: `${model}.${operation}`,
      params: this.sanitizeParams(args),
      model,
      operation,
    };

    return this.executeWithPerformanceTracking(
      () => this.executeWithRetry(() => (this as any)[model][operation](args)),
      queryInfo,
    );
  }

  /**
   * Optimized findUnique with performance tracking
   */
  async findUniqueOptimized<T>(
    model: string,
    args: any,
    operation = 'findUnique',
  ): Promise<T | null> {
    const queryInfo = {
      query: `${model}.${operation}`,
      params: this.sanitizeParams(args),
      model,
      operation,
    };

    return this.executeWithPerformanceTracking(
      () => this.executeWithRetry(() => (this as any)[model][operation](args)),
      queryInfo,
    );
  }

  /**
   * Optimized create with performance tracking
   */
  async createOptimized<T>(
    model: string,
    args: any,
    operation = 'create',
  ): Promise<T> {
    const queryInfo = {
      query: `${model}.${operation}`,
      params: this.sanitizeParams(args),
      model,
      operation,
    };

    return this.executeWithPerformanceTracking(
      () => this.executeWithRetry(() => (this as any)[model][operation](args)),
      queryInfo,
    );
  }

  /**
   * Optimized update with performance tracking
   */
  async updateOptimized<T>(
    model: string,
    args: any,
    operation = 'update',
  ): Promise<T> {
    const queryInfo = {
      query: `${model}.${operation}`,
      params: this.sanitizeParams(args),
      model,
      operation,
    };

    return this.executeWithPerformanceTracking(
      () => this.executeWithRetry(() => (this as any)[model][operation](args)),
      queryInfo,
    );
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return this.performanceService.getPerformanceStats();
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions(): string[] {
    return this.performanceService.getOptimizationSuggestions();
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics(): void {
    this.performanceService.clearMetrics();
  }

  /**
   * Get connection pool statistics
   */
  getConnectionInfo(): Record<string, any> {
    return {
      isConnected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
      maxConnectionAttempts: this.maxConnectionAttempts,
      nodeEnv: this.configService.get<string>('NODE_ENV'),
      performanceStats: this.getPerformanceStats(),
    };
  }

  private isConnectionError(error: any): boolean {
    const connectionErrorMessages = [
      'connection',
      'connect ECONNREFUSED',
      'timeout',
      'ENOTFOUND',
      'network',
      'pool',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return connectionErrorMessages.some((msg) => errorMessage.includes(msg));
  }

  private sanitizeParams(params: any): any {
    if (!params) return params;

    // Remove sensitive data and limit size for logging
    const sanitized = JSON.parse(JSON.stringify(params));

    // Remove password fields
    if (sanitized.data?.passwordHash) {
      sanitized.data.passwordHash = '[REDACTED]';
    }

    // Limit large objects
    const stringified = JSON.stringify(sanitized);
    if (stringified.length > 1000) {
      return '[LARGE_OBJECT]';
    }

    return sanitized;
  }
}
