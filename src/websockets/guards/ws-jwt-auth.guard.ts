import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { JwtPayload } from '../../auth/dto';
import { PrismaService } from '../../common/services/prisma.service';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();

      // Extract token from authorization header or query params
      const token = this.extractTokenFromClient(client);

      if (!token) {
        this.logger.warn(
          `WebSocket connection rejected: No token provided for client ${client.id}`,
        );
        client.disconnect();
        return false;
      }

      // Verify and decode the token
      const secret =
        this.configService.get<string>('JWT_SECRET') || 'your-secret-key';
      const payload: JwtPayload = this.jwtService.verify(token, { secret });

      // Validate user exists in database
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        this.logger.warn(
          `WebSocket connection rejected: User not found for token payload ${payload.sub}`,
        );
        client.disconnect();
        return false;
      }

      // Attach user to socket for later use
      (client as any).user = user;

      this.logger.log(
        `WebSocket authentication successful for user ${user.email} (${user.id})`,
      );
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown authentication error';
      this.logger.warn(`WebSocket authentication failed: ${errorMessage}`);
      const client: Socket = context.switchToWs().getClient();
      client.disconnect();
      return false;
    }
  }

  private extractTokenFromClient(client: Socket): string | null {
    // Try to extract token from authorization header first
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Fallback to query parameter for cases where headers are not available
    const tokenFromQuery = client.handshake.query.token;
    if (typeof tokenFromQuery === 'string') {
      return tokenFromQuery;
    }

    // Token could be in auth query parameter as well
    const authFromQuery = client.handshake.auth?.token;
    if (typeof authFromQuery === 'string') {
      return authFromQuery;
    }

    return null;
  }
}
