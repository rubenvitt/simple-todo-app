import { Controller, Delete, Get } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get database performance statistics
   */
  @Get('stats')
  async getPerformanceStats() {
    const stats = this.prisma.getPerformanceStats();
    const connectionInfo = this.prisma.getConnectionInfo();

    return {
      database: {
        connection: connectionInfo,
        performance: stats,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get optimization suggestions
   */
  @Get('suggestions')
  async getOptimizationSuggestions() {
    const suggestions = this.prisma.getOptimizationSuggestions();

    return {
      suggestions,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Database health check
   */
  @Get('health')
  async healthCheck() {
    const health = await this.prisma.healthCheck();
    const connectionInfo = this.prisma.getConnectionInfo();

    return {
      ...health,
      connection: {
        isConnected: connectionInfo.isConnected,
        nodeEnv: connectionInfo.nodeEnv,
      },
    };
  }

  /**
   * Clear performance metrics (development only)
   */
  @Delete('metrics')
  async clearMetrics() {
    if (process.env.NODE_ENV !== 'development') {
      return {
        error: 'Metrics clearing is only available in development mode',
        statusCode: 403,
      };
    }

    this.prisma.clearPerformanceMetrics();

    return {
      message: 'Performance metrics cleared successfully',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get detailed performance report
   */
  @Get('report')
  async getDetailedReport() {
    const stats = this.prisma.getPerformanceStats();
    const suggestions = this.prisma.getOptimizationSuggestions();
    const connectionInfo = this.prisma.getConnectionInfo();
    const health = await this.prisma.healthCheck();

    return {
      overview: {
        status: health.status,
        totalQueries: stats.totalQueries,
        averageDuration: stats.averageDuration,
        slowQueries: stats.slowQueries,
        slowQueryPercentage:
          stats.totalQueries > 0
            ? Math.round((stats.slowQueries / stats.totalQueries) * 100 * 100) /
              100
            : 0,
      },
      performance: {
        queryStats: stats,
        recentSlowQueries: stats.recentSlowQueries,
      },
      optimization: {
        suggestions,
        recommendedActions: this.getRecommendedActions(stats),
      },
      database: {
        connection: connectionInfo,
        health,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private getRecommendedActions(stats: any): string[] {
    const actions: string[] = [];

    if (stats.slowQueries > 0) {
      actions.push('Review slow queries and consider adding database indexes');
    }

    if (stats.averageDuration > 1000) {
      actions.push(
        'Average query time is very high - investigate database performance',
      );
    }

    if (stats.totalQueries > 1000) {
      actions.push(
        'High query volume detected - consider implementing caching strategies',
      );
    }

    // Check for high usage patterns
    const topModels = Object.entries(stats.queriesByModel)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3);

    topModels.forEach(([model, count]) => {
      if ((count as number) > stats.totalQueries * 0.3) {
        actions.push(
          `High query volume for ${model} model - consider optimization`,
        );
      }
    });

    if (actions.length === 0) {
      actions.push(
        'Database performance looks healthy - no immediate actions needed',
      );
    }

    return actions;
  }
}
