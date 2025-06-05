import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InvitationStatus, PermissionLevel } from '../../generated/prisma';
import { PrismaService } from '../common/services/prisma.service';
import { CreateInvitationDto } from './dto';
import { InvitationsService } from './invitations.service';

const mockList = {
  id: 'list-1',
  name: 'Test List',
  description: 'Test Description',
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUser = {
  id: 'user-2',
  email: 'invitee@example.com',
  name: 'Invitee User',
  passwordHash: 'hash',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockInvitation = {
  id: 'invitation-1',
  listId: 'list-1',
  inviterUserId: 'user-1',
  inviteeEmail: 'invitee@example.com',
  status: InvitationStatus.PENDING,
  token: 'sample-token',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  list: {
    id: 'list-1',
    name: 'Test List',
    description: 'Test Description',
  },
  inviter: {
    id: 'user-1',
    name: 'Inviter User',
    email: 'inviter@example.com',
  },
};

describe('InvitationsService', () => {
  let service: InvitationsService;
  let prismaService: any;

  beforeEach(async () => {
    const mockPrismaService = {
      list: {
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      invitation: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      listShare: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvitation', () => {
    const createInvitationDto: CreateInvitationDto = {
      inviteeEmail: 'invitee@example.com',
      permissionLevel: PermissionLevel.VIEWER,
    };

    beforeEach(() => {
      // Mock crypto.randomBytes
      jest
        .spyOn(require('crypto'), 'randomBytes')
        .mockReturnValue(Buffer.from('sample-token-bytes'));
    });

    it('should successfully create an invitation', async () => {
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.invitation.findFirst.mockResolvedValue(null);
      prismaService.listShare.findFirst.mockResolvedValue(null);
      prismaService.invitation.create.mockResolvedValue(mockInvitation);

      const result = await service.createInvitation(
        'list-1',
        createInvitationDto,
        'user-1',
      );

      expect(result).toEqual(mockInvitation);
      expect(prismaService.list.findFirst).toHaveBeenCalledWith({
        where: { id: 'list-1', userId: 'user-1' },
      });
      expect(prismaService.invitation.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if list not found or user is not owner', async () => {
      prismaService.list.findFirst.mockResolvedValue(null);

      await expect(
        service.createInvitation('list-1', createInvitationDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for self-invitation', async () => {
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        id: 'user-1',
      });

      await expect(
        service.createInvitation('list-1', createInvitationDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if invitation already exists', async () => {
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.invitation.findFirst.mockResolvedValue(mockInvitation);

      await expect(
        service.createInvitation('list-1', createInvitationDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user already has access to list', async () => {
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.invitation.findFirst.mockResolvedValue(null);
      prismaService.listShare.findFirst.mockResolvedValue({
        id: 'share-1',
        listId: 'list-1',
        userId: 'user-2',
        permissionLevel: PermissionLevel.VIEWER,
        createdAt: new Date(),
      });

      await expect(
        service.createInvitation('list-1', createInvitationDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingInvitationsForUser', () => {
    it('should return pending invitations for user', async () => {
      const invitations = [mockInvitation];
      prismaService.invitation.findMany.mockResolvedValue(invitations);

      const result = await service.getPendingInvitationsForUser(
        'invitee@example.com',
      );

      expect(result).toEqual(invitations);
      expect(prismaService.invitation.findMany).toHaveBeenCalledWith({
        where: {
          inviteeEmail: 'invitee@example.com',
          status: InvitationStatus.PENDING,
          expiresAt: { gt: expect.any(Date) },
        },
        include: {
          list: { select: { id: true, name: true, description: true } },
          inviter: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('acceptInvitation', () => {
    it('should successfully accept invitation', async () => {
      const updatedInvitation = {
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
      };

      prismaService.invitation.findFirst.mockResolvedValue(mockInvitation);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          invitation: {
            update: jest.fn().mockResolvedValue(updatedInvitation),
          },
          listShare: {
            create: jest.fn().mockResolvedValue({}),
          },
          notification: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await service.acceptInvitation(
        'sample-token',
        'invitee@example.com',
      );

      expect(result).toEqual(updatedInvitation);
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if invitation not found', async () => {
      prismaService.invitation.findFirst.mockResolvedValue(null);

      await expect(
        service.acceptInvitation('invalid-token', 'invitee@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user account not found', async () => {
      prismaService.invitation.findFirst.mockResolvedValue(mockInvitation);
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptInvitation('sample-token', 'invitee@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('declineInvitation', () => {
    it('should successfully decline invitation', async () => {
      const updatedInvitation = {
        ...mockInvitation,
        status: InvitationStatus.DECLINED,
      };

      prismaService.invitation.findFirst.mockResolvedValue(mockInvitation);
      prismaService.invitation.update.mockResolvedValue(updatedInvitation);

      const result = await service.declineInvitation(
        'sample-token',
        'invitee@example.com',
      );

      expect(result).toEqual(updatedInvitation);
      expect(prismaService.invitation.update).toHaveBeenCalledWith({
        where: { id: 'invitation-1' },
        data: { status: InvitationStatus.DECLINED },
        include: {
          list: { select: { id: true, name: true, description: true } },
          inviter: { select: { id: true, name: true, email: true } },
        },
      });
    });

    it('should throw NotFoundException if invitation not found', async () => {
      prismaService.invitation.findFirst.mockResolvedValue(null);

      await expect(
        service.declineInvitation('invalid-token', 'invitee@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should clean up expired invitations', async () => {
      prismaService.invitation.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.cleanupExpiredInvitations();

      expect(result).toBe(5);
      expect(prismaService.invitation.updateMany).toHaveBeenCalledWith({
        where: {
          status: InvitationStatus.PENDING,
          expiresAt: { lt: expect.any(Date) },
        },
        data: { status: InvitationStatus.EXPIRED },
      });
    });
  });

  describe('handleExpiredInvitationsCleanup', () => {
    it('should successfully run scheduled cleanup', async () => {
      const cleanupSpy = jest
        .spyOn(service, 'cleanupExpiredInvitations')
        .mockResolvedValue(3);
      const loggerSpy = jest
        .spyOn(service['logger'], 'log')
        .mockImplementation();

      await service.handleExpiredInvitationsCleanup();

      expect(cleanupSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Starting scheduled cleanup of expired invitations...',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        'Successfully marked 3 expired invitations as EXPIRED',
      );
    });

    it('should handle cleanup with no expired invitations', async () => {
      const cleanupSpy = jest
        .spyOn(service, 'cleanupExpiredInvitations')
        .mockResolvedValue(0);
      const loggerDebugSpy = jest
        .spyOn(service['logger'], 'debug')
        .mockImplementation();

      await service.handleExpiredInvitationsCleanup();

      expect(cleanupSpy).toHaveBeenCalled();
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        'No expired invitations found during cleanup',
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      const error = new Error('Database connection failed');
      const cleanupSpy = jest
        .spyOn(service, 'cleanupExpiredInvitations')
        .mockRejectedValue(error);
      const loggerErrorSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      await service.handleExpiredInvitationsCleanup();

      expect(cleanupSpy).toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to cleanup expired invitations',
        error,
      );
    });
  });

  describe('getInvitationsByList', () => {
    it('should return invitations for a list if user is owner', async () => {
      const invitations = [mockInvitation];

      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.invitation.findMany.mockResolvedValue(invitations);

      const result = await service.getInvitationsByList('list-1', 'user-1');

      expect(result).toEqual(invitations);
      expect(prismaService.list.findFirst).toHaveBeenCalledWith({
        where: { id: 'list-1', userId: 'user-1' },
      });
    });

    it('should throw NotFoundException if list not found or user is not owner', async () => {
      prismaService.list.findFirst.mockResolvedValue(null);

      await expect(
        service.getInvitationsByList('list-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
