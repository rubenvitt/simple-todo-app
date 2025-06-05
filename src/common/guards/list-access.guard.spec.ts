import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ListSharesService } from '../../list-shares/list-shares.service';
import { ListAccessGuard } from './list-access.guard';

describe('ListAccessGuard', () => {
  let guard: ListAccessGuard;
  let listSharesService: any;

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'user-1' },
        params: { listId: 'list-1' },
      }),
    }),
  } as ExecutionContext;

  const mockExecutionContextWithIdParam = {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'user-1' },
        params: { id: 'list-1' },
      }),
    }),
  } as ExecutionContext;

  const mockExecutionContextNoUser = {
    switchToHttp: () => ({
      getRequest: () => ({
        params: { listId: 'list-1' },
      }),
    }),
  } as ExecutionContext;

  const mockExecutionContextNoListId = {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'user-1' },
        params: {},
      }),
    }),
  } as ExecutionContext;

  beforeEach(async () => {
    const mockListSharesService = {
      checkListAccess: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAccessGuard,
        {
          provide: ListSharesService,
          useValue: mockListSharesService,
        },
      ],
    }).compile();

    guard = module.get<ListAccessGuard>(ListAccessGuard);
    listSharesService = module.get<ListSharesService>(ListSharesService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true when user has access to list', async () => {
      // Arrange
      listSharesService.checkListAccess.mockResolvedValue(true);

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(listSharesService.checkListAccess).toHaveBeenCalledWith(
        'user-1',
        'list-1',
      );
    });

    it('should work with "id" parameter instead of "listId"', async () => {
      // Arrange
      listSharesService.checkListAccess.mockResolvedValue(true);

      // Act
      const result = await guard.canActivate(mockExecutionContextWithIdParam);

      // Assert
      expect(result).toBe(true);
      expect(listSharesService.checkListAccess).toHaveBeenCalledWith(
        'user-1',
        'list-1',
      );
    });

    it('should throw NotFoundException when user does not have access', async () => {
      // Arrange
      listSharesService.checkListAccess.mockResolvedValue(false);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new NotFoundException('List not found or you do not have access to it'),
      );
      expect(listSharesService.checkListAccess).toHaveBeenCalledWith(
        'user-1',
        'list-1',
      );
    });

    it('should throw NotFoundException when user is not authenticated', async () => {
      // Act & Assert
      await expect(
        guard.canActivate(mockExecutionContextNoUser),
      ).rejects.toThrow(new NotFoundException('User not authenticated'));
      expect(listSharesService.checkListAccess).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when list ID is not provided', async () => {
      // Act & Assert
      await expect(
        guard.canActivate(mockExecutionContextNoListId),
      ).rejects.toThrow(new NotFoundException('List ID not provided'));
      expect(listSharesService.checkListAccess).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const serviceError = new Error('Database connection failed');
      listSharesService.checkListAccess.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        serviceError,
      );
      expect(listSharesService.checkListAccess).toHaveBeenCalledWith(
        'user-1',
        'list-1',
      );
    });
  });
});
