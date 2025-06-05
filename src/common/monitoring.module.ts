import { forwardRef, Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { MonitoringController } from './controllers/monitoring.controller';
import { AppHealthService } from './services/health.service';
import { AppLoggerService } from './services/logger.service';
import { PrismaModule } from './services/prisma.module';
import { QueryPerformanceService } from './services/query-performance.service';
import { ErrorTrackingService } from './services/error-tracking.service';
import { DdosProtectionService } from './services/ddos-protection.service';
import { TrafficMonitoringInterceptor } from './interceptors/traffic-monitoring.interceptor';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [
    TerminusModule,
    ConfigModule,
    PrismaModule,
    forwardRef(() => UsersModule),
    WinstonModule.forRootAsync({
      useFactory: () => {
        const isProduction = process.env.NODE_ENV === 'production';
        const logLevel =
          process.env.LOG_LEVEL || (isProduction ? 'warn' : 'debug');

        const transports: winston.transport[] = [];

        if (isProduction) {
          // Production: JSON structured logs
          transports.push(
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json(),
              ),
            }),
          );

          // Production: File logging
          transports.push(
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json(),
              ),
            }),
          );

          transports.push(
            new winston.transports.File({
              filename: 'logs/combined.log',
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json(),
              ),
            }),
          );
        } else {
          // Development: Human-readable logs
          transports.push(
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.printf(
                  ({ timestamp, level, message, context, ...meta }) => {
                    const contextStr = context ? `[${context}]` : '';
                    const metaStr = Object.keys(meta).length
                      ? JSON.stringify(meta, null, 2)
                      : '';
                    return `${timestamp} [${level.toUpperCase()}] ${contextStr} ${message} ${metaStr}`;
                  },
                ),
              ),
            }),
          );
        }

        return {
          level: logLevel,
          transports,
          exitOnError: false,
          rejectionHandlers: [
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
            }),
          ],
          exceptionHandlers: [
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
            }),
          ],
        };
      },
    }),
  ],
  providers: [
    AppLoggerService,
    AppHealthService,
    QueryPerformanceService,
    ErrorTrackingService,
    DdosProtectionService,
    TrafficMonitoringInterceptor,
  ],
  controllers: [MonitoringController],
  exports: [
    AppLoggerService,
    AppHealthService,
    QueryPerformanceService,
    ErrorTrackingService,
    DdosProtectionService,
    TrafficMonitoringInterceptor,
    WinstonModule,
  ],
})
export class MonitoringModule {}
