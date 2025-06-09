import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateNotificationDto,
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
  QueryNotificationsDto,
  UpdateNotificationDto,
} from './dto';
import { WebSocketNotificationService } from './websocket-notification.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webSocketNotificationService: WebSocketNotificationService,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    // Check user preferences before creating notification
    const shouldCreate = await this.shouldCreateNotification(
      createNotificationDto.userId,
      createNotificationDto.type,
    );

    if (!shouldCreate) {
      // Return a dummy response if notification should not be created
      return {
        id: '',
        userId: createNotificationDto.userId,
        type: createNotificationDto.type,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        readStatus: false,
        createdAt: new Date(),
      };
    }

    const notification = await this.prisma.notification.create({
      data: createNotificationDto,
    });

    const responseDto = this.mapToResponseDto(notification);

    // Broadcast new notification via WebSocket
    await this.webSocketNotificationService.broadcastNewNotification(
      responseDto.userId,
      responseDto,
    );

    return responseDto;
  }

  private async shouldCreateNotification(
    userId: string,
    notificationType: string,
  ): Promise<boolean> {
    try {
      // Get user's notification preferences
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { notificationPreferences: true },
      });

      if (!user) {
        return true; // Default to creating notification if user not found
      }

      const preferences = user.notificationPreferences as any;

      if (!preferences) {
        return true; // Default to creating notification if no preferences set
      }

      // Check if in-app notifications are enabled
      if (!preferences.inApp) {
        return false;
      }

      // Check if the specific notification type is enabled
      if (preferences.types && preferences.types[notificationType] === false) {
        return false;
      }

      // Check frequency settings (for future digest implementation)
      // For now, all notifications are immediate
      if (preferences.frequency === 'DISABLED') {
        return false;
      }

      return true;
    } catch (error) {
      // Log error but default to creating notification
      console.error('Error checking notification preferences:', error);
      return true;
    }
  }

  async findAll(
    userId: string,
    queryDto: QueryNotificationsDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    const {
      page = 1,
      limit = 20,
      readStatus,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (readStatus !== undefined) {
      where.readStatus = readStatus;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.notification.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      notifications: notifications.map((notification) =>
        this.mapToResponseDto(notification),
      ),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string, userId: string): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.mapToResponseDto(notification);
  }

  async update(
    id: string,
    userId: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<NotificationResponseDto> {
    const notification = await this.findOne(id, userId);

    const updatedNotification = await this.prisma.notification.update({
      where: { id },
      data: updateNotificationDto,
    });

    const responseDto = this.mapToResponseDto(updatedNotification);

    // Broadcast notification update via WebSocket
    await this.webSocketNotificationService.broadcastNotificationUpdate(
      responseDto.userId,
      responseDto,
    );

    return responseDto;
  }

  async markAsRead(
    id: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    return this.update(id, userId, { readStatus: true });
  }

  async markAsUnread(
    id: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    return this.update(id, userId, { readStatus: false });
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readStatus: false,
      },
      data: { readStatus: true },
    });

    return { updated: result.count };
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId); // Verify ownership

    await this.prisma.notification.delete({
      where: { id },
    });

    // Broadcast notification deletion via WebSocket
    await this.webSocketNotificationService.broadcastNotificationDelete(
      userId,
      id,
    );
  }

  async cleanupOldNotifications(
    daysOld: number = 30,
  ): Promise<{ deleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return { deleted: result.count };
  }

  private mapToResponseDto(notification: any): NotificationResponseDto {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      readStatus: notification.readStatus,
      createdAt: notification.createdAt,
    };
  }
}
