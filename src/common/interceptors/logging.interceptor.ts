import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AppLoggerService } from '../services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, headers, ip } = request;
    const userAgent = headers['user-agent'] || '';
    const userId = (request as any).user?.id;
    const requestId = this.generateRequestId();

    // Add request ID to response headers for tracking
    response.setHeader('X-Request-ID', requestId);

    // Log request start
    this.logger.debug(`Incoming Request: ${method} ${url}`, {
      type: 'http_request_start',
      method,
      url,
      userAgent,
      ip,
      userId,
      requestId,
    });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        // Log successful request
        this.logger.logHttpRequest(method, url, statusCode, duration, {
          userAgent,
          ip,
          userId,
          requestId,
        });

        // Record performance metric
        this.logger.recordPerformanceMetric(`${method} ${url}`, duration, {
          statusCode,
          userAgent,
          userId,
          requestId,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Log error request
        this.logger.error(
          `Request failed: ${method} ${url} - ${statusCode} (${duration}ms)`,
          error.stack,
          {
            type: 'http_request_error',
            method,
            url,
            statusCode,
            duration,
            userAgent,
            ip,
            userId,
            requestId,
            error: error.message,
          },
        );

        // Record performance metric for failed requests
        this.logger.recordPerformanceMetric(
          `${method} ${url} (ERROR)`,
          duration,
          {
            statusCode,
            error: error.message,
            userAgent,
            userId,
            requestId,
          },
        );

        throw error;
      }),
    );
  }

  private generateRequestId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
