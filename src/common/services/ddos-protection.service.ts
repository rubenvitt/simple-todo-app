import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

interface TrafficPattern {
  timestamp: number;
  requestCount: number;
  endpoint: string;
  userAgent: string;
  ip: string;
}

@Injectable()
export class DdosProtectionService {
  private readonly logger = new Logger(DdosProtectionService.name);
  private readonly trafficLog: TrafficPattern[] = [];
  private readonly anomalyThreshold: number;
  private readonly suspiciousPatterns = new Map<string, number>();

  constructor(private readonly configService: ConfigService) {
    this.anomalyThreshold =
      this.configService.get('rateLimit.global.max', 100) * 10;
  }

  recordTraffic(ip: string, endpoint: string, userAgent: string): void {
    const pattern: TrafficPattern = {
      timestamp: Date.now(),
      requestCount: 1,
      endpoint,
      userAgent,
      ip,
    };

    this.trafficLog.push(pattern);
    this.analyzeTrafficPattern(ip, endpoint, userAgent);
  }

  private analyzeTrafficPattern(
    ip: string,
    endpoint: string,
    userAgent: string,
  ): void {
    const now = Date.now();
    const timeWindow = 60 * 1000; // 1 minute

    // Count requests from same IP in the last minute
    const recentRequests = this.trafficLog.filter(
      (log) => log.ip === ip && now - log.timestamp < timeWindow,
    ).length;

    // Detect potential DDoS patterns
    if (this.isDdosPattern(ip, endpoint, userAgent, recentRequests)) {
      this.handleSuspiciousActivity(ip, endpoint, userAgent);
    }
  }

  private isDdosPattern(
    ip: string,
    endpoint: string,
    userAgent: string,
    requestCount: number,
  ): boolean {
    // Multiple detection criteria

    // 1. Excessive requests from single IP
    if (requestCount > this.anomalyThreshold) {
      this.logger.warn(
        `Excessive requests detected from IP: ${ip} (${requestCount} requests)`,
      );
      return true;
    }

    // 2. Suspicious user agent patterns
    const suspiciousAgents = [
      'bot',
      'crawler',
      'spider',
      'scraper',
      'curl',
      'wget',
      'python-requests',
    ];

    if (
      suspiciousAgents.some((agent) => userAgent.toLowerCase().includes(agent))
    ) {
      this.logger.warn(
        `Suspicious user agent detected: ${userAgent} from ${ip}`,
      );
      return true;
    }

    // 3. Repeated requests to same endpoint
    const now = Date.now();
    const endpointRequests = this.trafficLog.filter(
      (log) =>
        log.ip === ip &&
        log.endpoint === endpoint &&
        now - log.timestamp < 30 * 1000, // 30 seconds
    ).length;

    if (endpointRequests > 50) {
      this.logger.warn(
        `Endpoint flooding detected: ${endpoint} from ${ip} (${endpointRequests} requests)`,
      );
      return true;
    }

    return false;
  }

  private handleSuspiciousActivity(
    ip: string,
    endpoint: string,
    userAgent: string,
  ): void {
    const key = `${ip}:${endpoint}`;
    const count = this.suspiciousPatterns.get(key) || 0;
    this.suspiciousPatterns.set(key, count + 1);

    this.logger.warn(
      `Suspicious activity detected: IP=${ip}, Endpoint=${endpoint}, UserAgent=${userAgent}`,
    );

    // Additional alerting could be implemented here
    // For example: send notifications, update firewall rules, etc.
  }

  // Clean up old traffic logs to prevent memory leaks
  @Cron(CronExpression.EVERY_5_MINUTES)
  private cleanupTrafficLogs(): void {
    const now = Date.now();
    const retention = 60 * 60 * 1000; // Keep logs for 1 hour

    const initialLength = this.trafficLog.length;

    // Remove old entries
    while (
      this.trafficLog.length > 0 &&
      now - this.trafficLog[0].timestamp > retention
    ) {
      this.trafficLog.shift();
    }

    const removedCount = initialLength - this.trafficLog.length;
    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} old traffic log entries`);
    }
  }

  // Get traffic statistics for monitoring
  getTrafficStats(): {
    totalRequests: number;
    uniqueIps: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    suspiciousPatterns: number;
  } {
    const uniqueIps = new Set(this.trafficLog.map((log) => log.ip)).size;

    const endpointCounts = this.trafficLog.reduce(
      (acc, log) => {
        acc[log.endpoint] = (acc[log.endpoint] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests: this.trafficLog.length,
      uniqueIps,
      topEndpoints,
      suspiciousPatterns: this.suspiciousPatterns.size,
    };
  }

  // Get current suspicious patterns
  getSuspiciousPatterns(): Record<string, number> {
    return Object.fromEntries(this.suspiciousPatterns);
  }
}
