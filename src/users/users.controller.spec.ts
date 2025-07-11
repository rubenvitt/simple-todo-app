import { Test, TestingModule } from '@nestjs/testing';
import { ChangePasswordDto, UpdateProfileDto } from './dto';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = {
    user: { id: mockUser.id },
  };

  beforeEach(async () => {
    const mockUsersService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      searchUsers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      usersService.getProfile.mockResolvedValue(mockUser);

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual(mockUser);
      expect(usersService.getProfile).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateData: UpdateProfileDto = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };
      const updatedUser = { ...mockUser, ...updateData };

      usersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(mockRequest, updateData);

      expect(result).toEqual(updatedUser);
      expect(usersService.updateProfile).toHaveBeenCalledWith(
        mockUser.id,
        updateData,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password', async () => {
      const changePasswordData: ChangePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword',
      };
      const expectedResponse = { message: 'Password changed successfully' };

      usersService.changePassword.mockResolvedValue(expectedResponse);

      const result = await controller.changePassword(
        mockRequest,
        changePasswordData,
      );

      expect(result).toEqual(expectedResponse);
      expect(usersService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        changePasswordData,
      );
    });
  });

  describe('deleteAccount', () => {
    it('should delete account', async () => {
      const expectedResponse = { message: 'Account deleted successfully' };

      usersService.deleteAccount.mockResolvedValue(expectedResponse);

      const result = await controller.deleteAccount(mockRequest);

      expect(result).toEqual(expectedResponse);
      expect(usersService.deleteAccount).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('searchUsers', () => {
    const mockSearchResult = {
      data: [
        { id: 'user-1', name: 'User 1', email: 'user1@example.com' },
        { id: 'user-2', name: 'User 2', email: 'user2@example.com' },
      ],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    };

    it('should call usersService.searchUsers with correct parameters', async () => {
      const searchDto = { search: 'user', page: 1, limit: 10 };
      usersService.searchUsers.mockResolvedValue(mockSearchResult);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.searchUsers(searchDto as any, req);

      expect(usersService.searchUsers).toHaveBeenCalledWith(
        searchDto,
        'user-123',
      );
      expect(result).toBe(mockSearchResult);
    });

    it('should handle req.user.id fallback for userId extraction', async () => {
      const searchDto = { search: 'test' };
      usersService.searchUsers.mockResolvedValue(mockSearchResult);

      const req = { user: { id: 'user-456' } }; // No sub property
      await controller.searchUsers(searchDto as any, req);

      expect(usersService.searchUsers).toHaveBeenCalledWith(
        searchDto,
        'user-456',
      );
    });
  });
});
