import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/services/prisma.service';
import { ChangePasswordDto, ProfileResponseDto, SearchUsersDto, UpdateProfileDto } from './dto';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async getProfile(userId: string): Promise<ProfileResponseDto> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async updateProfile(userId: string, updateData: UpdateProfileDto): Promise<ProfileResponseDto> {
        // Check if email is being updated and if it's already taken
        if (updateData.email) {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: updateData.email },
            });

            if (existingUser && existingUser.id !== userId) {
                throw new ConflictException('Email already in use');
            }
        }

        try {
            const updatedUser = await this.prisma.user.update({
                where: { id: userId },
                data: updateData,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            return updatedUser;
        } catch (error: any) {
            if (error.code === 'P2025') {
                throw new NotFoundException('User not found');
            }
            throw error;
        }
    }

    async changePassword(userId: string, changePasswordData: ChangePasswordDto): Promise<{ message: string }> {
        // Get user with password hash
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                passwordHash: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(
            changePasswordData.currentPassword,
            user.passwordHash,
        );

        if (!isCurrentPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(changePasswordData.newPassword, saltRounds);

        // Update password
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: newPasswordHash,
            },
        });

        return { message: 'Password changed successfully' };
    }

    async deleteAccount(userId: string): Promise<{ message: string }> {
        try {
            // Use transaction to ensure all related data is cleaned up properly
            await this.prisma.$transaction(async (tx) => {
                // Delete the user (cascading deletes will handle related data)
                await tx.user.delete({
                    where: { id: userId },
                });
            });

            return { message: 'Account deleted successfully' };
        } catch (error: any) {
            if (error.code === 'P2025') {
                throw new NotFoundException('User not found');
            }
            throw error;
        }
    }

    async userExists(userId: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        return !!user;
    }

    async searchUsers(searchDto: SearchUsersDto, userId: string) {
        const {
            search,
            listId,
            page = 1,
            limit = 10
        } = searchDto;

        // Build where clause for filtering
        const where: any = {};

        // Search in name and email
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        // If listId is provided, only show users with access to that list
        if (listId) {
            // First verify the requesting user has access to the list
            const listAccess = await this.prisma.list.findFirst({
                where: {
                    id: listId,
                    OR: [
                        { userId: userId }, // User owns the list
                        { shares: { some: { userId: userId } } } // User has shared access
                    ]
                }
            });

            if (!listAccess) {
                throw new NotFoundException('List not found or you do not have access to it');
            }

            // Filter users who have access to the specified list
            where.OR = [
                { lists: { some: { id: listId } } }, // User owns the list
                { shares: { some: { listId: listId } } } // User has shared access to the list
            ];
        }

        // Exclude the current user from results
        where.id = {
            not: userId
        };

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Execute query with count for pagination
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true
                },
                orderBy: {
                    name: 'asc'
                },
                skip,
                take: limit
            }),
            this.prisma.user.count({ where })
        ]);

        return {
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}
