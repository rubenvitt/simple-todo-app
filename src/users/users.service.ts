import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/services/prisma.service';
import { ChangePasswordDto, ProfileResponseDto, UpdateProfileDto } from './dto';

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
}
