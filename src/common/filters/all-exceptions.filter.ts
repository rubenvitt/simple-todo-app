import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

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

            if (status === 404) {
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

        // Log the error
        this.logger.error(
            `HTTP Status: ${status} Error Message: ${message}`,
            exception instanceof Error ? exception.stack : undefined,
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