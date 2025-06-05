import { Injectable } from '@nestjs/common';
import { AppLoggerService } from './logger.service';

export interface ErrorReport {
  id: string;
  timestamp: Date;
  level: 'error' | 'warning' | 'critical';
  type: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  occurrenceCount?: number;
  firstOccurrence?: Date;
  lastOccurrence?: Date;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByLevel: Record<string, number>;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  errorRate: number;
  averageResponseTime?: number;
  timeRange: string;
  mostFrequentErrors: Array<{
    type: string;
    count: number;
    message: string;
    lastOccurrence: Date;
  }>;
}

@Injectable()
export class ErrorTrackingService {
  private errorReports: Map<string, ErrorReport> = new Map();
  private readonly maxErrorHistory = 1000;
  private readonly errorRetentionHours = 168; // 7 days

  constructor(private readonly logger: AppLoggerService) {
    // Clean up old errors periodically
    setInterval(() => this.cleanupOldErrors(), 60 * 60 * 1000); // Every hour
  }

  trackError(
    error: Error | string,
    context?: {
      type?: string;
      level?: 'error' | 'warning' | 'critical';
      userId?: string;
      sessionId?: string;
      requestId?: string;
      userAgent?: string;
      ip?: string;
      endpoint?: string;
      method?: string;
      statusCode?: number;
      responseTime?: number;
      additionalContext?: Record<string, any>;
    },
  ): string {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Generate unique error ID based on type and message
    const errorSignature = this.generateErrorSignature(
      context?.type || 'unknown',
      errorMessage,
      context?.endpoint,
    );

    const existingError = this.errorReports.get(errorSignature);
    const now = new Date();

    if (existingError) {
      // Update existing error
      existingError.occurrenceCount = (existingError.occurrenceCount || 1) + 1;
      existingError.lastOccurrence = now;
      existingError.timestamp = now; // Update to latest occurrence

      // Update context if provided
      if (context?.additionalContext) {
        existingError.context = {
          ...existingError.context,
          ...context.additionalContext,
        };
      }

      this.logger.warn('Recurring error detected', {
        errorId: errorSignature,
        occurrenceCount: existingError.occurrenceCount,
        type: 'error_tracking',
        error: errorMessage,
      });
    } else {
      // Create new error report
      const errorReport: ErrorReport = {
        id: errorSignature,
        timestamp: now,
        level: context?.level || 'error',
        type: context?.type || this.classifyError(errorMessage),
        message: errorMessage,
        stack: errorStack,
        context: context?.additionalContext,
        userId: context?.userId,
        sessionId: context?.sessionId,
        requestId: context?.requestId,
        userAgent: context?.userAgent,
        ip: context?.ip,
        endpoint: context?.endpoint,
        method: context?.method,
        statusCode: context?.statusCode,
        responseTime: context?.responseTime,
        resolved: false,
        occurrenceCount: 1,
        firstOccurrence: now,
        lastOccurrence: now,
      };

      this.errorReports.set(errorSignature, errorReport);

      this.logger.error('New error tracked', errorStack, {
        errorId: errorSignature,
        type: 'error_tracking',
        level: errorReport.level,
        endpoint: context?.endpoint,
      });

      // Maintain error history limit
      if (this.errorReports.size > this.maxErrorHistory) {
        this.pruneOldErrors();
      }
    }

    return errorSignature;
  }

  getErrorReport(errorId: string): ErrorReport | undefined {
    return this.errorReports.get(errorId);
  }

