import { Injectable } from '@nestjs/common';
import { NotificationType } from '../../generated/prisma';
import { NotificationsService } from './notifications.service';

export interface NotificationEvent {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
}

export interface TaskAssignmentEvent {
    assignedUserId: string;
    taskTitle: string;
    listName: string;
    assignerName: string;
}

export interface TaskStatusChangeEvent {
    userId: string;
    taskTitle: string;
    oldStatus: string;
    newStatus: string;
    listName: string;
}

export interface ListSharedEvent {
    sharedWithUserId: string;
    listName: string;
    ownerName: string;
    permissionLevel: string;
}

export interface InvitationEvent {
    inviteeUserId?: string;
    inviteeEmail: string;
    listName: string;
    inviterName: string;
    isAccepted?: boolean;
}

@Injectable()
export class NotificationEventService {
    constructor(private readonly notificationsService: NotificationsService) { }

    async createTaskAssignmentNotification(event: TaskAssignmentEvent): Promise<void> {
        const notificationEvent: NotificationEvent = {
            userId: event.assignedUserId,
            type: NotificationType.TASK_ASSIGNMENT,
            title: 'Task Assigned',
            message: `${event.assignerName} assigned you the task "${event.taskTitle}" in list "${event.listName}".`,
        };

        await this.createNotification(notificationEvent);
    }

    async createTaskStatusChangeNotification(event: TaskStatusChangeEvent): Promise<void> {
        const statusMessages = {
            BACKLOG: 'moved to backlog',
            TODO: 'marked as todo',
            IN_PROGRESS: 'started working on',
            REVIEW: 'submitted for review',
            DONE: 'completed',
        };

        const action = statusMessages[event.newStatus as keyof typeof statusMessages] || `changed status to ${event.newStatus}`;

        const notificationEvent: NotificationEvent = {
            userId: event.userId,
            type: NotificationType.TASK_STATUS_CHANGE,
            title: 'Task Status Updated',
            message: `Task "${event.taskTitle}" in list "${event.listName}" was ${action}.`,
        };

        await this.createNotification(notificationEvent);
    }

    async createListSharedNotification(event: ListSharedEvent): Promise<void> {
        const notificationEvent: NotificationEvent = {
            userId: event.sharedWithUserId,
            type: NotificationType.LIST_SHARED,
            title: 'List Shared With You',
            message: `${event.ownerName} shared the list "${event.listName}" with you as ${event.permissionLevel.toLowerCase()}.`,
        };

        await this.createNotification(notificationEvent);
    }

    async createInvitationReceivedNotification(event: InvitationEvent): Promise<void> {
        // For now, we'll skip this since we need the user ID
        // This would typically be handled when the invitation is accepted
        // and the user account is linked
        if (!event.inviteeUserId) {
            return;
        }

        const notificationEvent: NotificationEvent = {
            userId: event.inviteeUserId,
            type: NotificationType.INVITATION_RECEIVED,
            title: 'Invitation Received',
            message: `${event.inviterName} invited you to collaborate on the list "${event.listName}".`,
        };

        await this.createNotification(notificationEvent);
    }

    async createInvitationAcceptedNotification(event: InvitationEvent): Promise<void> {
        if (!event.inviteeUserId) {
            return;
        }

        const notificationEvent: NotificationEvent = {
            userId: event.inviteeUserId,
            type: NotificationType.INVITATION_ACCEPTED,
            title: 'Welcome to the List',
            message: `You successfully joined the list "${event.listName}" shared by ${event.inviterName}.`,
        };

        await this.createNotification(notificationEvent);
    }

    async createListUpdateNotification(userId: string, listName: string, updateType: string): Promise<void> {
        const notificationEvent: NotificationEvent = {
            userId,
            type: NotificationType.LIST_UPDATE,
            title: 'List Updated',
            message: `The list "${listName}" has been ${updateType}.`,
        };

        await this.createNotification(notificationEvent);
    }

    private async createNotification(event: NotificationEvent): Promise<void> {
        try {
            await this.notificationsService.create({
                userId: event.userId,
                type: event.type,
                title: event.title,
                message: event.message,
            });
        } catch (error) {
            // Log error but don't throw to avoid breaking the main operation
            console.error('Failed to create notification:', error);
        }
    }
} 