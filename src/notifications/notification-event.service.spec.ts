import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '../../generated/prisma';
import { InvitationEvent, ListSharedEvent, NotificationEventService, TaskAssignmentEvent, TaskStatusChangeEvent } from './notification-event.service';
import { NotificationsService } from './notifications.service';

describe('NotificationEventService', () => {
    let service: NotificationEventService;
    let notificationsService: NotificationsService;

    const mockNotificationsService = {
        create: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationEventService,
                {
                    provide: NotificationsService,
                    useValue: mockNotificationsService,
                },
            ],
        }).compile();

        service = module.get<NotificationEventService>(NotificationEventService);
        notificationsService = module.get<NotificationsService>(NotificationsService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createTaskAssignmentNotification', () => {
        const taskAssignmentEvent: TaskAssignmentEvent = {
            assignedUserId: 'user-1',
            taskTitle: 'Complete project setup',
            listName: 'Development Tasks',
            assignerName: 'John Doe',
        };

        it('should create task assignment notification', async () => {
            mockNotificationsService.create.mockResolvedValue({});

            await service.createTaskAssignmentNotification(taskAssignmentEvent);

            expect(mockNotificationsService.create).toHaveBeenCalledWith({
                userId: 'user-1',
                type: NotificationType.TASK_ASSIGNMENT,
                title: 'Task Assigned',
                message: 'John Doe assigned you the task "Complete project setup" in list "Development Tasks".',
            });
        });

        it('should handle notification creation errors gracefully', async () => {
            mockNotificationsService.create.mockRejectedValue(new Error('Database error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await expect(service.createTaskAssignmentNotification(taskAssignmentEvent)).resolves.not.toThrow();

            expect(consoleSpy).toHaveBeenCalledWith('Failed to create notification:', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('createTaskStatusChangeNotification', () => {
        const taskStatusChangeEvent: TaskStatusChangeEvent = {
            userId: 'user-1',
            taskTitle: 'Complete project setup',
            oldStatus: 'TODO',
            newStatus: 'IN_PROGRESS',
            listName: 'Development Tasks',
        };

        it('should create task status change notification with predefined message', async () => {
            mockNotificationsService.create.mockResolvedValue({});

            await service.createTaskStatusChangeNotification(taskStatusChangeEvent);

            expect(mockNotificationsService.create).toHaveBeenCalledWith({
                userId: 'user-1',
                type: NotificationType.TASK_STATUS_CHANGE,
                title: 'Task Status Updated',
                message: 'Task "Complete project setup" in list "Development Tasks" was started working on.',
            });
        });

        it('should handle unknown status with fallback message', async () => {
            const eventWithUnknownStatus = {
                ...taskStatusChangeEvent,
                newStatus: 'CUSTOM_STATUS',
            };

            mockNotificationsService.create.mockResolvedValue({});

            await service.createTaskStatusChangeNotification(eventWithUnknownStatus);

            expect(mockNotificationsService.create).toHaveBeenCalledWith({
                userId: 'user-1',
                type: NotificationType.TASK_STATUS_CHANGE,
                title: 'Task Status Updated',
                message: 'Task "Complete project setup" in list "Development Tasks" was changed status to CUSTOM_STATUS.',
            });
        });

        it('should create notification for DONE status', async () => {
            const doneEvent = {
                ...taskStatusChangeEvent,
                newStatus: 'DONE',
            };

            mockNotificationsService.create.mockResolvedValue({});

            await service.createTaskStatusChangeNotification(doneEvent);

            expect(mockNotificationsService.create).toHaveBeenCalledWith({
                userId: 'user-1',
                type: NotificationType.TASK_STATUS_CHANGE,
                title: 'Task Status Updated',
                message: 'Task "Complete project setup" in list "Development Tasks" was completed.',
            });
        });
    });

    describe('createListSharedNotification', () => {
        const listSharedEvent: ListSharedEvent = {
            sharedWithUserId: 'user-2',
            listName: 'Development Tasks',
            ownerName: 'John Doe',
            permissionLevel: 'EDITOR',
        };

        it('should create list shared notification', async () => {
            mockNotificationsService.create.mockResolvedValue({});

            await service.createListSharedNotification(listSharedEvent);

            expect(mockNotificationsService.create).toHaveBeenCalledWith({
                userId: 'user-2',
                type: NotificationType.LIST_SHARED,
                title: 'List Shared With You',
                message: 'John Doe shared the list "Development Tasks" with you as editor.',
            });
        });

        it('should handle different permission levels', async () => {
            const viewerEvent = {
                ...listSharedEvent,
                permissionLevel: 'VIEWER',
            };

            mockNotificationsService.create.mockResolvedValue({});

            await service.createListSharedNotification(viewerEvent);

            expect(mockNotificationsService.create).toHaveBeenCalledWith({
                userId: 'user-2',
                type: NotificationType.LIST_SHARED,
                title: 'List Shared With You',
                message: 'John Doe shared the list "Development Tasks" with you as viewer.',
            });
        });
    });

    describe('createInvitationReceivedNotification', () => {
        const invitationEvent: InvitationEvent = {
            inviteeUserId: 'user-2',
            inviteeEmail: 'user2@example.com',
            listName: 'Development Tasks',
            inviterName: 'John Doe',
        };

        it('should create invitation received notification when user ID is provided', async () => {
            mockNotificationsService.create.mockResolvedValue({});

            await service.createInvitationReceivedNotification(invitationEvent);

            expect(mockNotificationsService.create).toHaveBeenCalledWith({
                userId: 'user-2',
                type: NotificationType.INVITATION_RECEIVED,
                title: 'Invitation Received',
                message: 'John Doe invited you to collaborate on the list "Development Tasks".',
            });
        });

        it('should skip notification when user ID is not provided', async () => {
            const eventWithoutUserId = {
                ...invitationEvent,
                inviteeUserId: undefined,
            };

            await service.createInvitationReceivedNotification(eventWithoutUserId);

            expect(mockNotificationsService.create).not.toHaveBeenCalled();
        });
    });

    describe('createInvitationAcceptedNotification', () => {
        const invitationEvent: InvitationEvent = {
            inviteeUserId: 'user-2',
            inviteeEmail: 'user2@example.com',
            listName: 'Development Tasks',
            inviterName: 'John Doe',
            isAccepted: true,
        };

        it('should create invitation accepted notification when user ID is provided', async () => {
            mockNotificationsService.create.mockResolvedValue({});

            await service.createInvitationAcceptedNotification(invitationEvent);

            expect(mockNotificationsService.create).toHaveBeenCalledWith({
                userId: 'user-2',
                type: NotificationType.INVITATION_ACCEPTED,
                title: 'Welcome to the List',
                message: 'You successfully joined the list "Development Tasks" shared by John Doe.',
            });
        });

        it('should skip notification when user ID is not provided', async () => {
            const eventWithoutUserId = {
                ...invitationEvent,
                inviteeUserId: undefined,
            };

            await service.createInvitationAcceptedNotification(eventWithoutUserId);

            expect(mockNotificationsService.create).not.toHaveBeenCalled();
        });
    });

    describe('createListUpdateNotification', () => {
        it('should create list update notification', async () => {
            mockNotificationsService.create.mockResolvedValue({});

            await service.createListUpdateNotification('user-1', 'Development Tasks', 'updated');

            expect(mockNotificationsService.create).toHaveBeenCalledWith({
                userId: 'user-1',
                type: NotificationType.LIST_UPDATE,
                title: 'List Updated',
                message: 'The list "Development Tasks" has been updated.',
            });
        });

        it('should handle different update types', async () => {
            mockNotificationsService.create.mockResolvedValue({});

            await service.createListUpdateNotification('user-1', 'Development Tasks', 'renamed');

            expect(mockNotificationsService.create).toHaveBeenCalledWith({
                userId: 'user-1',
                type: NotificationType.LIST_UPDATE,
                title: 'List Updated',
                message: 'The list "Development Tasks" has been renamed.',
            });
        });
    });
}); 