  getAllErrors(filters?: {
    level?: 'error' | 'warning' | 'critical';
    type?: string;
    resolved?: boolean;
    userId?: string;
    endpoint?: string;
    hours?: number;
  }): ErrorReport[] {
    let errors = Array.from(this.errorReports.values());

    if (filters) {
      if (filters.level) {
        errors = errors.filter((error) => error.level === filters.level);
      }
      if (filters.type) {
        errors = errors.filter((error) => error.type === filters.type);
      }
      if (filters.resolved !== undefined) {
        errors = errors.filter((error) => error.resolved === filters.resolved);
      }
      if (filters.userId) {
        errors = errors.filter((error) => error.userId === filters.userId);
      }
      if (filters.endpoint) {
        errors = errors.filter((error) => error.endpoint === filters.endpoint);
      }
      if (filters.hours) {
        const cutoffTime = new Date(
          Date.now() - filters.hours * 60 * 60 * 1000,
        );
        errors = errors.filter((error) => error.timestamp >= cutoffTime);
      }
    }

    return errors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getErrorStats(hours: number = 24): ErrorStats {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentErrors = Array.from(this.errorReports.values()).filter(
      (error) => error.timestamp >= cutoffTime,
    );

    const errorsByLevel: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};
    const errorsByEndpoint: Record<string, number> = {};
    const errorFrequency: Map<
      string,
      { count: number; message: string; lastOccurrence: Date }
    > = new Map();

    let totalResponseTime = 0;
    let responseTimeCount = 0;

    recentErrors.forEach((error) => {
      // Count by level
      errorsByLevel[error.level] =
        (errorsByLevel[error.level] || 0) + (error.occurrenceCount || 1);

      // Count by type
      errorsByType[error.type] =
        (errorsByType[error.type] || 0) + (error.occurrenceCount || 1);

      // Count by endpoint
      if (error.endpoint) {
        errorsByEndpoint[error.endpoint] =
          (errorsByEndpoint[error.endpoint] || 0) +
          (error.occurrenceCount || 1);
      }

      // Track error frequency
      const existing = errorFrequency.get(error.type);
      if (existing) {
        existing.count += error.occurrenceCount || 1;
        if (
          error.lastOccurrence &&
          error.lastOccurrence > existing.lastOccurrence
        ) {
          existing.lastOccurrence = error.lastOccurrence;
        }
      } else {
        errorFrequency.set(error.type, {
          count: error.occurrenceCount || 1,
          message: error.message,
          lastOccurrence: error.lastOccurrence || error.timestamp,
        });
      }

      // Calculate response time averages
      if (error.responseTime) {
        totalResponseTime += error.responseTime;
        responseTimeCount++;
      }
    });

    // Get most frequent errors
    const mostFrequentErrors = Array.from(errorFrequency.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalErrorCount = recentErrors.reduce(
      (sum, error) => sum + (error.occurrenceCount || 1),
      0,
    );
    const totalRequests = this.logger.getPerformanceMetrics().length; // Approximate
    const errorRate =
      totalRequests > 0
        ? Math.round((totalErrorCount / totalRequests) * 100)
        : 0;

    return {
      totalErrors: totalErrorCount,
      errorsByLevel,
      errorsByType,
      errorsByEndpoint,
      errorRate,
      averageResponseTime:
        responseTimeCount > 0
          ? Math.round(totalResponseTime / responseTimeCount)
          : undefined,
      timeRange: `${hours} hours`,
      mostFrequentErrors,
    };
  }

  resolveError(errorId: string, resolvedBy?: string): boolean {
    const error = this.errorReports.get(errorId);
    if (error) {
      error.resolved = true;
      error.resolvedAt = new Date();
      error.resolvedBy = resolvedBy;

      this.logger.log('Error marked as resolved', {
        errorId,
        resolvedBy,
        type: 'error_tracking',
      });

      return true;
    }
    return false;
  }

  clearErrors(filters?: { resolved?: boolean; hours?: number }): number {
    let clearedCount = 0;
    const errorIds = Array.from(this.errorReports.keys());

    for (const errorId of errorIds) {
      const error = this.errorReports.get(errorId);
      if (!error) continue;

      let shouldClear = true;

      if (
        filters?.resolved !== undefined &&
        error.resolved !== filters.resolved
      ) {
        shouldClear = false;
      }

      if (filters?.hours) {
        const cutoffTime = new Date(
          Date.now() - filters.hours * 60 * 60 * 1000,
        );
        if (error.timestamp >= cutoffTime) {
          shouldClear = false;
        }
      }

      if (shouldClear) {
        this.errorReports.delete(errorId);
        clearedCount++;
      }
    }

    this.logger.log('Errors cleared', {
      clearedCount,
      type: 'error_tracking',
      filters,
    });

    return clearedCount;
  }

  private generateErrorSignature(
    type: string,
    message: string,
    endpoint?: string,
  ): string {
    const baseSignature = `${type}:${message.substring(0, 100)}`;
    const hash = this.simpleHash(baseSignature + (endpoint || ''));
    return `err_${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private classifyError(errorMessage: string): string {
    const lowerMessage = errorMessage.toLowerCase();

    if (
      lowerMessage.includes('validation') ||
      lowerMessage.includes('invalid')
    ) {
      return 'validation';
    }
    if (lowerMessage.includes('database') || lowerMessage.includes('sql')) {
      return 'database';
    }
    if (
      lowerMessage.includes('auth') ||
      lowerMessage.includes('unauthorized')
    ) {
      return 'authentication';
    }
    if (
      lowerMessage.includes('permission') ||
      lowerMessage.includes('forbidden')
    ) {
      return 'authorization';
    }
    if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('connection')
    ) {
      return 'network';
    }
    if (lowerMessage.includes('timeout')) {
      return 'timeout';
    }
    if (lowerMessage.includes('memory') || lowerMessage.includes('heap')) {
      return 'memory';
    }
    if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
      return 'not_found';
    }

    return 'application';
  }

  private cleanupOldErrors(): void {
    const cutoffTime = new Date(
      Date.now() - this.errorRetentionHours * 60 * 60 * 1000,
    );
    let cleanedCount = 0;

    for (const [errorId, error] of this.errorReports.entries()) {
      if (error.timestamp < cutoffTime) {
        this.errorReports.delete(errorId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log('Cleaned up old errors', {
        cleanedCount,
        type: 'error_tracking',
        retentionHours: this.errorRetentionHours,
      });
    }
  }

  private pruneOldErrors(): void {
    const errorArray = Array.from(this.errorReports.entries());
    errorArray.sort(
      (a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime(),
    );

    // Keep only the most recent errors
    const toKeep = errorArray.slice(0, this.maxErrorHistory);
    this.errorReports.clear();

    toKeep.forEach(([id, error]) => {
      this.errorReports.set(id, error);
    });

    this.logger.log('Pruned error history', {
      keptCount: toKeep.length,
      type: 'error_tracking',
    });
  }
}
