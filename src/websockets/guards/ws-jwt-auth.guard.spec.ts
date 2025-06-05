import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { PrismaService } from '../../common/services/prisma.service';
import { WsJwtAuthGuard } from './ws-jwt-auth.guard';

describe('WsJwtAuthGuard', () => {
  let guard: WsJwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let prismaService: any;

  const mockUser = {
    id: 'user-id-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPayload = {
    sub: 'user-id-123',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsJwtAuthGuard,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    guard = module.get<WsJwtAuthGuard>(WsJwtAuthGuard);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    prismaService = module.get(PrismaService);

    // Setup default mock returns
    configService.get.mockReturnValue('test-secret');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockSocket = (
    options: {
      authHeader?: string;
      queryToken?: string;
      authToken?: string;
    } = {},
  ): jest.Mocked<Socket> => {
    return {
      id: 'socket-id-123',
      handshake: {
        headers: {
          authorization: options.authHeader,
        },
        query: {
          token: options.queryToken,
        },
        auth: {
          token: options.authToken,
        },
      },
      disconnect: jest.fn(),
    } as any;
  };

  const createMockContext = (client: Socket) => ({
    switchToWs: () => ({
      getClient: () => client,
    }),
  });

  describe('canActivate', () => {
    it('should allow access with valid token in authorization header', async () => {
      // Arrange
      const mockSocket = createMockSocket({ authHeader: 'Bearer valid-token' });
      const context = createMockContext(mockSocket) as any;

      jwtService.verify.mockReturnValue(mockPayload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect((mockSocket as any).user).toEqual(mockUser);
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('should allow access with valid token in query parameter', async () => {
      // Arrange
      const mockSocket = createMockSocket({ queryToken: 'valid-token' });
      const context = createMockContext(mockSocket) as any;

      jwtService.verify.mockReturnValue(mockPayload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect((mockSocket as any).user).toEqual(mockUser);
    });

    it('should allow access with valid token in auth parameter', async () => {
      // Arrange
      const mockSocket = createMockSocket({ authToken: 'valid-token' });
      const context = createMockContext(mockSocket) as any;

      jwtService.verify.mockReturnValue(mockPayload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect((mockSocket as any).user).toEqual(mockUser);
    });

    it('should deny access when no token is provided', async () => {
      // Arrange
      const mockSocket = createMockSocket();
      const context = createMockContext(mockSocket) as any;

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('should deny access when token is invalid', async () => {
      // Arrange
      const mockSocket = createMockSocket({
        authHeader: 'Bearer invalid-token',
      });
      const context = createMockContext(mockSocket) as any;

      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(jwtService.verify).toHaveBeenCalledWith('invalid-token', {
        secret: 'test-secret',
      });
    });

    it('should deny access when user does not exist', async () => {
      // Arrange
      const mockSocket = createMockSocket({ authHeader: 'Bearer valid-token' });
      const context = createMockContext(mockSocket) as any;

      jwtService.verify.mockReturnValue(mockPayload);
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(prismaService.user.findUnique).toHaveBeenCalled();
    });

    it('should deny access when database query fails', async () => {
      // Arrange
      const mockSocket = createMockSocket({ authHeader: 'Bearer valid-token' });
      const context = createMockContext(mockSocket) as any;

      jwtService.verify.mockReturnValue(mockPayload);
      prismaService.user.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should prioritize authorization header over query parameters', async () => {
      // Arrange
      const mockSocket = createMockSocket({
        authHeader: 'Bearer header-token',
        queryToken: 'query-token',
      });
      const context = createMockContext(mockSocket) as any;

      jwtService.verify.mockReturnValue(mockPayload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('header-token', {
        secret: 'test-secret',
      });
    });

    it('should handle malformed authorization header', async () => {
      // Arrange
      const mockSocket = createMockSocket({
        authHeader: 'InvalidFormat token',
      });
      const context = createMockContext(mockSocket) as any;

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('should handle array token in query parameter', async () => {
      // Arrange
      const mockSocket = {
        id: 'socket-id-123',
        handshake: {
          headers: {},
          query: {
            token: ['token1', 'token2'], // Array instead of string
          },
          auth: {},
        },
        disconnect: jest.fn(),
      } as any;
      const context = createMockContext(mockSocket) as any;

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(jwtService.verify).not.toHaveBeenCalled();
    });
  });

  describe('extractTokenFromClient', () => {
    it('should extract token from authorization header', () => {
      // Arrange
      const mockSocket = createMockSocket({ authHeader: 'Bearer test-token' });

      // Act
      const token = (guard as any).extractTokenFromClient(mockSocket);

      // Assert
      expect(token).toBe('test-token');
    });

    it('should extract token from query parameter', () => {
      // Arrange
      const mockSocket = createMockSocket({ queryToken: 'test-token' });

      // Act
      const token = (guard as any).extractTokenFromClient(mockSocket);

      // Assert
      expect(token).toBe('test-token');
    });

    it('should extract token from auth parameter', () => {
      // Arrange
      const mockSocket = createMockSocket({ authToken: 'test-token' });

      // Act
      const token = (guard as any).extractTokenFromClient(mockSocket);

      // Assert
      expect(token).toBe('test-token');
    });

    it('should return null when no token is found', () => {
      // Arrange
      const mockSocket = createMockSocket();

      // Act
      const token = (guard as any).extractTokenFromClient(mockSocket);

      // Assert
      expect(token).toBeNull();
    });
  });
});
