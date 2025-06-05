import { forwardRef, Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';

import { UsersModule } from '../users/users.module';
import { MonitoringController } from './controllers/monitoring.controller';
import { TrafficMonitoringInterceptor } from './interceptors/traffic-monitoring.interceptor';
import { DdosProtectionService } from './services/ddos-protection.service';
import { ErrorTrackingService } from './services/error-tracking.service';
import { AppHealthService } from './services/health.service';
import { AppLoggerService } from './services/logger.service';
import { PrismaModule } from './services/prisma.module';
import { QueryPerformanceService } from './services/query-performance.service';

@Global()
@Module({
  imports: [
    TerminusModule,
    ConfigModule,
    PrismaModule,
    forwardRef(() => UsersModule),
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
  ],
})
export class MonitoringModule {}
