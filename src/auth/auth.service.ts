import {
    ConflictException,
    Injectable,
    UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/services/prisma.service';
import { AuthResponse, JwtPayload, LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
    private readonly saltRounds = 12;

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

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

        // Create user
        const user = await this.prisma.user.create({
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

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email);

        // Remove password hash from response
        const { passwordHash, ...userResponse } = user;

        return {
            user: userResponse,
            ...tokens,
        };
    }

    async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret',
            });

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

    private async generateTokens(userId: string, email: string): Promise<{ access_token: string; refresh_token: string }> {
        const payload: JwtPayload = {
            sub: userId,
            email,
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
                expiresIn: '15m',
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'your-refresh-secret',
                expiresIn: '7d',
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
}
