import { Injectable, Logger } from '@nestjs/common';

export interface QueryPerformanceMetrics {
    query: string;
    duration: number;
    timestamp: Date;
    params?: any;
    model?: string;
    operation?: string;
    recordCount?: number;
}

export interface SlowQueryAlert {
    query: string;
    duration: number;
    threshold: number;
    timestamp: Date;
    model?: string;
    operation?: string;
}

@Injectable()
export class QueryPerformanceService {
    private readonly logger = new Logger(QueryPerformanceService.name);
    private readonly slowQueryThresholdMs = 1000; // 1 second threshold
    private readonly performanceMetrics: QueryPerformanceMetrics[] = [];
    private readonly maxMetricsHistory = 1000; // Keep last 1000 queries

    /**
     * Track query performance and detect slow queries
     */
    async trackQuery<T>(
        queryFn: () => Promise<T>,
        queryInfo: {
            query: string;
            params?: any;
            model?: string;
            operation?: string;
        },
    ): Promise<T> {
        const startTime = Date.now();
        let result: T;
        let recordCount: number | undefined;

        try {
            result = await queryFn();

            // Try to determine record count
            if (Array.isArray(result)) {
                recordCount = result.length;
            } else if (result && typeof result === 'object' && 'data' in result) {
                const data = (result as any).data;
                if (Array.isArray(data)) {
                    recordCount = data.length;
                }
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(
                `Query failed after ${duration}ms: ${queryInfo.query}`,
                error,
            );
            throw error;
        }

        const duration = Date.now() - startTime;

        // Record metrics
        this.recordMetrics({
            ...queryInfo,
            duration,
            timestamp: new Date(),
            recordCount,
        });

        // Check for slow queries
        if (duration > this.slowQueryThresholdMs) {
            this.alertSlowQuery({
                ...queryInfo,
                duration,
                threshold: this.slowQueryThresholdMs,
                timestamp: new Date(),
            });
        }

        return result;
    }

    /**
     * Record performance metrics
     */
    private recordMetrics(metrics: QueryPerformanceMetrics): void {
        this.performanceMetrics.push(metrics);

        // Keep only recent metrics to prevent memory bloat
        if (this.performanceMetrics.length > this.maxMetricsHistory) {
            this.performanceMetrics.shift();
        }

        // Log query performance in development
        if (process.env.NODE_ENV === 'development') {
            this.logger.debug(
                `Query executed in ${metrics.duration}ms: ${metrics.query}${metrics.recordCount !== undefined ? ` (${metrics.recordCount} records)` : ''
                }`,
            );
        }
    }

    /**
     * Alert about slow queries
     */
    private alertSlowQuery(alert: SlowQueryAlert): void {
        this.logger.warn(
            `Slow query detected (${alert.duration}ms > ${alert.threshold}ms): ${alert.query}`,
            {
                model: alert.model,
                operation: alert.operation,
                duration: alert.duration,
                threshold: alert.threshold,
            },
        );
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats(): {
        totalQueries: number;
        averageDuration: number;
        slowQueries: number;
        queriesByModel: Record<string, number>;
        queriesByOperation: Record<string, number>;
        recentSlowQueries: SlowQueryAlert[];
    } {
        const totalQueries = this.performanceMetrics.length;
        const averageDuration = totalQueries > 0
            ? this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
            : 0;

        const slowQueries = this.performanceMetrics.filter(
            m => m.duration > this.slowQueryThresholdMs,
        ).length;

        const queriesByModel: Record<string, number> = {};
        const queriesByOperation: Record<string, number> = {};

        this.performanceMetrics.forEach(metric => {
            if (metric.model) {
                queriesByModel[metric.model] = (queriesByModel[metric.model] || 0) + 1;
            }
            if (metric.operation) {
                queriesByOperation[metric.operation] = (queriesByOperation[metric.operation] || 0) + 1;
            }
        });

        const recentSlowQueries = this.performanceMetrics
            .filter(m => m.duration > this.slowQueryThresholdMs)
            .slice(-10) // Last 10 slow queries
            .map(m => ({
                query: m.query,
                duration: m.duration,
                threshold: this.slowQueryThresholdMs,
                timestamp: m.timestamp,
                model: m.model,
                operation: m.operation,
            }));

        return {
            totalQueries,
            averageDuration: Math.round(averageDuration * 100) / 100,
            slowQueries,
            queriesByModel,
            queriesByOperation,
            recentSlowQueries,
        };
    }

    /**
     * Clear metrics history
     */
    clearMetrics(): void {
        this.performanceMetrics.splice(0);
        this.logger.log('Performance metrics cleared');
    }

    /**
     * Get optimized query suggestions based on performance data
     */
    getOptimizationSuggestions(): string[] {
        const stats = this.getPerformanceStats();
        const suggestions: string[] = [];

        if (stats.slowQueries > stats.totalQueries * 0.1) {
            suggestions.push(
                'High number of slow queries detected. Consider adding database indexes for frequently filtered fields.',
            );
        }

        if (stats.averageDuration > 500) {
            suggestions.push(
                'Average query duration is high. Review query complexity and database indexes.',
            );
        }

        const mostUsedModels = Object.entries(stats.queriesByModel)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);

        mostUsedModels.forEach(([model, count]) => {
            if (count > stats.totalQueries * 0.3) {
                suggestions.push(
                    `Model "${model}" has high query volume (${count} queries). Consider implementing caching or query optimization.`,
                );
            }
        });

        return suggestions;
    }
} 