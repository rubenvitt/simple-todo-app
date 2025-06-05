import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import {
  environmentConfig,
  validateEnvironment,
} from './common/config/app.config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { EnhancedRateLimitGuard } from './common/guards/enhanced-rate-limit.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TrafficMonitoringInterceptor } from './common/interceptors/traffic-monitoring.interceptor';
import { MonitoringModule } from './common/monitoring.module';
import { AppBootstrapService } from './common/services/app-bootstrap.service';
import { PrismaModule } from './common/services/prisma.module';
import { SecretsService } from './common/services/secrets.service';
import { InvitationsModule } from './invitations/invitations.module';
import { ListSharesModule } from './list-shares/list-shares.module';
import { ListsModule } from './lists/lists.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { WebSocketsModule } from './websockets/websockets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [environmentConfig],
      validate: validateEnvironment,
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rateLimit = configService.get('rateLimit') as {
          global: { ttl: number; max: number };
          auth: { ttl: number; max: number };
          api: { ttl: number; max: number };
        };
        return [
          {
            name: 'short',
            ttl: rateLimit.global.ttl,
            limit: rateLimit.global.max,
          },
          {
            name: 'auth',
            ttl: rateLimit.auth.ttl,
            limit: rateLimit.auth.max,
          },
          {
            name: 'api',
            ttl: rateLimit.api.ttl,
            limit: rateLimit.api.max,
          },
          {
            name: 'long',
            ttl: 3600000, // 1 hour
            limit: 5000, // Higher limit for general usage
          },
        ];
      },
    }),
    MonitoringModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ListsModule,
    ListSharesModule,
    TasksModule,
    NotificationsModule,
    InvitationsModule,
    WebSocketsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SecretsService,
    AppBootstrapService,
    {
      provide: APP_GUARD,
      useClass: EnhancedRateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TrafficMonitoringInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  exports: [SecretsService],
})
export class AppModule {}
