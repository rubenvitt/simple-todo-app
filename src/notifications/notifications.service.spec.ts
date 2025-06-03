import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '../../generated/prisma';
import { PrismaService } from '../common/services/prisma.service';
import { CreateNotificationDto, QueryNotificationsDto, UpdateNotificationDto } from './dto';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have prisma service injected', () => {
    expect(prismaService).toBeDefined();
  });

  describe('create', () => {
    const createNotificationDto: CreateNotificationDto = {
      userId: 'user-1',
      type: NotificationType.TASK_ASSIGNMENT,
      title: 'Task Assigned',
      message: 'A new task has been assigned to you',
    };

    const mockCreatedNotification = {
      id: 'notification-1',
      userId: 'user-1',
      type: NotificationType.TASK_ASSIGNMENT,
      title: 'Task Assigned',
      message: 'A new task has been assigned to you',
      readStatus: false,
      createdAt: new Date(),
    };

    it('should create a notification successfully', async () => {
      mockPrismaService.notification.create.mockResolvedValue(mockCreatedNotification);

      const result = await service.create(createNotificationDto);

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: createNotificationDto,
      });

      expect(result).toEqual({
        id: 'notification-1',
        userId: 'user-1',
        type: NotificationType.TASK_ASSIGNMENT,
        title: 'Task Assigned',
        message: 'A new task has been assigned to you',
        readStatus: false,
        createdAt: expect.any(Date),
      });
    });

    it('should create notification with default type', async () => {
      const dtoWithDefaults: CreateNotificationDto = {
        userId: 'user-1',
        message: 'General notification',
      };

      const mockNotificationWithDefaults = {
        ...mockCreatedNotification,
        type: NotificationType.GENERAL,
        title: 'Notification',
        message: 'General notification',
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotificationWithDefaults);

      const result = await service.create(dtoWithDefaults);

      expect(result.type).toEqual(NotificationType.GENERAL);
      expect(result.title).toEqual('Notification');
    });
  });

  describe('findAll', () => {
    const userId = 'user-1';
    const mockNotifications = [
      {
        id: 'notification-1',
        userId: 'user-1',
        type: NotificationType.TASK_ASSIGNMENT,
        title: 'Task Assigned',
        message: 'A new task has been assigned to you',
        readStatus: false,
        createdAt: new Date('2023-01-01'),
      },
      {
        id: 'notification-2',
        userId: 'user-1',
        type: NotificationType.LIST_SHARED,
        title: 'List Shared',
        message: 'A list has been shared with you',
        readStatus: true,
        createdAt: new Date('2023-01-02'),
      },
    ];

    it('should return paginated notifications with default query', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrismaService.notification.count.mockResolvedValue(2);

      const queryDto: QueryNotificationsDto = {};
      const result = await service.findAll(userId, queryDto);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId },
      });

      expect(result).toEqual({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            id: 'notification-1',
            userId: 'user-1',
            type: NotificationType.TASK_ASSIGNMENT,
          }),
          expect.objectContaining({
            id: 'notification-2',
            userId: 'user-1',
            type: NotificationType.LIST_SHARED,
          }),
        ]),
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter notifications by read status', async () => {
      const unreadNotifications = [mockNotifications[0]];
      mockPrismaService.notification.findMany.mockResolvedValue(unreadNotifications);
      mockPrismaService.notification.count.mockResolvedValue(1);

      const queryDto: QueryNotificationsDto = { read: false };
      const result = await service.findAll(userId, queryDto);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId, readStatus: false },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].readStatus).toBe(false);
    });

    it('should filter notifications by type', async () => {
      const taskNotifications = [mockNotifications[0]];
      mockPrismaService.notification.findMany.mockResolvedValue(taskNotifications);
      mockPrismaService.notification.count.mockResolvedValue(1);

      const queryDto: QueryNotificationsDto = { type: NotificationType.TASK_ASSIGNMENT };
      const result = await service.findAll(userId, queryDto);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId, type: NotificationType.TASK_ASSIGNMENT },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].type).toBe(NotificationType.TASK_ASSIGNMENT);
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([mockNotifications[1]]);
      mockPrismaService.notification.count.mockResolvedValue(2);

      const queryDto: QueryNotificationsDto = { page: 2, limit: 1 };
      const result = await service.findAll(userId, queryDto);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId },
        skip: 1,
        take: 1,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual({
        notifications: expect.any(Array),
        total: 2,
        page: 2,
        limit: 1,
        totalPages: 2,
      });
    });
  });

  describe('findOne', () => {
    const notificationId = 'notification-1';
    const userId = 'user-1';
    const mockNotification = {
      id: notificationId,
      userId,
      type: NotificationType.TASK_ASSIGNMENT,
      title: 'Task Assigned',
      message: 'A new task has been assigned to you',
      readStatus: false,
      createdAt: new Date(),
    };

    it('should return notification when found and user owns it', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);

      const result = await service.findOne(notificationId, userId);

      expect(mockPrismaService.notification.findUnique).toHaveBeenCalledWith({
        where: { id: notificationId },
      });

      expect(result).toEqual(expect.objectContaining({
        id: notificationId,
        userId,
        type: NotificationType.TASK_ASSIGNMENT,
      }));
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(null);

      await expect(service.findOne(notificationId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(notificationId, userId)).rejects.toThrow(
        'Notification not found',
      );
    });

    it('should throw ForbiddenException when user does not own notification', async () => {
      const notificationOwnedByOther = {
        ...mockNotification,
        userId: 'other-user',
      };
      mockPrismaService.notification.findUnique.mockResolvedValue(notificationOwnedByOther);

      await expect(service.findOne(notificationId, userId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOne(notificationId, userId)).rejects.toThrow(
        'Access denied',
      );
    });
  });

  describe('update', () => {
    const notificationId = 'notification-1';
    const userId = 'user-1';
    const updateDto: UpdateNotificationDto = { readStatus: true };
    const mockNotification = {
      id: notificationId,
      userId,
      type: NotificationType.TASK_ASSIGNMENT,
      title: 'Task Assigned',
      message: 'A new task has been assigned to you',
      readStatus: false,
      createdAt: new Date(),
    };
    const mockUpdatedNotification = { ...mockNotification, readStatus: true };

    it('should update notification successfully', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue(mockUpdatedNotification);

      const result = await service.update(notificationId, userId, updateDto);

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: updateDto,
      });

      expect(result.readStatus).toBe(true);
    });

    it('should throw error when notification not found', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(null);

      await expect(service.update(notificationId, userId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAsRead', () => {
    const notificationId = 'notification-1';
    const userId = 'user-1';

    it('should mark notification as read', async () => {
      const mockNotification = {
        id: notificationId,
        userId,
        readStatus: false,
      };
      const mockUpdatedNotification = { ...mockNotification, readStatus: true };

      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue(mockUpdatedNotification);

      const result = await service.markAsRead(notificationId, userId);

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { readStatus: true },
      });

      expect(result.readStatus).toBe(true);
    });
  });

  describe('markAsUnread', () => {
    const notificationId = 'notification-1';
    const userId = 'user-1';

    it('should mark notification as unread', async () => {
      const mockNotification = {
        id: notificationId,
        userId,
        readStatus: true,
      };
      const mockUpdatedNotification = { ...mockNotification, readStatus: false };

      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue(mockUpdatedNotification);

      const result = await service.markAsUnread(notificationId, userId);

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { readStatus: false },
      });

      expect(result.readStatus).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    const userId = 'user-1';

    it('should mark all unread notifications as read', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead(userId);

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, readStatus: false },
        data: { readStatus: true },
      });

      expect(result).toEqual({ updated: 3 });
    });

    it('should return 0 when no unread notifications exist', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllAsRead(userId);

      expect(result).toEqual({ updated: 0 });
    });
  });

  describe('remove', () => {
    const notificationId = 'notification-1';
    const userId = 'user-1';
    const mockNotification = {
      id: notificationId,
      userId,
      type: NotificationType.TASK_ASSIGNMENT,
      title: 'Task Assigned',
      message: 'A new task has been assigned to you',
      readStatus: false,
      createdAt: new Date(),
    };

    it('should delete notification successfully', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrismaService.notification.delete.mockResolvedValue(mockNotification);

      await service.remove(notificationId, userId);

      expect(mockPrismaService.notification.delete).toHaveBeenCalledWith({
        where: { id: notificationId },
      });
    });

    it('should throw error when notification not found', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(null);

      await expect(service.remove(notificationId, userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrismaService.notification.delete).not.toHaveBeenCalled();
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should delete notifications older than specified days', async () => {
      const daysOld = 30;
      mockPrismaService.notification.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.cleanupOldNotifications(daysOld);

      const expectedCutoffDate = new Date();
      expectedCutoffDate.setDate(expectedCutoffDate.getDate() - daysOld);

      expect(mockPrismaService.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });

      expect(result).toEqual({ deleted: 5 });
    });

    it('should use default value of 30 days when no parameter provided', async () => {
      mockPrismaService.notification.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.cleanupOldNotifications();

      expect(mockPrismaService.notification.deleteMany).toHaveBeenCalled();
      expect(result).toEqual({ deleted: 2 });
    });
  });
});
