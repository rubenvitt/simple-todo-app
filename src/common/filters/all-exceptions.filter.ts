import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AppLoggerService } from '../services/logger.service';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (status === 404 || status === 429) {
        status = HttpStatus.NOT_FOUND;
        message = 'Not Found';
        error = 'Not Found';

        this.logger.error(`HTTP Status: ${status} Error Message: ${message}`);

        response.status(status).json({
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          message: Array.isArray(message) ? message : [message],
          error,
        });

        return;
      }

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
      }
    } else if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      message = 'Rate limit exceeded. Please try again later.';
      error = 'Too Many Requests';
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';
    }

    // Log the error with structured logging
    this.logger.error(
      `HTTP Status: ${status} Error Message: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
      {
        type: 'http_exception',
        statusCode: status,
        method: request.method,
        url: request.url,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
        userId: (request as any).user?.id,
      },
    );

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: Array.isArray(message) ? message : [message],
      error,
    };

    response.status(status).json(errorResponse);
  }
}
