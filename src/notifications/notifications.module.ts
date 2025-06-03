import { Module } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { NotificationEventService } from './notification-event.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationEventService, PrismaService],
  exports: [NotificationsService, NotificationEventService],
})
export class NotificationsModule {}
