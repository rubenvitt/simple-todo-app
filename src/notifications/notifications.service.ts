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

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.create({
      data: createNotificationDto,
    });

    return this.mapToResponseDto(notification);
  }

  async findAll(
    userId: string,
    queryDto: QueryNotificationsDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    const { page = 1, limit = 20, read, type } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (read !== undefined) {
      where.readStatus = read;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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

    return this.mapToResponseDto(updatedNotification);
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
