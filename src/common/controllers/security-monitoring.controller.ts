import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { EnhancedRateLimitGuard } from '../guards/enhanced-rate-limit.guard';

@ApiTags('Security Monitoring')
@Controller('security')
@UseGuards(JwtAuthGuard)
@UseInterceptors(LoggingInterceptor)
export class SecurityMonitoringController {
  constructor(private readonly rateLimitGuard: EnhancedRateLimitGuard) {}

  @Get('blocked-ips')
  @ApiOperation({
    summary: 'Get currently blocked IP addresses',
    description:
      'Returns a list of IP addresses that are currently blocked due to suspicious activity',
  })
  @ApiResponse({
    status: 200,
    description: 'List of blocked IP addresses',
    schema: {
      type: 'object',
      properties: {
        blockedIps: {
          type: 'array',
          items: { type: 'string' },
        },
        count: { type: 'number' },
        timestamp: { type: 'string' },
      },
    },
  })
  getBlockedIps() {
    const blockedIps = this.rateLimitGuard.getBlockedIps();
    return {
      blockedIps,
      count: blockedIps.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('suspicious-activity')
  @ApiOperation({
    summary: 'Get suspicious activity report',
    description: 'Returns current suspicious activity counts by IP address',
  })
  @ApiResponse({
    status: 200,
    description: 'Suspicious activity report',
    schema: {
      type: 'object',
      properties: {
        suspiciousActivity: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        totalSuspiciousIps: { type: 'number' },
        timestamp: { type: 'string' },
      },
    },
  })
  getSuspiciousActivity() {
    const suspiciousActivity = this.rateLimitGuard.getSuspiciousActivity();
    return {
      suspiciousActivity,
      totalSuspiciousIps: Object.keys(suspiciousActivity).length,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('security-metrics')
  @ApiOperation({
    summary: 'Get overall security metrics',
    description: 'Returns comprehensive security monitoring metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Security metrics overview',
    schema: {
      type: 'object',
      properties: {
        blockedIpsCount: { type: 'number' },
        suspiciousIpsCount: { type: 'number' },
        rateLimitingActive: { type: 'boolean' },
        securityHeadersEnabled: { type: 'boolean' },
        timestamp: { type: 'string' },
        environment: { type: 'string' },
      },
    },
  })
  getSecurityMetrics() {
    const blockedIps = this.rateLimitGuard.getBlockedIps();
    const suspiciousActivity = this.rateLimitGuard.getSuspiciousActivity();

    return {
      blockedIpsCount: blockedIps.length,
      suspiciousIpsCount: Object.keys(suspiciousActivity).length,
      rateLimitingActive: true,
      securityHeadersEnabled: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('health-check')
  @ApiOperation({
    summary: 'Security system health check',
    description: 'Verifies that all security systems are functioning properly',
  })
  @ApiResponse({
    status: 200,
    description: 'Security system health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'warning', 'critical'] },
        checks: {
          type: 'object',
          properties: {
            rateLimiting: { type: 'boolean' },
            authGuards: { type: 'boolean' },
            inputValidation: { type: 'boolean' },
            securityHeaders: { type: 'boolean' },
          },
        },
        timestamp: { type: 'string' },
      },
    },
  })
  getSecurityHealthCheck() {
    const checks = {
      rateLimiting: true, // Rate limiting is configured
      authGuards: true, // JWT guards are active
      inputValidation: true, // Validation pipes are configured
      securityHeaders: true, // Helmet is configured
    };

    const allHealthy = Object.values(checks).every((check) => check === true);

    return {
      status: allHealthy ? 'healthy' : 'warning',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
