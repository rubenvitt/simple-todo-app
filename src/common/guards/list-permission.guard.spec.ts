import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionLevel } from '../../../generated/prisma';
import { ListSharesService } from '../../list-shares/list-shares.service';
import { ListPermissionGuard, REQUIRED_PERMISSION_KEY } from './list-permission.guard';

describe('ListPermissionGuard', () => {
    let guard: ListPermissionGuard;
    let listSharesService: any;
    let reflector: any;

    const mockRequest: any = {
        user: { id: 'user-1' },
        params: { listId: 'list-1' },
    };

    const mockExecutionContext = {
        switchToHttp: () => ({
            getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
    } as ExecutionContext;

    const mockExecutionContextNoUser = {
        switchToHttp: () => ({
            getRequest: () => ({
                params: { listId: 'list-1' },
            }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
    } as ExecutionContext;

    const mockExecutionContextNoListId = {
        switchToHttp: () => ({
            getRequest: () => ({
                user: { id: 'user-1' },
                params: {},
            }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
    } as ExecutionContext;

    beforeEach(async () => {
        const mockListSharesService = {
            getUserPermissionLevel: jest.fn(),
        };

        const mockReflector = {
            getAllAndOverride: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ListPermissionGuard,
                {
                    provide: ListSharesService,
                    useValue: mockListSharesService,
                },
                {
                    provide: Reflector,
                    useValue: mockReflector,
                },
            ],
        }).compile();

        guard = module.get<ListPermissionGuard>(ListPermissionGuard);
        listSharesService = module.get<ListSharesService>(ListSharesService);
        reflector = module.get<Reflector>(Reflector);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    describe('canActivate', () => {
        it('should return true when no permission requirement is specified', async () => {
            // Arrange
            reflector.getAllAndOverride.mockReturnValue(undefined);

            // Act
            const result = await guard.canActivate(mockExecutionContext);

            // Assert
            expect(result).toBe(true);
            expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
                REQUIRED_PERMISSION_KEY,
                [expect.any(Object), expect.any(Object)],
            );
            expect(listSharesService.getUserPermissionLevel).not.toHaveBeenCalled();
        });

        it('should return true when user has sufficient permission (OWNER >= EDITOR)', async () => {
            // Arrange
            reflector.getAllAndOverride.mockReturnValue(PermissionLevel.EDITOR);
            listSharesService.getUserPermissionLevel.mockResolvedValue(PermissionLevel.OWNER);

            // Act
            const result = await guard.canActivate(mockExecutionContext);

            // Assert
            expect(result).toBe(true);
            expect(listSharesService.getUserPermissionLevel).toHaveBeenCalledWith('user-1', 'list-1');
            expect(mockRequest.userPermission).toBe(PermissionLevel.OWNER);
        });

        it('should return true when user has exact permission match', async () => {
            // Arrange
            reflector.getAllAndOverride.mockReturnValue(PermissionLevel.EDITOR);
            listSharesService.getUserPermissionLevel.mockResolvedValue(PermissionLevel.EDITOR);

            // Act
            const result = await guard.canActivate(mockExecutionContext);

            // Assert
            expect(result).toBe(true);
            expect(listSharesService.getUserPermissionLevel).toHaveBeenCalledWith('user-1', 'list-1');
            expect(mockRequest.userPermission).toBe(PermissionLevel.EDITOR);
        });

        it('should throw ForbiddenException when user has insufficient permission (VIEWER < EDITOR)', async () => {
            // Arrange
            reflector.getAllAndOverride.mockReturnValue(PermissionLevel.EDITOR);
            listSharesService.getUserPermissionLevel.mockResolvedValue(PermissionLevel.VIEWER);

            // Act & Assert
            await expect(guard.canActivate(mockExecutionContext))
                .rejects.toThrow(new ForbiddenException('Insufficient permissions for this operation'));
            expect(listSharesService.getUserPermissionLevel).toHaveBeenCalledWith('user-1', 'list-1');
        });

        it('should throw NotFoundException when user has no permission', async () => {
            // Arrange
            reflector.getAllAndOverride.mockReturnValue(PermissionLevel.VIEWER);
            listSharesService.getUserPermissionLevel.mockResolvedValue(null);

            // Act & Assert
            await expect(guard.canActivate(mockExecutionContext))
                .rejects.toThrow(new NotFoundException('List not found or you do not have access to it'));
            expect(listSharesService.getUserPermissionLevel).toHaveBeenCalledWith('user-1', 'list-1');
        });

        it('should throw NotFoundException when user is not authenticated', async () => {
            // Arrange
            reflector.getAllAndOverride.mockReturnValue(PermissionLevel.VIEWER);

            // Act & Assert
            await expect(guard.canActivate(mockExecutionContextNoUser))
                .rejects.toThrow(new NotFoundException('User not authenticated'));
            expect(listSharesService.getUserPermissionLevel).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException when list ID is not provided', async () => {
            // Arrange
            reflector.getAllAndOverride.mockReturnValue(PermissionLevel.VIEWER);

            // Act & Assert
            await expect(guard.canActivate(mockExecutionContextNoListId))
                .rejects.toThrow(new NotFoundException('List ID not provided'));
            expect(listSharesService.getUserPermissionLevel).not.toHaveBeenCalled();
        });
    });

    describe('hasPermission', () => {
        it('should correctly implement permission hierarchy', () => {
            // Access private method for testing
            const guardAny = guard as any;

            // Test OWNER permissions
            expect(guardAny.hasPermission(PermissionLevel.OWNER, PermissionLevel.VIEWER)).toBe(true);
            expect(guardAny.hasPermission(PermissionLevel.OWNER, PermissionLevel.EDITOR)).toBe(true);
            expect(guardAny.hasPermission(PermissionLevel.OWNER, PermissionLevel.OWNER)).toBe(true);

            // Test EDITOR permissions
            expect(guardAny.hasPermission(PermissionLevel.EDITOR, PermissionLevel.VIEWER)).toBe(true);
            expect(guardAny.hasPermission(PermissionLevel.EDITOR, PermissionLevel.EDITOR)).toBe(true);
            expect(guardAny.hasPermission(PermissionLevel.EDITOR, PermissionLevel.OWNER)).toBe(false);

            // Test VIEWER permissions
            expect(guardAny.hasPermission(PermissionLevel.VIEWER, PermissionLevel.VIEWER)).toBe(true);
            expect(guardAny.hasPermission(PermissionLevel.VIEWER, PermissionLevel.EDITOR)).toBe(false);
            expect(guardAny.hasPermission(PermissionLevel.VIEWER, PermissionLevel.OWNER)).toBe(false);
        });
    });
}); 