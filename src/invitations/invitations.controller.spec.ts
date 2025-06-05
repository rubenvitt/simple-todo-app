import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InvitationStatus, PermissionLevel } from '../../generated/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserExistsGuard } from '../users/guards/user-exists.guard';
import { CreateInvitationDto } from './dto';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

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

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
};

describe('InvitationsController', () => {
  let controller: InvitationsController;
  let invitationsService: any;

  beforeEach(async () => {
    const mockInvitationsService = {
      createInvitation: jest.fn(),
      getPendingInvitationsForUser: jest.fn(),
      getPaginatedInvitationsForUser: jest.fn(),
      getInvitationsByList: jest.fn(),
      acceptInvitation: jest.fn(),
      declineInvitation: jest.fn(),
      cleanupExpiredInvitations: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        {
          provide: InvitationsService,
          useValue: mockInvitationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(UserExistsGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<InvitationsController>(InvitationsController);
    invitationsService = module.get(InvitationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createInvitation', () => {
    const createInvitationDto: CreateInvitationDto = {
      inviteeEmail: 'invitee@example.com',
      permissionLevel: PermissionLevel.VIEWER,
    };

    const req = { user: mockUser };

    it('should successfully create an invitation', async () => {
      invitationsService.createInvitation.mockResolvedValue(mockInvitation);

      const result = await controller.createInvitation(
        'list-1',
        createInvitationDto,
        req,
      );

      expect(result).toEqual(mockInvitation);
      expect(invitationsService.createInvitation).toHaveBeenCalledWith(
        'list-1',
        createInvitationDto,
        'user-1',
      );
    });

    it('should throw NotFoundException when list not found', async () => {
      invitationsService.createInvitation.mockRejectedValue(
        new NotFoundException('List not found or you are not the owner'),
      );

      await expect(
        controller.createInvitation('list-1', createInvitationDto, req),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid invitation', async () => {
      invitationsService.createInvitation.mockRejectedValue(
        new BadRequestException('You cannot invite yourself'),
      );

      await expect(
        controller.createInvitation('list-1', createInvitationDto, req),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingInvitations', () => {
    const req = { user: mockUser };

    it('should return pending invitations for user', async () => {
      const invitations = [mockInvitation];
      invitationsService.getPendingInvitationsForUser.mockResolvedValue(
        invitations,
      );

      const result = await controller.getPendingInvitations(req, {});

      expect(result).toEqual(invitations);
      expect(
        invitationsService.getPendingInvitationsForUser,
      ).toHaveBeenCalledWith('user@example.com');
    });

    it('should return empty array when no pending invitations', async () => {
      invitationsService.getPendingInvitationsForUser.mockResolvedValue([]);

      const result = await controller.getPendingInvitations(req, {});

      expect(result).toEqual([]);
    });

    it('should use paginated version when query parameters are provided', async () => {
      const paginatedResult = {
        data: [mockInvitation],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
      invitationsService.getPaginatedInvitationsForUser.mockResolvedValue(
        paginatedResult,
      );

      const result = await controller.getPendingInvitations(req, {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(paginatedResult);
      expect(
        invitationsService.getPaginatedInvitationsForUser,
      ).toHaveBeenCalledWith('user@example.com', { page: 1, limit: 10 });
    });
  });

  describe('getInvitationsByList', () => {
    const req = { user: mockUser };

    it('should return invitations for a list', async () => {
      const invitations = [mockInvitation];
      invitationsService.getInvitationsByList.mockResolvedValue(invitations);

      const result = await controller.getInvitationsByList('list-1', req);

      expect(result).toEqual(invitations);
      expect(invitationsService.getInvitationsByList).toHaveBeenCalledWith(
        'list-1',
        'user-1',
      );
    });

    it('should throw NotFoundException when list not found or user is not owner', async () => {
      invitationsService.getInvitationsByList.mockRejectedValue(
        new NotFoundException('List not found or you are not the owner'),
      );

      await expect(
        controller.getInvitationsByList('list-1', req),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptInvitation', () => {
    const req = { user: mockUser };

    it('should successfully accept invitation', async () => {
      const acceptedInvitation = {
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
      };
      invitationsService.acceptInvitation.mockResolvedValue(acceptedInvitation);

      const result = await controller.acceptInvitation('sample-token', req);

      expect(result).toEqual(acceptedInvitation);
      expect(invitationsService.acceptInvitation).toHaveBeenCalledWith(
        'sample-token',
        'user@example.com',
      );
    });

    it('should throw NotFoundException when invitation not found', async () => {
      invitationsService.acceptInvitation.mockRejectedValue(
        new NotFoundException('Invitation not found or expired'),
      );

      await expect(
        controller.acceptInvitation('invalid-token', req),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('declineInvitation', () => {
    const req = { user: mockUser };

    it('should successfully decline invitation', async () => {
      const declinedInvitation = {
        ...mockInvitation,
        status: InvitationStatus.DECLINED,
      };
      invitationsService.declineInvitation.mockResolvedValue(
        declinedInvitation,
      );

      const result = await controller.declineInvitation('sample-token', req);

      expect(result).toEqual(declinedInvitation);
      expect(invitationsService.declineInvitation).toHaveBeenCalledWith(
        'sample-token',
        'user@example.com',
      );
    });

    it('should throw NotFoundException when invitation not found', async () => {
      invitationsService.declineInvitation.mockRejectedValue(
        new NotFoundException('Invitation not found or expired'),
      );

      await expect(
        controller.declineInvitation('invalid-token', req),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should successfully cleanup expired invitations', async () => {
      invitationsService.cleanupExpiredInvitations.mockResolvedValue(5);

      const result = await controller.cleanupExpiredInvitations();

      expect(result).toEqual({
        message: 'Successfully processed 5 expired invitations',
        expiredCount: 5,
      });
      expect(invitationsService.cleanupExpiredInvitations).toHaveBeenCalled();
    });

    it('should handle cleanup with no expired invitations', async () => {
      invitationsService.cleanupExpiredInvitations.mockResolvedValue(0);

      const result = await controller.cleanupExpiredInvitations();

      expect(result).toEqual({
        message: 'Successfully processed 0 expired invitations',
        expiredCount: 0,
      });
    });
  });
});
