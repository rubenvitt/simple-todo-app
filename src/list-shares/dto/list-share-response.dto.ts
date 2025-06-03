import { PermissionLevel } from '../../../generated/prisma';

export class ListShareResponseDto {
    id!: string;
    listId!: string;
    userId!: string;
    permissionLevel!: PermissionLevel;
    createdAt!: Date;
    user?: {
        id: string;
        email: string;
        name: string;
    };
    list?: {
        id: string;
        name: string;
        description: string | null;
        color: string;
    };
} 