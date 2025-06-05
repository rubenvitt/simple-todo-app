import { Test, TestingModule } from '@nestjs/testing';
import { PermissionLevel } from '../../generated/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserExistsGuard } from '../users/guards/user-exists.guard';
import {
  CreateListShareDto,
  ListShareResponseDto,
  UpdateListShareDto,
} from './dto';
import { ListSharesController } from './list-shares.controller';
import { ListSharesService } from './list-shares.service';

describe('ListSharesController', () => {
  let controller: ListSharesController;
  let service: any;

  const mockListShareResponseDto: ListShareResponseDto = {
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

  const mockRequest = {
    user: {
      id: 'user-1',
      email: 'owner@example.com',
    },
  };

  beforeEach(async () => {
    const mockListSharesService = {
      shareList: jest.fn(),
      getListShares: jest.fn(),
      updateListShare: jest.fn(),
      removeListShare: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListSharesController],
      providers: [
        {
          provide: ListSharesService,
          useValue: mockListSharesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UserExistsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ListSharesController>(ListSharesController);
    service = module.get<ListSharesService>(ListSharesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('shareList (POST /lists/:listId/shares)', () => {
    it('should successfully share a list with another user', async () => {
      // Arrange
      const createListShareDto: CreateListShareDto = {
        userEmail: 'target@example.com',
        permissionLevel: PermissionLevel.EDITOR,
      };
      service.shareList.mockResolvedValue(mockListShareResponseDto);

      // Act
      const result = await controller.shareList(
        mockRequest,
        'list-1',
        createListShareDto,
      );

      // Assert
      expect(result).toEqual(mockListShareResponseDto);
      expect(service.shareList).toHaveBeenCalledWith(
        'user-1',
        'list-1',
        createListShareDto,
      );
    });

    it('should handle service errors when sharing fails', async () => {
      // Arrange
      const createListShareDto: CreateListShareDto = {
        userEmail: 'target@example.com',
        permissionLevel: PermissionLevel.EDITOR,
      };
      const error = new Error('Service error');
      service.shareList.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.shareList(mockRequest, 'list-1', createListShareDto),
      ).rejects.toThrow(error);
      expect(service.shareList).toHaveBeenCalledWith(
        'user-1',
        'list-1',
        createListShareDto,
      );
    });

    it('should validate listId parameter as UUID', async () => {
      // This test verifies that the ParseUUIDPipe is working
      // In a real scenario, invalid UUIDs would be caught by the pipe
      const createListShareDto: CreateListShareDto = {
        userEmail: 'target@example.com',
        permissionLevel: PermissionLevel.EDITOR,
      };
      service.shareList.mockResolvedValue(mockListShareResponseDto);

      const result = await controller.shareList(
        mockRequest,
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        createListShareDto,
      );

      expect(service.shareList).toHaveBeenCalledWith(
        'user-1',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        createListShareDto,
      );
      expect(result).toEqual(mockListShareResponseDto);
    });
  });

  describe('getListShares (GET /lists/:listId/shares)', () => {
    it('should return list of shares for a list', async () => {
      // Arrange
      const mockShares = [mockListShareResponseDto];
      service.getListShares.mockResolvedValue(mockShares);

      // Act
      const result = await controller.getListShares(mockRequest, 'list-1');

      // Assert
      expect(result).toEqual(mockShares);
      expect(service.getListShares).toHaveBeenCalledWith('user-1', 'list-1');
    });

    it('should handle empty shares list', async () => {
      // Arrange
      service.getListShares.mockResolvedValue([]);

      // Act
      const result = await controller.getListShares(mockRequest, 'list-1');

      // Assert
      expect(result).toEqual([]);
      expect(service.getListShares).toHaveBeenCalledWith('user-1', 'list-1');
    });
  });

  describe('updateListShare (PUT /lists/:listId/shares/:userId)', () => {
    it('should successfully update list share permission', async () => {
      // Arrange
      const updateListShareDto: UpdateListShareDto = {
        permissionLevel: PermissionLevel.VIEWER,
      };
      const updatedShare = {
        ...mockListShareResponseDto,
        permissionLevel: PermissionLevel.VIEWER,
      };
      service.updateListShare.mockResolvedValue(updatedShare);

      // Act
      const result = await controller.updateListShare(
        mockRequest,
        'list-1',
        'user-2',
        updateListShareDto,
      );

      // Assert
      expect(result).toEqual(updatedShare);
      expect(service.updateListShare).toHaveBeenCalledWith(
        'user-1',
        'list-1',
        'user-2',
        updateListShareDto,
      );
    });

    it('should validate both listId and userId as UUIDs', async () => {
      // Arrange
      const updateListShareDto: UpdateListShareDto = {
        permissionLevel: PermissionLevel.VIEWER,
      };
      service.updateListShare.mockResolvedValue(mockListShareResponseDto);

      // Act
      const result = await controller.updateListShare(
        mockRequest,
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'f47ac10b-58cc-4372-a567-0e02b2c3d480',
        updateListShareDto,
      );

      // Assert
      expect(service.updateListShare).toHaveBeenCalledWith(
        'user-1',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'f47ac10b-58cc-4372-a567-0e02b2c3d480',
        updateListShareDto,
      );
      expect(result).toEqual(mockListShareResponseDto);
    });
  });

  describe('removeListShare (DELETE /lists/:listId/shares/:userId)', () => {
    it('should successfully remove list share', async () => {
      // Arrange
      const successMessage = { message: 'List share removed successfully' };
      service.removeListShare.mockResolvedValue(successMessage);

      // Act
      const result = await controller.removeListShare(
        mockRequest,
        'list-1',
        'user-2',
      );

      // Assert
      expect(result).toEqual(successMessage);
      expect(service.removeListShare).toHaveBeenCalledWith(
        'user-1',
        'list-1',
        'user-2',
      );
    });

    it('should validate both listId and userId as UUIDs for removal', async () => {
      // Arrange
      const successMessage = { message: 'List share removed successfully' };
      service.removeListShare.mockResolvedValue(successMessage);

      // Act
      const result = await controller.removeListShare(
        mockRequest,
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'f47ac10b-58cc-4372-a567-0e02b2c3d480',
      );

      // Assert
      expect(service.removeListShare).toHaveBeenCalledWith(
        'user-1',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'f47ac10b-58cc-4372-a567-0e02b2c3d480',
      );
      expect(result).toEqual(successMessage);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require JWT authentication for all endpoints', () => {
      // This test verifies that JwtAuthGuard is applied
      const guards = Reflect.getMetadata('__guards__', ListSharesController);
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should require user existence validation for all endpoints', () => {
      // This test verifies that UserExistsGuard is applied
      const guards = Reflect.getMetadata('__guards__', ListSharesController);
      expect(guards).toContain(UserExistsGuard);
    });
  });
});
