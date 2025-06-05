import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '../../generated/prisma';
import {
  CreateNotificationDto,
  QueryNotificationsDto,
  UpdateNotificationDto,
} from './dto';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotificationsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    markAsRead: jest.fn(),
    markAsUnread: jest.fn(),
    markAllAsRead: jest.fn(),
    remove: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have notifications service injected', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createNotificationDto: CreateNotificationDto = {
      userId: 'user-1', // This will be overridden
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
      mockNotificationsService.create.mockResolvedValue(
        mockCreatedNotification,
      );

      const result = await controller.create(
        createNotificationDto,
        mockRequest,
      );

      expect(createNotificationDto.userId).toBe('user-1'); // Should be overridden by controller
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.TASK_ASSIGNMENT,
          title: 'Task Assigned',
          message: 'A new task has been assigned to you',
        }),
      );
      expect(result).toEqual(mockCreatedNotification);
    });

    it('should override userId from request token for security', async () => {
      const maliciousDto = {
        ...createNotificationDto,
        userId: 'malicious-user-id',
      };

      mockNotificationsService.create.mockResolvedValue(
        mockCreatedNotification,
      );

      await controller.create(maliciousDto, mockRequest);

      expect(maliciousDto.userId).toBe('user-1'); // Should be overridden
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
        }),
      );
    });
  });

  describe('findAll', () => {
    const mockPaginatedResponse = {
      notifications: [
        {
          id: 'notification-1',
          userId: 'user-1',
          type: NotificationType.TASK_ASSIGNMENT,
          title: 'Task Assigned',
          message: 'A new task has been assigned to you',
          readStatus: false,
          createdAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    it('should return paginated notifications', async () => {
      const queryDto: QueryNotificationsDto = { page: 1, limit: 20 };
      mockNotificationsService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(mockRequest, queryDto);

      expect(mockNotificationsService.findAll).toHaveBeenCalledWith(
        'user-1',
        queryDto,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should pass query parameters correctly', async () => {
      const queryDto: QueryNotificationsDto = {
        page: 2,
        limit: 10,
        read: false,
        type: NotificationType.TASK_ASSIGNMENT,
      };
      mockNotificationsService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(mockRequest, queryDto);

      expect(mockNotificationsService.findAll).toHaveBeenCalledWith(
        'user-1',
        queryDto,
      );
    });

    it('should work with empty query parameters', async () => {
      const queryDto: QueryNotificationsDto = {};
      mockNotificationsService.findAll.mockResolvedValue(mockPaginatedResponse);

      await controller.findAll(mockRequest, queryDto);

      expect(mockNotificationsService.findAll).toHaveBeenCalledWith(
        'user-1',
        queryDto,
      );
    });
  });

  describe('findOne', () => {
    const notificationId = 'notification-1';
    const mockNotification = {
      id: notificationId,
      userId: 'user-1',
      type: NotificationType.TASK_ASSIGNMENT,
      title: 'Task Assigned',
      message: 'A new task has been assigned to you',
      readStatus: false,
      createdAt: new Date(),
    };

    it('should return a specific notification', async () => {
      mockNotificationsService.findOne.mockResolvedValue(mockNotification);

      const result = await controller.findOne(notificationId, mockRequest);

      expect(mockNotificationsService.findOne).toHaveBeenCalledWith(
        notificationId,
        'user-1',
      );
      expect(result).toEqual(mockNotification);
    });
  });

  describe('update', () => {
    const notificationId = 'notification-1';
    const updateDto: UpdateNotificationDto = { readStatus: true };
    const mockUpdatedNotification = {
      id: notificationId,
      userId: 'user-1',
      type: NotificationType.TASK_ASSIGNMENT,
      title: 'Task Assigned',
      message: 'A new task has been assigned to you',
      readStatus: true,
      createdAt: new Date(),
    };

    it('should update a notification successfully', async () => {
      mockNotificationsService.update.mockResolvedValue(
        mockUpdatedNotification,
      );

      const result = await controller.update(
        notificationId,
        updateDto,
        mockRequest,
      );

      expect(mockNotificationsService.update).toHaveBeenCalledWith(
        notificationId,
        'user-1',
        updateDto,
      );
      expect(result).toEqual(mockUpdatedNotification);
    });
  });

  describe('markAsRead', () => {
    const notificationId = 'notification-1';
    const mockUpdatedNotification = {
      id: notificationId,
      userId: 'user-1',
      type: NotificationType.TASK_ASSIGNMENT,
      title: 'Task Assigned',
      message: 'A new task has been assigned to you',
      readStatus: true,
      createdAt: new Date(),
    };

    it('should mark notification as read', async () => {
      mockNotificationsService.markAsRead.mockResolvedValue(
        mockUpdatedNotification,
      );

      const result = await controller.markAsRead(notificationId, mockRequest);

      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith(
        notificationId,
        'user-1',
      );
      expect(result).toEqual(mockUpdatedNotification);
    });
  });

  describe('markAsUnread', () => {
    const notificationId = 'notification-1';
    const mockUpdatedNotification = {
      id: notificationId,
      userId: 'user-1',
      type: NotificationType.TASK_ASSIGNMENT,
      title: 'Task Assigned',
      message: 'A new task has been assigned to you',
      readStatus: false,
      createdAt: new Date(),
    };

    it('should mark notification as unread', async () => {
      mockNotificationsService.markAsUnread.mockResolvedValue(
        mockUpdatedNotification,
      );

      const result = await controller.markAsUnread(notificationId, mockRequest);

      expect(mockNotificationsService.markAsUnread).toHaveBeenCalledWith(
        notificationId,
        'user-1',
      );
      expect(result).toEqual(mockUpdatedNotification);
    });
  });

  describe('markAllAsRead', () => {
    const mockBulkUpdateResult = { updated: 5 };

    it('should mark all notifications as read', async () => {
      mockNotificationsService.markAllAsRead.mockResolvedValue(
        mockBulkUpdateResult,
      );

      const result = await controller.markAllAsRead(mockRequest);

      expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith(
        'user-1',
      );
      expect(result).toEqual(mockBulkUpdateResult);
    });
  });

  describe('remove', () => {
    const notificationId = 'notification-1';

    it('should delete a notification successfully', async () => {
      mockNotificationsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(notificationId, mockRequest);

      expect(mockNotificationsService.remove).toHaveBeenCalledWith(
        notificationId,
        'user-1',
      );
      expect(result).toBeUndefined();
    });
  });
});
