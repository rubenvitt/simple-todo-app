import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ListsModule } from './lists/lists.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
    TasksModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
