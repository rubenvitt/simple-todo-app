import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppConfig } from '../common/config/app.config';
import { DefaultListService, PrismaService } from '../common/services';
import { AuthResponse, JwtPayload, LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService<AppConfig>,
    private defaultListService: DefaultListService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    // Create user with default list in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      // Create default list with welcome tasks
      const defaultList = await tx.list.create({
        data: {
          name: '🚀 Meine erste Liste',
          description:
            'Willkommen bei Simple Todo App! Hier sind einige Beispielaufgaben zum Ausprobieren.',
          color: '#3B82F6',
          userId: newUser.id,
        },
      });

      // Create welcome tasks
      const welcomeTasks = [
        {
          title: '👋 Willkommen bei Simple Todo App!',
          description:
            'Erkunde die verschiedenen Features und drag & drop Funktionalität.',
          status: 'TODO' as const,
          priority: 'HIGH' as const,
          listId: defaultList.id,
          assignedUserId: newUser.id,
        },
        {
          title: '✅ Erste Aufgabe abhaken',
          description: 'Verschiebe diese Aufgabe in die "Erledigt" Spalte.',
          status: 'TODO' as const,
          priority: 'MEDIUM' as const,
          listId: defaultList.id,
          assignedUserId: newUser.id,
        },
        {
          title: '🎯 Neue Aufgabe erstellen',
          description:
            'Klicke auf "Neue Aufgabe" um deine eigene Aufgabe hinzuzufügen.',
          status: 'TODO' as const,
          priority: 'LOW' as const,
          listId: defaultList.id,
          assignedUserId: newUser.id,
        },
        {
          title: '🔥 Beispielaufgabe in Arbeit',
          description: 'Diese Aufgabe ist bereits in Bearbeitung.',
          status: 'IN_PROGRESS' as const,
          priority: 'MEDIUM' as const,
          listId: defaultList.id,
          assignedUserId: newUser.id,
        },
        {
          title: '🎉 Beispielaufgabe erledigt',
          description: 'Gratulation! Du hast eine Aufgabe abgeschlossen.',
          status: 'DONE' as const,
          priority: 'LOW' as const,
          listId: defaultList.id,
          assignedUserId: newUser.id,
        },
      ];

      // Create all welcome tasks
      await tx.task.createMany({
        data: welcomeTasks,
      });

      return newUser;
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user,
      ...tokens,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Create default list if user doesn't have any (for existing users logging in)
    await this.defaultListService.createDefaultListForUser(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    // Remove password hash from response
    const { passwordHash, ...userResponse } = user;

    return {
      user: userResponse,
      ...tokens,
    };
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const payload = await this.verifyRefreshToken(refreshToken);

      // Verify user still exists
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      return await this.generateTokens(user.id, user.email);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const payload: JwtPayload = {
      sub: userId,
      email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.secret', { infer: true }),
        expiresIn: this.configService.get('jwt.expiresIn', { infer: true }),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.secret', { infer: true }),
        expiresIn: this.configService.get('jwt.refreshExpiresIn', {
          infer: true,
        }),
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async verifyRefreshToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('jwt.secret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
