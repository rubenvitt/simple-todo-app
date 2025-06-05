import {
  ExecutionContext,
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
  ThrottlerRequest,
} from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class EnhancedRateLimitGuard extends ThrottlerGuard {
  private readonly logger = new Logger(EnhancedRateLimitGuard.name);
  private readonly suspiciousIps = new Map<string, number>();
  private readonly blockedIps = new Set<string>();

  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);

    // Check if IP is blocked
    if (this.blockedIps.has(clientIp)) {
      this.logger.warn(`Blocked IP attempted access: ${clientIp}`);
      throw new HttpException(
        'IP temporarily blocked due to suspicious activity',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return super.shouldSkip(context);
  }

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const request = requestProps.context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);

    try {
      const canProceed = await super.handleRequest(requestProps);

      if (!canProceed) {
        this.trackSuspiciousActivity(clientIp);
      }

      return canProceed;
    } catch (error) {
      this.trackSuspiciousActivity(clientIp);
      throw error;
    }
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private trackSuspiciousActivity(ip: string): void {
    const currentCount = this.suspiciousIps.get(ip) || 0;
    const newCount = currentCount + 1;

    this.suspiciousIps.set(ip, newCount);

    // Block IP after 5 suspicious activities within 10 minutes
    if (newCount >= 5) {
      this.blockedIps.add(ip);
      this.logger.warn(
        `IP blocked due to excessive rate limit violations: ${ip}`,
      );

      // Auto-unblock after 30 minutes
      setTimeout(
        () => {
          this.blockedIps.delete(ip);
          this.suspiciousIps.delete(ip);
          this.logger.log(`IP unblocked: ${ip}`);
        },
        30 * 60 * 1000,
      );
    }

    // Clean up old entries after 10 minutes
    setTimeout(
      () => {
        const currentSuspiciousCount = this.suspiciousIps.get(ip) || 0;
        if (currentSuspiciousCount <= 1) {
          this.suspiciousIps.delete(ip);
        } else {
          this.suspiciousIps.set(ip, currentSuspiciousCount - 1);
        }
      },
      10 * 60 * 1000,
    );
  }

  // Method to get current blocked IPs (for monitoring)
  getBlockedIps(): string[] {
    return Array.from(this.blockedIps);
  }

  // Method to get suspicious activity counts (for monitoring)
  getSuspiciousActivity(): Record<string, number> {
    return Object.fromEntries(this.suspiciousIps);
  }

  // Method to manually unblock an IP (for admin purposes)
  unblockIp(ip: string): void {
    this.blockedIps.delete(ip);
    this.suspiciousIps.delete(ip);
    this.logger.log(`IP manually unblocked: ${ip}`);
  }
}
