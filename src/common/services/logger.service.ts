import {
  Injectable,
  LoggerService as NestLoggerService,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LogContext {
  requestId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private readonly logger = new Logger('AppLoggerService');
  private performanceMetrics: PerformanceMetric[] = [];
  private readonly maxMetricsHistory = 1000;

  constructor(private readonly configService: ConfigService) {
    // NestJS Logger verwendet automatisch die LOG_LEVEL Umgebungsvariable
  }

  private formatLogMessage(message: string, context?: LogContext): string {
    const env = this.configService.get('NODE_ENV') || 'development';
    const isProduction = env === 'production';

    if (isProduction && context) {
      // In Production: JSON Format für strukturierte Logs
      return JSON.stringify({
        message,
        timestamp: new Date().toISOString(),
        service: 'simple-todo-app',
        environment: env,
        ...context,
      });
    }

    // In Development: Lesbares Format mit optionalen Metadaten
    if (context && Object.keys(context).length > 0) {
      const { requestId, userId, operation, duration, statusCode, ...rest } =
        context;
      const parts = [message];

      if (requestId) parts.push(`[ReqID: ${requestId}]`);
      if (userId) parts.push(`[User: ${userId}]`);
      if (operation) parts.push(`[Op: ${operation}]`);
      if (duration !== undefined) parts.push(`[${duration}ms]`);
      if (statusCode) parts.push(`[${statusCode}]`);

      if (Object.keys(rest).length > 0) {
        parts.push(`\n${JSON.stringify(rest, null, 2)}`);
      }

      return parts.join(' ');
    }

    return message;
  }

  log(message: string, context?: LogContext | string): void {
    if (typeof context === 'string') {
      this.logger.log(message, context);
    } else {
      this.logger.log(this.formatLogMessage(message, context));
    }
  }

  error(message: string, trace?: string, context?: LogContext | string): void {
    if (typeof context === 'string') {
      this.logger.error(message, trace, context);
    } else {
      const formattedMessage = this.formatLogMessage(message, {
        ...context,
        trace,
      });
      this.logger.error(formattedMessage, trace);
    }
  }

  warn(message: string, context?: LogContext | string): void {
    if (typeof context === 'string') {
      this.logger.warn(message, context);
    } else {
      this.logger.warn(this.formatLogMessage(message, context));
    }
  }

  debug(message: string, context?: LogContext | string): void {
    if (typeof context === 'string') {
      this.logger.debug(message, context);
    } else {
      this.logger.debug(this.formatLogMessage(message, context));
    }
  }

  verbose(message: string, context?: LogContext | string): void {
    if (typeof context === 'string') {
      this.logger.verbose(message, context);
    } else {
      this.logger.verbose(this.formatLogMessage(message, context));
    }
  }

  // HTTP Request Logging
  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext,
  ): void {
    const logContext: LogContext = {
      ...context,
      method,
      url,
      statusCode,
      duration,
      type: 'http_request',
    };

    if (statusCode >= 400) {
      this.error(
        `HTTP ${method} ${url} - ${statusCode} (${duration}ms)`,
        undefined,
        logContext,
      );
    } else {
      this.log(
        `HTTP ${method} ${url} - ${statusCode} (${duration}ms)`,
        logContext,
      );
    }
  }

  // Database Query Logging
  logDatabaseQuery(
    operation: string,
    model: string,
    duration: number,
    context?: LogContext,
  ): void {
    const logContext: LogContext = {
      ...context,
      operation,
      model,
      duration,
      type: 'database_query',
    };

    if (duration > 1000) {
      this.warn(
        `Slow query detected: ${operation} on ${model} (${duration}ms)`,
        logContext,
      );
    } else {
      this.debug(
        `DB Query: ${operation} on ${model} (${duration}ms)`,
        logContext,
      );
    }
  }

  // Business Logic Logging
  logBusinessEvent(
    event: string,
    details: Record<string, any>,
    context?: LogContext,
  ): void {
    const logContext: LogContext = {
      ...context,
      event,
      details,
      type: 'business_event',
    };

    this.log(`Business Event: ${event}`, logContext);
  }

  // Security Event Logging
  logSecurityEvent(
    event: string,
    details: Record<string, any>,
    context?: LogContext,
  ): void {
    const logContext: LogContext = {
      ...context,
      event,
      details,
      type: 'security_event',
    };

    this.warn(`Security Event: ${event}`, logContext);
  }

  // Performance Metrics
  recordPerformanceMetric(
    operation: string,
    duration: number,
    metadata?: Record<string, any>,
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date(),
      metadata,
    };

    this.performanceMetrics.push(metric);

    // Maintain metrics history limit
    if (this.performanceMetrics.length > this.maxMetricsHistory) {
      this.performanceMetrics = this.performanceMetrics.slice(
        -this.maxMetricsHistory,
      );
    }

    // Log slow operations
    if (duration > 1000) {
      this.warn(`Slow operation detected: ${operation} (${duration}ms)`, {
        operation,
        duration,
        metadata,
        type: 'performance_metric',
      });
    }
  }

  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics];
  }

  getPerformanceMetricsSummary() {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const recentMetrics = this.performanceMetrics.filter(
      (m) => m.timestamp >= lastHour,
    );

    if (recentMetrics.length === 0) {
      return {
        period: 'last_hour',
        totalOperations: 0,
        averageDuration: 0,
        slowOperations: 0,
        operations: {},
      };
    }

    const operationStats = recentMetrics.reduce(
      (acc, metric) => {
        if (!acc[metric.operation]) {
          acc[metric.operation] = {
            count: 0,
            totalDuration: 0,
            slowCount: 0,
          };
        }

        acc[metric.operation].count++;
        acc[metric.operation].totalDuration += metric.duration;
        if (metric.duration > 1000) {
          acc[metric.operation].slowCount++;
        }

        return acc;
      },
      {} as Record<
        string,
        { count: number; totalDuration: number; slowCount: number }
      >,
    );

    const operations = Object.entries(operationStats).reduce(
      (acc, [op, stats]) => {
        acc[op] = {
          count: stats.count,
          averageDuration: Math.round(stats.totalDuration / stats.count),
          slowOperationsCount: stats.slowCount,
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      period: 'last_hour',
      totalOperations: recentMetrics.length,
      averageDuration: Math.round(
        recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
          recentMetrics.length,
      ),
      slowOperations: recentMetrics.filter((m) => m.duration > 1000).length,
      operations,
    };
  }

  clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
    this.log('Performance metrics cleared');
  }
}
