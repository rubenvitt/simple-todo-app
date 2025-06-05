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
import { ErrorTrackingService } from '../services/error-tracking.service';
import { DdosProtectionService } from '../services/ddos-protection.service';
// import { EnhancedRateLimitGuard } from '../guards/enhanced-rate-limit.guard';

@ApiTags('Monitoring')
@Controller('monitoring')
@UseGuards(JwtAuthGuard, UserExistsGuard)
@ApiBearerAuth('JWT-auth')
export class MonitoringController {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly healthService: AppHealthService,
    private readonly queryPerformanceService: QueryPerformanceService,
    private readonly errorTrackingService: ErrorTrackingService,
    private readonly ddosProtectionService: DdosProtectionService,
    // private readonly rateLimitGuard: EnhancedRateLimitGuard,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Get basic health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - health check failed',
  })
  async getHealth() {
    try {
      const health = await this.healthService.performFullHealthCheck();

      this.logger.log('Health check requested', {
        type: 'monitoring_access',
        endpoint: 'health',
        status: health.status,
      });

      const responseStatus = health.status === 'ok' ? 200 : 503;

      return {
        status: health.status === 'ok' ? 'success' : 'error',
        data: health,
        timestamp: new Date().toISOString(),
        responseCode: responseStatus,
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

      return {
        status: 'error',
        data: {
          status: 'error',
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        responseCode: 503,
      };
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

  @Get('errors/recent')
  @ApiOperation({ summary: 'Get recent error reports and statistics' })
  @ApiResponse({
    status: 200,
    description: 'Recent error reports retrieved successfully',
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    type: Number,
    description: 'Number of hours to look back (default: 24)',
  })
  async getRecentErrors(@Query('hours') hours: string = '24') {
    try {
      const hoursNum = Math.min(parseInt(hours) || 24, 168); // Max 7 days
      const cutoffTime = new Date(Date.now() - hoursNum * 60 * 60 * 1000);

      const healthHistory = this.healthService.getHealthHistory();
      const recentErrors = healthHistory.filter(
        (check) => check.timestamp >= cutoffTime && check.status === 'error',
      );

      const errorStats = {
        totalErrors: recentErrors.length,
        timeRange: `${hoursNum} hours`,
        errorRate:
          healthHistory.length > 0
            ? Math.round((recentErrors.length / healthHistory.length) * 100)
            : 0,
        errorsByType: this.categorizeErrors(recentErrors),
        recentErrors: recentErrors.slice(-20).map((error) => ({
          timestamp: error.timestamp,
          details: error.details,
          type: this.classifyErrorType(error.details),
        })),
      };

      this.logger.log('Recent errors requested', {
        type: 'monitoring_access',
        endpoint: 'errors/recent',
        timeRange: hoursNum,
        errorCount: recentErrors.length,
      });

      return {
        status: 'success',
        data: errorStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Recent errors retrieval failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'errors/recent',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('alerts/status')
  @ApiOperation({ summary: 'Get current alert status and thresholds' })
  @ApiResponse({
    status: 200,
    description: 'Alert status retrieved successfully',
  })
  async getAlertStatus() {
    try {
      const healthReport = await this.healthService.getDetailedHealth();
      const performanceMetrics = this.logger.getPerformanceMetricsSummary();

      const alerts = this.generateAlerts(healthReport, performanceMetrics);

      this.logger.log('Alert status requested', {
        type: 'monitoring_access',
        endpoint: 'alerts/status',
        activeAlerts: alerts.filter(
          (alert) =>
            alert.severity === 'critical' || alert.severity === 'warning',
        ).length,
      });

      return {
        status: 'success',
        data: {
          alerts,
          summary: {
            critical: alerts.filter((alert) => alert.severity === 'critical')
              .length,
            warning: alerts.filter((alert) => alert.severity === 'warning')
              .length,
            info: alerts.filter((alert) => alert.severity === 'info').length,
          },
          thresholds: {
            memory: { warning: 80, critical: 90 },
            responseTime: { warning: 1000, critical: 5000 },
            errorRate: { warning: 5, critical: 10 },
            diskSpace: { warning: 85, critical: 95 },
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Alert status retrieval failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'alerts/status',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  private categorizeErrors(errors: any[]): Record<string, number> {
    const categories: Record<string, number> = {};

    errors.forEach((error) => {
      const type = this.classifyErrorType(error.details);
      categories[type] = (categories[type] || 0) + 1;
    });

    return categories;
  }

  private classifyErrorType(errorDetails: any): string {
    if (!errorDetails) return 'unknown';

    const errorStr = JSON.stringify(errorDetails).toLowerCase();

    if (errorStr.includes('database') || errorStr.includes('connection')) {
      return 'database';
    }
    if (errorStr.includes('memory') || errorStr.includes('heap')) {
      return 'memory';
    }
    if (errorStr.includes('timeout') || errorStr.includes('timeout')) {
      return 'timeout';
    }
    if (errorStr.includes('auth') || errorStr.includes('permission')) {
      return 'authentication';
    }
    if (errorStr.includes('network') || errorStr.includes('http')) {
      return 'network';
    }

    return 'application';
  }

  private generateAlerts(healthReport: any, performanceMetrics: any): any[] {
    const alerts: any[] = [];

    // Memory usage alerts
    if (healthReport.system?.memory?.percentage > 90) {
      alerts.push({
        type: 'memory_usage',
        severity: 'critical',
        message: `Memory usage is critically high: ${healthReport.system.memory.percentage}%`,
        value: healthReport.system.memory.percentage,
        threshold: 90,
        timestamp: new Date().toISOString(),
      });
    } else if (healthReport.system?.memory?.percentage > 80) {
      alerts.push({
        type: 'memory_usage',
        severity: 'warning',
        message: `Memory usage is elevated: ${healthReport.system.memory.percentage}%`,
        value: healthReport.system.memory.percentage,
        threshold: 80,
        timestamp: new Date().toISOString(),
      });
    }

    // Database status alerts
    if (healthReport.database?.status === 'unhealthy') {
      alerts.push({
        type: 'database_connection',
        severity: 'critical',
        message: 'Database connection is unhealthy',
        details: healthReport.database.error,
        timestamp: new Date().toISOString(),
      });
    }

    // Application performance alerts
    if (performanceMetrics.averageDuration > 5000) {
      alerts.push({
        type: 'response_time',
        severity: 'critical',
        message: `Average response time is critically slow: ${performanceMetrics.averageDuration}ms`,
        value: performanceMetrics.averageDuration,
        threshold: 5000,
        timestamp: new Date().toISOString(),
      });
    } else if (performanceMetrics.averageDuration > 1000) {
      alerts.push({
        type: 'response_time',
        severity: 'warning',
        message: `Average response time is elevated: ${performanceMetrics.averageDuration}ms`,
        value: performanceMetrics.averageDuration,
        threshold: 1000,
        timestamp: new Date().toISOString(),
      });
    }

    // Error rate alerts
    const errorRate = healthReport.application?.errorRate || 0;
    if (errorRate > 10) {
      alerts.push({
        type: 'error_rate',
        severity: 'critical',
        message: `Error rate is critically high: ${errorRate}%`,
        value: errorRate,
        threshold: 10,
        timestamp: new Date().toISOString(),
      });
    } else if (errorRate > 5) {
      alerts.push({
        type: 'error_rate',
        severity: 'warning',
        message: `Error rate is elevated: ${errorRate}%`,
        value: errorRate,
        threshold: 5,
        timestamp: new Date().toISOString(),
      });
    }

    return alerts;
  }

  @Get('errors/stats')
  @ApiOperation({ summary: 'Get error statistics and analysis' })
  @ApiResponse({
    status: 200,
    description: 'Error statistics retrieved successfully',
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    type: Number,
    description: 'Number of hours to analyze (default: 24)',
  })
  async getErrorStats(@Query('hours') hours: string = '24') {
    try {
      const hoursNum = Math.min(parseInt(hours) || 24, 168); // Max 7 days
      const errorStats = this.errorTrackingService.getErrorStats(hoursNum);

      this.logger.log('Error statistics requested', {
        type: 'monitoring_access',
        endpoint: 'errors/stats',
        timeRange: hoursNum,
        totalErrors: errorStats.totalErrors,
      });

      return {
        status: 'success',
        data: errorStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Error statistics retrieval failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'errors/stats',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('errors/list')
  @ApiOperation({ summary: 'Get filtered list of errors' })
  @ApiResponse({
    status: 200,
    description: 'Error list retrieved successfully',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: ['error', 'warning', 'critical'],
    description: 'Filter by error level',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    description: 'Filter by error type',
  })
  @ApiQuery({
    name: 'resolved',
    required: false,
    type: Boolean,
    description: 'Filter by resolution status',
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    type: Number,
    description: 'Number of hours to look back (default: 24)',
  })
  async getErrorList(
    @Query('level') level?: 'error' | 'warning' | 'critical',
    @Query('type') type?: string,
    @Query('resolved') resolved?: string,
    @Query('hours') hours: string = '24',
  ) {
    try {
      const hoursNum = Math.min(parseInt(hours) || 24, 168);
      const resolvedBool =
        resolved === 'true' ? true : resolved === 'false' ? false : undefined;

      const errors = this.errorTrackingService.getAllErrors({
        level,
        type,
        resolved: resolvedBool,
        hours: hoursNum,
      });

      this.logger.log('Error list requested', {
        type: 'monitoring_access',
        endpoint: 'errors/list',
        filters: { level, type, resolved: resolvedBool, hours: hoursNum },
        resultCount: errors.length,
      });

      return {
        status: 'success',
        data: {
          errors: errors.slice(0, 100), // Limit to 100 most recent
          totalCount: errors.length,
          filters: { level, type, resolved: resolvedBool, hours: hoursNum },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Error list retrieval failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'errors/list',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('errors/:errorId')
  @ApiOperation({ summary: 'Get detailed information about a specific error' })
  @ApiResponse({
    status: 200,
    description: 'Error details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Error not found',
  })
  async getErrorDetails(@Query('errorId') errorId: string) {
    try {
      const errorReport = this.errorTrackingService.getErrorReport(errorId);

      if (!errorReport) {
        return {
          status: 'error',
          message: 'Error report not found',
          timestamp: new Date().toISOString(),
        };
      }

      this.logger.log('Error details requested', {
        type: 'monitoring_access',
        endpoint: 'errors/details',
        errorId,
      });

      return {
        status: 'success',
        data: errorReport,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Error details retrieval failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'errors/details',
          errorId,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Delete('errors/clear')
  @ApiOperation({ summary: 'Clear error reports based on filters' })
  @ApiResponse({
    status: 200,
    description: 'Errors cleared successfully',
  })
  @ApiQuery({
    name: 'resolved',
    required: false,
    type: Boolean,
    description: 'Clear only resolved/unresolved errors',
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    type: Number,
    description: 'Clear errors older than specified hours',
  })
  async clearErrors(
    @Query('resolved') resolved?: string,
    @Query('hours') hours?: string,
  ) {
    try {
      const resolvedBool =
        resolved === 'true' ? true : resolved === 'false' ? false : undefined;
      const hoursNum = hours ? Math.min(parseInt(hours), 168) : undefined;

      const clearedCount = this.errorTrackingService.clearErrors({
        resolved: resolvedBool,
        hours: hoursNum,
      });

      this.logger.log('Errors cleared', {
        type: 'monitoring_maintenance',
        endpoint: 'errors/clear',
        clearedCount,
        filters: { resolved: resolvedBool, hours: hoursNum },
      });

      return {
        status: 'success',
        data: {
          message: 'Errors cleared successfully',
          clearedCount,
          filters: { resolved: resolvedBool, hours: hoursNum },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Error clearing failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'errors/clear',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('uptime')
  @ApiOperation({
    summary: 'Get application uptime and availability statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Uptime statistics retrieved successfully',
  })
  async getUptimeStats() {
    try {
      const uptime = this.healthService.getUptimeSeconds();
      const healthHistory = this.healthService.getHealthHistory();

      // Calculate availability over different time periods
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const calculateAvailability = (since: Date) => {
        const relevantChecks = healthHistory.filter(
          (check) => check.timestamp >= since,
        );
        if (relevantChecks.length === 0) return 100;

        const healthyChecks = relevantChecks.filter(
          (check) => check.status === 'ok',
        );
        return (
          Math.round(
            (healthyChecks.length / relevantChecks.length) * 100 * 100,
          ) / 100
        );
      };

      const uptimeStats = {
        currentUptime: {
          seconds: uptime,
          formatted: this.formatUptime(uptime),
          startTime: new Date(Date.now() - uptime * 1000).toISOString(),
        },
        availability: {
          last24Hours: calculateAvailability(last24Hours),
          last7Days: calculateAvailability(last7Days),
          last30Days: calculateAvailability(last30Days),
        },
        healthChecks: {
          total: healthHistory.length,
          successful: healthHistory.filter((check) => check.status === 'ok')
            .length,
          failed: healthHistory.filter((check) => check.status === 'error')
            .length,
          lastCheck:
            healthHistory.length > 0
              ? healthHistory[healthHistory.length - 1].timestamp
              : null,
        },
        status: 'operational', // This could be determined by recent health checks
      };

      this.logger.log('Uptime statistics requested', {
        type: 'monitoring_access',
        endpoint: 'uptime',
        currentUptime: uptime,
      });

      return {
        status: 'success',
        data: uptimeStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Uptime statistics retrieval failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'uptime',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get comprehensive service status overview' })
  @ApiResponse({
    status: 200,
    description: 'Service status retrieved successfully',
  })
  async getServiceStatus() {
    try {
      const [healthReport, errorStats, uptimeStats] = await Promise.all([
        this.healthService.getDetailedHealth(),
        this.errorTrackingService.getErrorStats(24),
        this.getUptimeData(),
      ]);

      const performanceMetrics = this.logger.getPerformanceMetricsSummary();
      const alerts = this.generateAlerts(healthReport, performanceMetrics);
      const criticalAlerts = alerts.filter(
        (alert) => alert.severity === 'critical',
      );

      // Determine overall service status
      let overallStatus:
        | 'operational'
        | 'degraded'
        | 'major_outage'
        | 'maintenance';

      if (criticalAlerts.length > 0) {
        overallStatus = 'major_outage';
      } else if (
        healthReport.status === 'degraded' ||
        alerts.some((a) => a.severity === 'warning')
      ) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'operational';
      }

      const serviceStatus = {
        overall: {
          status: overallStatus,
          lastUpdated: new Date().toISOString(),
          uptime: uptimeStats.currentUptime,
        },
        components: {
          api: {
            status: healthReport.status === 'ok' ? 'operational' : 'degraded',
            responseTime: performanceMetrics.averageDuration,
            uptime: uptimeStats.availability.last24Hours,
          },
          database: {
            status:
              healthReport.database?.status === 'healthy'
                ? 'operational'
                : 'degraded',
            responseTime: (healthReport.database as any)?.connectivity
              ?.basicQuery?.responseTime,
            connectionPool: (healthReport.database as any)?.connectivity
              ?.connectionPool?.status,
          },
          authentication: {
            status: 'operational', // This could be enhanced with auth-specific health checks
            uptime: 99.9, // Placeholder
          },
          websockets: {
            status: 'operational', // This could be enhanced with WebSocket health checks
            activeConnections: healthReport.application?.activeConnections || 0,
          },
        },
        metrics: {
          errorRate: errorStats.errorRate,
          averageResponseTime: performanceMetrics.averageDuration,
          throughput: performanceMetrics.totalOperations,
          availability: uptimeStats.availability.last24Hours,
        },
        alerts: {
          critical: criticalAlerts.length,
          warning: alerts.filter((a) => a.severity === 'warning').length,
          recent: alerts.slice(0, 5),
        },
      };

      this.logger.log('Service status requested', {
        type: 'monitoring_access',
        endpoint: 'status',
        overallStatus,
        criticalAlerts: criticalAlerts.length,
      });

      return {
        status: 'success',
        data: serviceStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Service status retrieval failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'status',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${Math.floor(secs)}s`);

    return parts.join(' ');
  }

  private async getUptimeData() {
    const uptime = this.healthService.getUptimeSeconds();
    const healthHistory = this.healthService.getHealthHistory();

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const calculateAvailability = (since: Date) => {
      const relevantChecks = healthHistory.filter(
        (check) => check.timestamp >= since,
      );
      if (relevantChecks.length === 0) return 100;

      const healthyChecks = relevantChecks.filter(
        (check) => check.status === 'ok',
      );
      return (
        Math.round((healthyChecks.length / relevantChecks.length) * 100 * 100) /
        100
      );
    };

    return {
      currentUptime: {
        seconds: uptime,
        formatted: this.formatUptime(uptime),
      },
      availability: {
        last24Hours: calculateAvailability(last24Hours),
      },
    };
  }

  @Get('security/rate-limits')
  @ApiOperation({ summary: 'Get rate limiting statistics and blocked IPs' })
  @ApiResponse({
    status: 200,
    description: 'Rate limiting statistics retrieved successfully',
  })
  async getRateLimitStats() {
    try {
      const blockedIps: string[] = []; // this.rateLimitGuard.getBlockedIps();
      const suspiciousActivity: Record<string, number> = {}; // this.rateLimitGuard.getSuspiciousActivity();
      const trafficStats = this.ddosProtectionService.getTrafficStats();

      const rateLimitStats = {
        blockedIps: {
          count: blockedIps.length,
          list: blockedIps,
        },
        suspiciousActivity: {
          count: Object.keys(suspiciousActivity).length,
          details: suspiciousActivity,
        },
        trafficAnalysis: trafficStats,
        thresholds: {
          suspiciousActivityThreshold: 5,
          blockDuration: '30 minutes',
          cleanupInterval: '10 minutes',
        },
      };

      this.logger.log('Rate limit statistics requested', {
        type: 'monitoring_access',
        endpoint: 'security/rate-limits',
        blockedIps: blockedIps.length,
        suspiciousIps: Object.keys(suspiciousActivity).length,
      });

      return {
        status: 'success',
        data: rateLimitStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Rate limit statistics retrieval failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'security/rate-limits',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Get('security/ddos-protection')
  @ApiOperation({ summary: 'Get DDoS protection analysis and patterns' })
  @ApiResponse({
    status: 200,
    description: 'DDoS protection statistics retrieved successfully',
  })
  async getDdosProtectionStats() {
    try {
      const trafficStats = this.ddosProtectionService.getTrafficStats();
      const suspiciousPatterns =
        this.ddosProtectionService.getSuspiciousPatterns();

      const ddosStats = {
        traffic: trafficStats,
        threats: {
          suspiciousPatterns: Object.keys(suspiciousPatterns).length,
          patterns: suspiciousPatterns,
        },
        protection: {
          status: 'active',
          detectionCriteria: [
            'Excessive requests from single IP',
            'Suspicious user agent patterns',
            'Endpoint flooding detection',
            'Automated traffic patterns',
          ],
          thresholds: {
            maxRequestsPerMinute: 100,
            endpointFloodingThreshold: 50,
            suspiciousUserAgents: ['bot', 'crawler', 'spider', 'scraper'],
          },
        },
        mitigation: {
          automaticBlocking: true,
          blockDuration: '30 minutes',
          alerting: true,
        },
      };

      this.logger.log('DDoS protection statistics requested', {
        type: 'monitoring_access',
        endpoint: 'security/ddos-protection',
        suspiciousPatterns: Object.keys(suspiciousPatterns).length,
        totalRequests: trafficStats.totalRequests,
      });

      return {
        status: 'success',
        data: ddosStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'DDoS protection statistics retrieval failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'security/ddos-protection',
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  @Delete('security/blocked-ips/:ip')
  @ApiOperation({ summary: 'Manually unblock a specific IP address' })
  @ApiResponse({
    status: 200,
    description: 'IP address unblocked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'IP address not found in blocked list',
  })
  async unblockIp(@Query('ip') ip: string) {
    try {
      const blockedIps: string[] = []; // this.rateLimitGuard.getBlockedIps();

      if (!blockedIps.includes(ip)) {
        return {
          status: 'error',
          message: 'IP address not found in blocked list',
          timestamp: new Date().toISOString(),
        };
      }

      // this.rateLimitGuard.unblockIp(ip);

      this.logger.log('IP address manually unblocked', {
        type: 'security_action',
        endpoint: 'security/blocked-ips/unblock',
        ip,
        action: 'manual_unblock',
      });

      return {
        status: 'success',
        data: {
          message: 'IP address unblocked successfully',
          ip,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        'IP unblocking failed',
        error instanceof Error ? error.stack : undefined,
        {
          type: 'monitoring_error',
          endpoint: 'security/blocked-ips/unblock',
          ip,
          error: errorMessage,
        },
      );
      throw error;
    }
  }
}
