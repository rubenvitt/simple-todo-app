import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import { InvitationStatus, PermissionLevel } from '../../generated/prisma';
import { PrismaService } from '../common/services/prisma.service';
import { CreateInvitationDto, InvitationResponseDto } from './dto';

@Injectable()
export class InvitationsService {
    private readonly logger = new Logger(InvitationsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async createInvitation(
        listId: string,
        createInvitationDto: CreateInvitationDto,
        inviterUserId: string,
    ): Promise<InvitationResponseDto> {
        // Check if list exists and user is owner
        const list = await this.prisma.list.findFirst({
            where: {
                id: listId,
                userId: inviterUserId,
            },
        });

        if (!list) {
            throw new NotFoundException('List not found or you are not the owner');
        }

        // Check if user exists by email
        const inviteeUser = await this.prisma.user.findUnique({
            where: { email: createInvitationDto.inviteeEmail },
        });

        // Prevent self-invitation
        if (inviteeUser?.id === inviterUserId) {
            throw new BadRequestException('You cannot invite yourself');
        }

        // Check if invitation already exists for this email and list
        const existingInvitation = await this.prisma.invitation.findFirst({
            where: {
                listId,
                inviteeEmail: createInvitationDto.inviteeEmail,
                status: InvitationStatus.PENDING,
            },
        });

        if (existingInvitation) {
            throw new BadRequestException('Invitation already sent to this email for this list');
        }

        // Check if user is already sharing this list
        if (inviteeUser) {
            const existingShare = await this.prisma.listShare.findFirst({
                where: {
                    listId,
                    userId: inviteeUser.id,
                },
            });

            if (existingShare) {
                throw new BadRequestException('This user already has access to this list');
            }
        }

        // Generate secure token
        const token = randomBytes(32).toString('hex');

        // Set expiry date (7 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create invitation
        const invitation = await this.prisma.invitation.create({
            data: {
                listId,
                inviterUserId,
                inviteeEmail: createInvitationDto.inviteeEmail,
                token,
                expiresAt,
            },
            include: {
                list: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
                inviter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // Create notification for the inviter
        if (inviteeUser) {
            await this.prisma.notification.create({
                data: {
                    userId: inviteeUser.id,
                    message: `You have been invited to collaborate on the list "${invitation.list?.name}" by ${invitation.inviter?.name}`,
                },
            });
        }

        // TODO: Send email invitation (for now, we just create notification)
        // In a real application, you would integrate with an email service here
        // Example: await this.emailService.sendInvitationEmail(invitation);

        return invitation;
    }

    async getPendingInvitationsForUser(userEmail: string): Promise<InvitationResponseDto[]> {
        const invitations = await this.prisma.invitation.findMany({
            where: {
                inviteeEmail: userEmail,
                status: InvitationStatus.PENDING,
                expiresAt: {
                    gt: new Date(), // Only return non-expired invitations
                },
            },
            include: {
                list: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
                inviter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return invitations;
    }

    async acceptInvitation(token: string, userEmail: string): Promise<InvitationResponseDto> {
        const invitation = await this.prisma.invitation.findFirst({
            where: {
                token,
                inviteeEmail: userEmail,
                status: InvitationStatus.PENDING,
                expiresAt: {
                    gt: new Date(),
                },
            },
            include: {
                list: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
                inviter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found or expired');
        }

        // Find the invitee user
        const inviteeUser = await this.prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!inviteeUser) {
            throw new NotFoundException('User account not found');
        }

        // Use transaction to ensure data consistency
        return await this.prisma.$transaction(async (tx) => {
            // Update invitation status
            const updatedInvitation = await tx.invitation.update({
                where: { id: invitation.id },
                data: { status: InvitationStatus.ACCEPTED },
                include: {
                    list: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                        },
                    },
                    inviter: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            // Create list share
            await tx.listShare.create({
                data: {
                    listId: invitation.listId,
                    userId: inviteeUser.id,
                    permissionLevel: PermissionLevel.VIEWER, // Default permission
                },
            });

            // Create notification for the inviter about acceptance
            await tx.notification.create({
                data: {
                    userId: invitation.inviterUserId,
                    message: `${inviteeUser.name} has accepted your invitation to collaborate on "${invitation.list?.name}"`,
                },
            });

            return updatedInvitation;
        });
    }

    async declineInvitation(token: string, userEmail: string): Promise<InvitationResponseDto> {
        const invitation = await this.prisma.invitation.findFirst({
            where: {
                token,
                inviteeEmail: userEmail,
                status: InvitationStatus.PENDING,
                expiresAt: {
                    gt: new Date(),
                },
            },
            include: {
                list: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
                inviter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found or expired');
        }

        const updatedInvitation = await this.prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: InvitationStatus.DECLINED },
            include: {
                list: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
                inviter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // Create notification for the inviter about decline
        await this.prisma.notification.create({
            data: {
                userId: invitation.inviterUserId,
                message: `Your invitation to collaborate on "${invitation.list?.name}" has been declined`,
            },
        });

        return updatedInvitation;
    }

    async cleanupExpiredInvitations(): Promise<number> {
        const result = await this.prisma.invitation.updateMany({
            where: {
                status: InvitationStatus.PENDING,
                expiresAt: {
                    lt: new Date(),
                },
            },
            data: {
                status: InvitationStatus.EXPIRED,
            },
        });

        return result.count;
    }

    /**
     * Scheduled job that runs every hour to clean up expired invitations
     * Converts PENDING invitations that have passed their expiry date to EXPIRED status
     */
    @Cron(CronExpression.EVERY_HOUR)
    async handleExpiredInvitationsCleanup(): Promise<void> {
        try {
            this.logger.log('Starting scheduled cleanup of expired invitations...');

            const expiredCount = await this.cleanupExpiredInvitations();

            if (expiredCount > 0) {
                this.logger.log(`Successfully marked ${expiredCount} expired invitations as EXPIRED`);
            } else {
                this.logger.debug('No expired invitations found during cleanup');
            }
        } catch (error) {
            this.logger.error('Failed to cleanup expired invitations', error);
        }
    }

    async getInvitationsByList(listId: string, ownerId: string): Promise<InvitationResponseDto[]> {
        // Verify list ownership
        const list = await this.prisma.list.findFirst({
            where: {
                id: listId,
                userId: ownerId,
            },
        });

        if (!list) {
            throw new NotFoundException('List not found or you are not the owner');
        }

        const invitations = await this.prisma.invitation.findMany({
            where: {
                listId,
            },
            include: {
                list: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
                inviter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return invitations;
    }

    async getPaginatedInvitationsForUser(
        userEmail: string,
        query: { page?: number; limit?: number; status?: string; search?: string }
    ): Promise<any> {
        const { page = 1, limit = 10, status, search } = query;
        const skip = (page - 1) * limit;

        // Build where conditions
        const whereConditions: any = {
            inviteeEmail: userEmail,
            expiresAt: {
                gt: new Date(), // Only return non-expired invitations
            },
        };

        // Add status filter if provided
        if (status) {
            whereConditions.status = status;
        } else {
            // Default to PENDING only
            whereConditions.status = InvitationStatus.PENDING;
        }

        // Add search filter if provided
        if (search) {
            whereConditions.OR = [
                {
                    list: {
                        name: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                },
                {
                    inviter: {
                        name: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                },
                {
                    inviter: {
                        email: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                },
            ];
        }

        // Get total count for pagination
        const total = await this.prisma.invitation.count({
            where: whereConditions,
        });

        // Get paginated results
        const invitations = await this.prisma.invitation.findMany({
            where: whereConditions,
            include: {
                list: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
                inviter: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip,
            take: limit,
        });

        const totalPages = Math.ceil(total / limit);

        return {
            data: invitations,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }
} 