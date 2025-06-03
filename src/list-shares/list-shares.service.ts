import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PermissionLevel } from '../../generated/prisma';
import { PrismaService } from '../common/services/prisma.service';
import { CreateListShareDto, ListShareResponseDto, UpdateListShareDto } from './dto';

@Injectable()
export class ListSharesService {
    constructor(private readonly prisma: PrismaService) { }

    async shareList(userId: string, listId: string, createListShareDto: CreateListShareDto): Promise<ListShareResponseDto> {
        // Verify that the user owns the list
        const list = await this.prisma.list.findFirst({
            where: {
                id: listId,
                userId,
            },
        });

        if (!list) {
            throw new NotFoundException('List not found or you do not have permission to share it');
        }

        // Find the user by email
        const userToShare = await this.prisma.user.findUnique({
            where: { email: createListShareDto.userEmail },
        });

        if (!userToShare) {
            throw new NotFoundException('User with this email not found');
        }

        // Check if the user is trying to share with themselves
        if (userToShare.id === userId) {
            throw new ConflictException('You cannot share a list with yourself');
        }

        // Check if the list is already shared with this user
        const existingShare = await this.prisma.listShare.findUnique({
            where: {
                listId_userId: {
                    listId,
                    userId: userToShare.id,
                },
            },
        });

        if (existingShare) {
            throw new ConflictException('List is already shared with this user');
        }

        // Create the share
        const listShare = await this.prisma.listShare.create({
            data: {
                listId,
                userId: userToShare.id,
                permissionLevel: createListShareDto.permissionLevel,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
                list: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        color: true,
                    },
                },
            },
        });

        return listShare;
    }

    async getListShares(userId: string, listId: string): Promise<ListShareResponseDto[]> {
        // Verify that the user has access to the list (owner or shared)
        const hasAccess = await this.checkListAccess(userId, listId);
        if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this list');
        }

        const shares = await this.prisma.listShare.findMany({
            where: { listId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
                list: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        color: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return shares;
    }

    async updateListShare(userId: string, listId: string, targetUserId: string, updateListShareDto: UpdateListShareDto): Promise<ListShareResponseDto> {
        // Verify that the user owns the list
        const list = await this.prisma.list.findFirst({
            where: {
                id: listId,
                userId,
            },
        });

        if (!list) {
            throw new NotFoundException('List not found or you do not have permission to modify shares');
        }

        // Find the share to update
        const existingShare = await this.prisma.listShare.findUnique({
            where: {
                listId_userId: {
                    listId,
                    userId: targetUserId,
                },
            },
        });

        if (!existingShare) {
            throw new NotFoundException('Share not found');
        }

        // Update the share
        const updatedShare = await this.prisma.listShare.update({
            where: {
                listId_userId: {
                    listId,
                    userId: targetUserId,
                },
            },
            data: {
                permissionLevel: updateListShareDto.permissionLevel,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
                list: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        color: true,
                    },
                },
            },
        });

        return updatedShare;
    }

    async removeListShare(userId: string, listId: string, targetUserId: string): Promise<{ message: string }> {
        // Verify that the user owns the list
        const list = await this.prisma.list.findFirst({
            where: {
                id: listId,
                userId,
            },
        });

        if (!list) {
            throw new NotFoundException('List not found or you do not have permission to modify shares');
        }

        // Find the share to remove
        const existingShare = await this.prisma.listShare.findUnique({
            where: {
                listId_userId: {
                    listId,
                    userId: targetUserId,
                },
            },
        });

        if (!existingShare) {
            throw new NotFoundException('Share not found');
        }

        // Remove the share
        await this.prisma.listShare.delete({
            where: {
                listId_userId: {
                    listId,
                    userId: targetUserId,
                },
            },
        });

        return { message: 'List share removed successfully' };
    }

    async checkListAccess(userId: string, listId: string): Promise<boolean> {
        // Check if user owns the list or has shared access
        const access = await this.prisma.list.findFirst({
            where: {
                id: listId,
                OR: [
                    { userId }, // User owns the list
                    {
                        shares: {
                            some: {
                                userId, // User has shared access
                            },
                        },
                    },
                ],
            },
        });

        return !!access;
    }

    async getUserPermissionLevel(userId: string, listId: string): Promise<PermissionLevel | null> {
        // Check if user owns the list
        const ownedList = await this.prisma.list.findFirst({
            where: {
                id: listId,
                userId,
            },
        });

        if (ownedList) {
            return PermissionLevel.OWNER;
        }

        // Check shared permissions
        const share = await this.prisma.listShare.findUnique({
            where: {
                listId_userId: {
                    listId,
                    userId,
                },
            },
        });

        return share?.permissionLevel || null;
    }
} 