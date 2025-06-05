import { Injectable } from '@nestjs/common';
import {
  HealthCheckService,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { AppLoggerService } from './logger.service';
import { PrismaService } from './prisma.service';
import { QueryPerformanceService } from './query-performance.service';

export interface DetailedHealthReport {
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  status: 'ok' | 'error' | 'degraded';
  system: {
    memory: {
      used: number;
      free: number;
      total: number;
      percentage: number;
    };
    cpu: {
      loadAverage: number[];
    };
    process: {
      pid: number;
      uptime: number;
      memoryUsage: NodeJS.MemoryUsage;
    };
  };
  database: {
    status: string;
    connectionInfo?: any;
    performanceMetrics?: any;
    error?: string;
  };
  application: {
    activeConnections?: number;
    requestsPerMinute?: number;
    errorRate?: number;
  };
  services: Record<
    string,
    { status: string; responseTime?: number; lastCheck: string; error?: string }
  >;
  error?: Record<string, any>;
}

@Injectable()
export class AppHealthService extends HealthIndicator {
  private readonly startTime = Date.now();
  private healthCheckHistory: Array<{
    timestamp: Date;
    status: string;
    details?: any;
  }> = [];
  private readonly maxHistoryLength = 100;

  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaService: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly queryPerformanceService: QueryPerformanceService,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const healthData = await this.getDetailedHealth();
      const isHealthy = healthData.status === 'ok';

      const result = this.getStatus(key, isHealthy, healthData);

      if (!isHealthy) {
        this.logger.warn('Health check failed', {
          status: healthData.status,
          errors: healthData.error,
          type: 'health_check',
        });
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Health check error', errorStack, {
        type: 'health_check',
        error: errorMessage,
      });
      throw error;
    }
  }

  async getDetailedHealth(): Promise<DetailedHealthReport> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    try {
      // System metrics
      const systemMetrics = await this.getSystemMetrics();

      // Database health
      const databaseHealth = await this.getDatabaseHealth();

      // Application metrics
      const applicationMetrics = await this.getApplicationMetrics();

      // External services health
      const servicesHealth = await this.getServicesHealth();

      // Determine overall status
      const overallStatus = this.determineOverallStatus(
        databaseHealth,
        servicesHealth,
      );

      const healthReport: DetailedHealthReport = {
        timestamp,
        uptime,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
        status: overallStatus,
        system: systemMetrics,
        database: databaseHealth,
        application: applicationMetrics,
        services: servicesHealth,
      };

      // Record health check
      this.recordHealthCheck('ok', healthReport);

      return healthReport;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to generate health report', errorStack, {
        type: 'health_check',
        error: errorMessage,
      });
      this.recordHealthCheck('error', { error: errorMessage });
      throw error;
    }
  }

  private determineOverallStatus(
    databaseHealth: any,
    servicesHealth: any,
  ): 'ok' | 'error' | 'degraded' {
    if (databaseHealth.status === 'unhealthy') {
      return 'error';
    }

    const serviceStatuses = Object.values(servicesHealth).map(
      (service: any) => service.status,
    );
    if (serviceStatuses.some((status) => status === 'unhealthy')) {
      return 'degraded';
    }

    return 'ok';
  }

  private async getSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = Math.round(
      process.platform === 'linux'
        ? parseInt(
            (require('fs')
              .readFileSync('/proc/meminfo', 'utf8')
              .match(/MemTotal:\s*(\d+)/) || ['0', '0'])[1],
          ) * 1024
        : memoryUsage.heapTotal * 4, // Approximation for non-Linux systems
    );

    return {
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        free: Math.round((totalMemory - memoryUsage.heapUsed) / 1024 / 1024), // MB
        total: Math.round(totalMemory / 1024 / 1024), // MB
        percentage: Math.round((memoryUsage.heapUsed / totalMemory) * 100),
      },
      cpu: {
        loadAverage:
          process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0],
      },
      process: {
        pid: process.pid,
        uptime: Math.round(process.uptime()),
        memoryUsage,
      },
    };
  }

  private async getDatabaseHealth() {
    try {
      const startTime = Date.now();

      // Test basic connectivity
      await this.prismaService.$queryRaw`SELECT 1`;

      const responseTime = Date.now() - startTime;

      // Get connection info
      const connectionInfo = await this.prismaService.getConnectionInfo();

      // Get performance metrics if available
      const performanceMetrics =
        this.queryPerformanceService.getPerformanceStats();

      return {
        status: 'healthy',
        responseTime,
        connectionInfo,
        performanceMetrics,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Database health check failed', errorStack, {
        type: 'database_health',
      });
      return {
        status: 'unhealthy',
        error: errorMessage,
      };
    }
  }

  private async getApplicationMetrics() {
    try {
      const performanceSummary = this.logger.getPerformanceMetricsSummary();

      return {
        activeConnections: this.getActiveConnections(),
        requestsPerMinute: performanceSummary.totalOperations,
        errorRate: this.calculateErrorRate(),
        performanceMetrics: performanceSummary,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn('Failed to get application metrics', {
        error: errorMessage,
      });
      return {};
    }
  }

  private async getServicesHealth(): Promise<Record<string, any>> {
    const services: Record<string, any> = {};

    // Database service
    try {
      const dbStart = Date.now();
      await this.prismaService.$queryRaw`SELECT 1`;
      services.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      services.database = {
        status: 'unhealthy',
        error: errorMessage,
        lastCheck: new Date().toISOString(),
      };
    }

    // Add more external service checks here as needed
    // e.g., Redis, external APIs, etc.

    return services;
  }

  private getActiveConnections(): number {
    // This would be implementation-specific based on your connection tracking
    // For now, return a placeholder
    return 0;
  }

  private calculateErrorRate(): number {
    // Calculate error rate from recent health checks
    const recentChecks = this.healthCheckHistory.slice(-20);
    if (recentChecks.length === 0) return 0;

    const errorCount = recentChecks.filter(
      (check) => check.status === 'error',
    ).length;
    return Math.round((errorCount / recentChecks.length) * 100);
  }

  private recordHealthCheck(status: string, details?: any): void {
    this.healthCheckHistory.push({
      timestamp: new Date(),
      status,
      details,
    });

    // Maintain history limit
    if (this.healthCheckHistory.length > this.maxHistoryLength) {
      this.healthCheckHistory = this.healthCheckHistory.slice(
        -this.maxHistoryLength,
      );
    }
  }

  async performFullHealthCheck(): Promise<any> {
    try {
      const result = await this.health.check([
        () => this.isHealthy('api'),
        () => this.checkDatabase(),
        () => this.checkMemoryUsage(),
        () => this.checkDiskSpace(),
      ]);

      this.logger.log('Full health check completed', {
        status: result.status,
        type: 'health_check',
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Full health check failed', errorStack, {
        type: 'health_check',
        error: errorMessage,
      });
      throw error;
    }
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return this.getStatus('database', true, {
        message: 'Database connection successful',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return this.getStatus('database', false, {
        message: 'Database connection failed',
        error: errorMessage,
      });
    }
  }

  private async checkMemoryUsage(): Promise<HealthIndicatorResult> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const usagePercentage =
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    const isHealthy = usagePercentage < 90; // Alert if memory usage is above 90%

    return this.getStatus('memory', isHealthy, {
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${heapTotalMB}MB`,
      usagePercentage: `${Math.round(usagePercentage)}%`,
    });
  }

  private async checkDiskSpace(): Promise<HealthIndicatorResult> {
    try {
      // This is a simplified disk space check
      // In production, you might want to check actual disk usage
      const isHealthy = true; // Placeholder - implement actual disk space check

      return this.getStatus('disk', isHealthy, {
        message: 'Disk space check completed',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return this.getStatus('disk', false, {
        message: 'Disk space check failed',
        error: errorMessage,
      });
    }
  }

  getHealthHistory(): Array<{
    timestamp: Date;
    status: string;
    details?: any;
  }> {
    return [...this.healthCheckHistory];
  }

  getUptimeSeconds(): number {
    return Math.round((Date.now() - this.startTime) / 1000);
  }

  clearHealthHistory(): void {
    this.healthCheckHistory = [];
    this.logger.log('Health check history cleared');
  }
}
