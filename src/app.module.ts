import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { environmentConfig, validateEnvironment } from './common/config/app.config';
import { AppBootstrapService } from './common/services/app-bootstrap.service';
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
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute in milliseconds
        limit: 100, // 100 requests per minute
      },
      {
        name: 'medium',
        ttl: 300000, // 5 minutes in milliseconds  
        limit: 300, // 300 requests per 5 minutes
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour in milliseconds
        limit: 1000, // 1000 requests per hour
      },
    ]),
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
      useClass: ThrottlerGuard,
    },
  ],
  exports: [SecretsService],
})
export class AppModule {}
