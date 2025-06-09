import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { WebSocketsModule } from '../websockets/websockets.module';
import { NotificationEventService } from './notification-event.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WebSocketNotificationService } from './websocket-notification.service';

@Module({
  imports: [forwardRef(() => WebSocketsModule)],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationEventService,
    WebSocketNotificationService,
    PrismaService,
  ],
  exports: [
    NotificationsService,
    NotificationEventService,
    WebSocketNotificationService,
  ],
})
export class NotificationsModule {}
