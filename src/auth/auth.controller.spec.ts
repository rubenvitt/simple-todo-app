import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Mock @nestjs/throttler decorators
jest.mock('@nestjs/throttler', () => ({
  Throttle: jest.fn(() => () => {}),
  ThrottlerGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockResolvedValue(true),
  })),
  ThrottlerModule: {
    forRootAsync: jest.fn(() => ({
      module: class MockThrottlerModule {},
    })),
  },
}));

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthResponse = {
    user: {
      id: 'user-id-123',
      email: 'test@example.com',
      name: 'Test User',
    },
    access_token: 'access-token',
    refresh_token: 'refresh-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
            validateUser: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      // Arrange
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };
      authService.register.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.register(registerDto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      // Arrange
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      authService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      // Arrange
      const refreshToken = 'refresh-token';
      const newTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };
      authService.refreshToken.mockResolvedValue(newTokens);

      // Act
      const result = await controller.refresh(refreshToken);

      // Assert
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshToken);
      expect(result).toEqual(newTokens);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      // Arrange
      const mockRequest = {
        user: mockAuthResponse.user,
      };

      // Act
      const result = await controller.getProfile(mockRequest);

      // Assert
      expect(result).toEqual(mockAuthResponse.user);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user details', async () => {
      // Arrange
      const mockRequest = {
        user: { id: 'user-id-123' },
      };
      const userDetails = {
        id: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      authService.validateUser.mockResolvedValue(userDetails);

      // Act
      const result = await controller.getCurrentUser(mockRequest);

      // Assert
      expect(authService.validateUser).toHaveBeenCalledWith('user-id-123');
      expect(result).toEqual(userDetails);
    });
  });
});
