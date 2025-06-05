import { Controller, Delete, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserExistsGuard } from '../../users/guards/user-exists.guard';
import { AppHealthService } from '../services/health.service';
import { AppLoggerService } from '../services/logger.service';
import { QueryPerformanceService } from '../services/query-performance.service';

@ApiTags('Monitoring')
@Controller('monitoring')
@UseGuards(JwtAuthGuard, UserExistsGuard)
@ApiBearerAuth('JWT-auth')
export class MonitoringController {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly healthService: AppHealthService,
    private readonly queryPerformanceService: QueryPerformanceService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Get basic health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  async getHealth() {
    try {
      const health = await this.healthService.performFullHealthCheck();

      this.logger.log('Health check requested', {
        type: 'monitoring_access',
        endpoint: 'health',
      });

      return {
        status: 'success',
        data: health,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Health check failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'health',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('health/detailed')
  @ApiOperation({ summary: 'Get detailed health report with system metrics' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health report retrieved successfully',
  })
  async getDetailedHealth() {
    try {
      const healthReport = await this.healthService.getDetailedHealth();

      this.logger.log('Detailed health check requested', {
        type: 'monitoring_access',
        endpoint: 'health/detailed',
      });

      return {
        status: 'success',
        data: healthReport,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Detailed health check failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'health/detailed',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('performance/stats')
  @ApiOperation({ summary: 'Get application performance statistics' })
  @ApiResponse({
    status: 200,
    description: 'Performance statistics retrieved successfully',
  })
  async getPerformanceStats() {
    try {
      const dbStats = this.queryPerformanceService.getPerformanceStats();
      const appMetrics = this.logger.getPerformanceMetricsSummary();

      this.logger.log('Performance stats requested', {
        type: 'monitoring_access',
        endpoint: 'performance/stats',
      });

      return {
        status: 'success',
        data: {
          database: dbStats,
          application: appMetrics,
          uptime: this.healthService.getUptimeSeconds(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Performance stats retrieval failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'performance/stats',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('performance/optimization-suggestions')
  @ApiOperation({ summary: 'Get performance optimization suggestions' })
  @ApiResponse({
    status: 200,
    description: 'Optimization suggestions retrieved successfully',
  })
  async getOptimizationSuggestions() {
    try {
      const suggestions =
        this.queryPerformanceService.getOptimizationSuggestions();

      this.logger.log('Optimization suggestions requested', {
        type: 'monitoring_access',
        endpoint: 'performance/optimization-suggestions',
      });

      return {
        status: 'success',
        data: {
          suggestions,
          generatedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Optimization suggestions retrieval failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'performance/optimization-suggestions',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('metrics/summary')
  @ApiOperation({ summary: 'Get comprehensive metrics summary' })
  @ApiResponse({
    status: 200,
    description: 'Metrics summary retrieved successfully',
  })
  async getMetricsSummary() {
    try {
      const performanceMetrics = this.logger.getPerformanceMetrics();
      const healthHistory = this.healthService.getHealthHistory();
      const dbPerformance = this.queryPerformanceService.getPerformanceStats();

      const summary = {
        performance: {
          totalOperations: performanceMetrics.length,
          averageResponseTime:
            performanceMetrics.length > 0
              ? Math.round(
                  performanceMetrics.reduce((sum, m) => sum + m.duration, 0) /
                    performanceMetrics.length,
                )
              : 0,
          slowOperations: performanceMetrics.filter((m) => m.duration > 1000)
            .length,
        },
        health: {
          totalChecks: healthHistory.length,
          successfulChecks: healthHistory.filter((h) => h.status === 'ok')
            .length,
          errorRate:
            healthHistory.length > 0
              ? Math.round(
                  (healthHistory.filter((h) => h.status === 'error').length /
                    healthHistory.length) *
                    100,
                )
              : 0,
        },
        database: dbPerformance,
        uptime: this.healthService.getUptimeSeconds(),
      };

      this.logger.log('Metrics summary requested', {
        type: 'monitoring_access',
        endpoint: 'metrics/summary',
      });

      return {
        status: 'success',
        data: summary,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Metrics summary retrieval failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'metrics/summary',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('system/info')
  @ApiOperation({ summary: 'Get system information and environment details' })
  @ApiResponse({
    status: 200,
    description: 'System information retrieved successfully',
  })
  async getSystemInfo() {
    try {
      const systemInfo = {
        application: {
          name: 'simple-todo-app',
          version: process.env.APP_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          uptime: this.healthService.getUptimeSeconds(),
          startedAt: new Date(
            Date.now() - this.healthService.getUptimeSeconds() * 1000,
          ).toISOString(),
        },
        runtime: {
          node: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
        },
        memory: {
          usage: process.memoryUsage(),
          formattedUsage: {
            heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
            external: `${Math.round(process.memoryUsage().external / 1024 / 1024)}MB`,
          },
        },
      };

      this.logger.log('System info requested', {
        type: 'monitoring_access',
        endpoint: 'system/info',
      });

      return {
        status: 'success',
        data: systemInfo,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'System info retrieval failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'system/info',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Delete('metrics/clear')
  @ApiOperation({ summary: 'Clear performance metrics and health history' })
  @ApiResponse({ status: 200, description: 'Metrics cleared successfully' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['performance', 'health', 'database', 'all'],
    description: 'Type of metrics to clear',
  })
  async clearMetrics(@Query('type') type: string = 'all') {
    try {
      const cleared: string[] = [];

      if (type === 'performance' || type === 'all') {
        this.logger.clearPerformanceMetrics();
        cleared.push('performance');
      }

      if (type === 'health' || type === 'all') {
        this.healthService.clearHealthHistory();
        cleared.push('health');
      }

      if (type === 'database' || type === 'all') {
        this.queryPerformanceService.clearMetrics();
        cleared.push('database');
      }

      this.logger.log('Metrics cleared', {
        type: 'monitoring_maintenance',
        endpoint: 'metrics/clear',
        clearedTypes: cleared,
      });

      return {
        status: 'success',
        data: {
          message: 'Metrics cleared successfully',
          clearedTypes: cleared,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Metrics clearing failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'metrics/clear',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('logs/recent')
  @ApiOperation({ summary: 'Get recent application logs summary' })
  @ApiResponse({
    status: 200,
    description: 'Recent logs summary retrieved successfully',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recent operations to include (max 100)',
  })
  async getRecentLogs(@Query('limit') limit: string = '50') {
    try {
      const limitNum = Math.min(parseInt(limit) || 50, 100);
      const performanceMetrics = this.logger
        .getPerformanceMetrics()
        .slice(-limitNum);
      const healthHistory = this.healthService
        .getHealthHistory()
        .slice(-limitNum);

      const summary = {
        recentOperations: performanceMetrics.map((metric) => ({
          operation: metric.operation,
          duration: metric.duration,
          timestamp: metric.timestamp,
          metadata: metric.metadata,
        })),
        recentHealthChecks: healthHistory.map((check) => ({
          status: check.status,
          timestamp: check.timestamp,
          details: check.details,
        })),
        summary: {
          totalOperations: performanceMetrics.length,
          averageDuration:
            performanceMetrics.length > 0
              ? Math.round(
                  performanceMetrics.reduce((sum, m) => sum + m.duration, 0) /
                    performanceMetrics.length,
                )
              : 0,
          slowOperations: performanceMetrics.filter((m) => m.duration > 1000)
            .length,
        },
      };

      this.logger.log('Recent logs requested', {
        type: 'monitoring_access',
        endpoint: 'logs/recent',
        limit: limitNum,
      });

      return {
        status: 'success',
        data: summary,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Recent logs retrieval failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'logs/recent',
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
