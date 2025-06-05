import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionLevel } from '../../generated/prisma';
import { PrismaService } from '../common/services/prisma.service';
import { CreateListShareDto, UpdateListShareDto } from './dto';
import { ListSharesService } from './list-shares.service';

describe('ListSharesService', () => {
  let service: ListSharesService;
  let prismaService: any;

  const mockTargetUser = {
    id: 'user-2',
    email: 'target@example.com',
    name: 'Target User',
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockList = {
    id: 'list-1',
    name: 'Test List',
    description: 'Test Description',
    color: '#3B82F6',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockListShare = {
    id: 'share-1',
    listId: 'list-1',
    userId: 'user-2',
    permissionLevel: PermissionLevel.EDITOR,
    createdAt: new Date(),
    user: {
      id: 'user-2',
      email: 'target@example.com',
      name: 'Target User',
    },
    list: {
      id: 'list-1',
      name: 'Test List',
      description: 'Test Description',
      color: '#3B82F6',
    },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      list: {
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      listShare: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListSharesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ListSharesService>(ListSharesService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shareList', () => {
    const createListShareDto: CreateListShareDto = {
      userEmail: 'target@example.com',
      permissionLevel: PermissionLevel.EDITOR,
    };

    it('should successfully share a list with another user', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.user.findUnique.mockResolvedValue(mockTargetUser);
      prismaService.listShare.findUnique.mockResolvedValue(null);
      prismaService.listShare.create.mockResolvedValue(mockListShare);

      // Act
      const result = await service.shareList(
        'user-1',
        'list-1',
        createListShareDto,
      );

      // Assert
      expect(result).toEqual(mockListShare);
      expect(prismaService.list.findFirst).toHaveBeenCalledWith({
        where: { id: 'list-1', userId: 'user-1' },
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'target@example.com' },
      });
      expect(prismaService.listShare.findUnique).toHaveBeenCalledWith({
        where: {
          listId_userId: {
            listId: 'list-1',
            userId: 'user-2',
          },
        },
      });
      expect(prismaService.listShare.create).toHaveBeenCalledWith({
        data: {
          listId: 'list-1',
          userId: 'user-2',
          permissionLevel: PermissionLevel.EDITOR,
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
    });

    it('should throw NotFoundException when list is not found or user does not own it', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.shareList('user-1', 'list-1', createListShareDto),
      ).rejects.toThrow(
        new NotFoundException(
          'List not found or you do not have permission to share it',
        ),
      );
    });

    it('should throw NotFoundException when target user is not found', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.shareList('user-1', 'list-1', createListShareDto),
      ).rejects.toThrow(
        new NotFoundException('User with this email not found'),
      );
    });

    it('should throw ConflictException when trying to share with self', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.user.findUnique.mockResolvedValue({
        ...mockTargetUser,
        id: 'user-1',
      });

      // Act & Assert
      await expect(
        service.shareList('user-1', 'list-1', createListShareDto),
      ).rejects.toThrow(
        new ConflictException('You cannot share a list with yourself'),
      );
    });

    it('should throw ConflictException when list is already shared with user', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.user.findUnique.mockResolvedValue(mockTargetUser);
      prismaService.listShare.findUnique.mockResolvedValue(mockListShare);

      // Act & Assert
      await expect(
        service.shareList('user-1', 'list-1', createListShareDto),
      ).rejects.toThrow(
        new ConflictException('List is already shared with this user'),
      );
    });
  });

  describe('getListShares', () => {
    it('should return list shares when user has access', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.listShare.findMany.mockResolvedValue([mockListShare]);

      // Act
      const result = await service.getListShares('user-1', 'list-1');

      // Assert
      expect(result).toEqual([mockListShare]);
      expect(prismaService.listShare.findMany).toHaveBeenCalledWith({
        where: { listId: 'list-1' },
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
    });

    it('should throw ForbiddenException when user does not have access', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getListShares('user-1', 'list-1')).rejects.toThrow(
        new ForbiddenException('You do not have access to this list'),
      );
    });
  });

  describe('updateListShare', () => {
    const updateListShareDto: UpdateListShareDto = {
      permissionLevel: PermissionLevel.VIEWER,
    };

    it('should successfully update list share permission', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.listShare.findUnique.mockResolvedValue(mockListShare);
      const updatedShare = {
        ...mockListShare,
        permissionLevel: PermissionLevel.VIEWER,
      };
      prismaService.listShare.update.mockResolvedValue(updatedShare);

      // Act
      const result = await service.updateListShare(
        'user-1',
        'list-1',
        'user-2',
        updateListShareDto,
      );

      // Assert
      expect(result).toEqual(updatedShare);
      expect(prismaService.listShare.update).toHaveBeenCalledWith({
        where: {
          listId_userId: {
            listId: 'list-1',
            userId: 'user-2',
          },
        },
        data: {
          permissionLevel: PermissionLevel.VIEWER,
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
    });

    it('should throw NotFoundException when user does not own the list', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateListShare(
          'user-1',
          'list-1',
          'user-2',
          updateListShareDto,
        ),
      ).rejects.toThrow(
        new NotFoundException(
          'List not found or you do not have permission to modify shares',
        ),
      );
    });

    it('should throw NotFoundException when share does not exist', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.listShare.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateListShare(
          'user-1',
          'list-1',
          'user-2',
          updateListShareDto,
        ),
      ).rejects.toThrow(new NotFoundException('Share not found'));
    });
  });

  describe('removeListShare', () => {
    it('should successfully remove list share', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.listShare.findUnique.mockResolvedValue(mockListShare);
      prismaService.listShare.delete.mockResolvedValue(mockListShare);

      // Act
      const result = await service.removeListShare(
        'user-1',
        'list-1',
        'user-2',
      );

      // Assert
      expect(result).toEqual({ message: 'List share removed successfully' });
      expect(prismaService.listShare.delete).toHaveBeenCalledWith({
        where: {
          listId_userId: {
            listId: 'list-1',
            userId: 'user-2',
          },
        },
      });
    });

    it('should throw NotFoundException when user does not own the list', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removeListShare('user-1', 'list-1', 'user-2'),
      ).rejects.toThrow(
        new NotFoundException(
          'List not found or you do not have permission to modify shares',
        ),
      );
    });

    it('should throw NotFoundException when share does not exist', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.listShare.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removeListShare('user-1', 'list-1', 'user-2'),
      ).rejects.toThrow(new NotFoundException('Share not found'));
    });
  });

  describe('checkListAccess', () => {
    it('should return true when user owns the list', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(mockList);

      // Act
      const result = await service.checkListAccess('user-1', 'list-1');

      // Assert
      expect(result).toBe(true);
      expect(prismaService.list.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'list-1',
          OR: [
            { userId: 'user-1' },
            {
              shares: {
                some: {
                  userId: 'user-1',
                },
              },
            },
          ],
        },
      });
    });

    it('should return false when user does not have access', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.checkListAccess('user-1', 'list-1');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getUserPermissionLevel', () => {
    it('should return OWNER when user owns the list', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(mockList);

      // Act
      const result = await service.getUserPermissionLevel('user-1', 'list-1');

      // Assert
      expect(result).toBe(PermissionLevel.OWNER);
    });

    it('should return shared permission level when user has shared access', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(null);
      prismaService.listShare.findUnique.mockResolvedValue(mockListShare);

      // Act
      const result = await service.getUserPermissionLevel('user-2', 'list-1');

      // Assert
      expect(result).toBe(PermissionLevel.EDITOR);
    });

    it('should return null when user has no access', async () => {
      // Arrange
      prismaService.list.findFirst.mockResolvedValue(null);
      prismaService.listShare.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getUserPermissionLevel('user-3', 'list-1');

      // Assert
      expect(result).toBe(null);
    });
  });
});
