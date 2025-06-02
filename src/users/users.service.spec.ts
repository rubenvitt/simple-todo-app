import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/services/prisma.service';
import { UsersService } from './users.service';

jest.mock('bcrypt');
const mockedBcrypt = jest.mocked(bcrypt);

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: any;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserResponse = {
    id: mockUser.id,
    email: mockUser.email,
    name: mockUser.name,
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn() as jest.MockedFunction<any>,
        update: jest.fn() as jest.MockedFunction<any>,
        delete: jest.fn() as jest.MockedFunction<any>,
      },
      $transaction: jest.fn() as jest.MockedFunction<any>,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUserResponse);

      const result = await service.getProfile(mockUser.id);

      expect(result).toEqual(mockUserResponse);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    const updateData = { name: 'Updated Name', email: 'updated@example.com' };

    it('should update user profile successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(null); // No existing user with new email
      prismaService.user.update.mockResolvedValue({
        ...mockUserResponse,
        ...updateData,
      });

      const result = await service.updateProfile(mockUser.id, updateData);

      expect(result).toEqual({ ...mockUserResponse, ...updateData });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should throw ConflictException when email is already taken', async () => {
      const existingUser = { ...mockUser, id: 'different-id' };
      prismaService.user.findUnique.mockResolvedValue(existingUser);

      await expect(
        service.updateProfile(mockUser.id, { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating to same email', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(mockUserResponse);

      const result = await service.updateProfile(mockUser.id, {
        email: mockUser.email,
      });

      expect(result).toEqual(mockUserResponse);
    });

    it('should throw NotFoundException when user not found during update', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.update.mockRejectedValue({ code: 'P2025' });

      await expect(
        service.updateProfile('nonexistent', updateData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    const changePasswordData = {
      currentPassword: 'oldPassword',
      newPassword: 'newPassword',
    };

    it('should change password successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        passwordHash: mockUser.passwordHash,
      });
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedBcrypt.hash.mockResolvedValue('newHashedPassword' as never);
      prismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.changePassword(mockUser.id, changePasswordData);

      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        changePasswordData.currentPassword,
        mockUser.passwordHash,
      );
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        changePasswordData.newPassword,
        12,
      );
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { passwordHash: 'newHashedPassword' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', changePasswordData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when current password is incorrect', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        passwordHash: mockUser.passwordHash,
      });
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.changePassword(mockUser.id, changePasswordData),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      prismaService.$transaction.mockImplementation((callback: any) =>
        callback({ user: { delete: jest.fn().mockResolvedValue(mockUser) } }),
      );

      const result = await service.deleteAccount(mockUser.id);

      expect(result).toEqual({ message: 'Account deleted successfully' });
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found during deletion', async () => {
      prismaService.$transaction.mockRejectedValue({ code: 'P2025' });

      await expect(service.deleteAccount('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('userExists', () => {
    it('should return true when user exists', async () => {
      prismaService.user.findUnique.mockResolvedValue({ id: mockUser.id });

      const result = await service.userExists(mockUser.id);

      expect(result).toBe(true);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: { id: true },
      });
    });

    it('should return false when user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.userExists('nonexistent');

      expect(result).toBe(false);
    });
  });
});
