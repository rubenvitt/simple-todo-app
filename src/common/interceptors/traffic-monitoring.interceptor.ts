import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DdosProtectionService } from '../services/ddos-protection.service';

@Injectable()
export class TrafficMonitoringInterceptor implements NestInterceptor {
  constructor(private readonly ddosProtectionService: DdosProtectionService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIp(request);
    const endpoint = `${request.method} ${request.url}`;
    const userAgent = request.headers['user-agent'] || 'Unknown';

    // Record traffic for DDoS analysis
    this.ddosProtectionService.recordTraffic(ip, endpoint, userAgent);

    return next.handle().pipe(
      tap(() => {
        // Additional monitoring logic can be added here
        // For example: response time tracking, error rate monitoring, etc.
      }),
    );
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
}
