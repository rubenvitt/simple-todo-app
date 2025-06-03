import { NotificationType } from '../../../generated/prisma';

export class NotificationResponseDto {
    id!: string;
    userId!: string;
    type!: NotificationType;
    title!: string;
    message!: string;
    readStatus!: boolean;
    createdAt!: Date;
}

export class PaginatedNotificationsResponseDto {
    notifications!: NotificationResponseDto[];
    total!: number;
    page!: number;
    limit!: number;
    totalPages!: number;
} 