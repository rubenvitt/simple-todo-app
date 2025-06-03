import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthResponse, LoginDto, RegisterDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Register a new user',
        description: 'Create a new user account with email and password',
    })
    @ApiBody({
        type: RegisterDto,
        description: 'User registration data',
        examples: {
            example1: {
                summary: 'Valid registration',
                value: {
                    email: 'user@example.com',
                    password: 'SecurePassword123!',
                    username: 'john_doe',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'User successfully registered',
        example: {
            access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            user: {
                id: 1,
                email: 'user@example.com',
                username: 'john_doe',
                createdAt: '2024-01-01T00:00:00.000Z',
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid input data',
        example: {
            message: ['email must be a valid email'],
            error: 'Bad Request',
            statusCode: 400,
        },
    })
    @ApiResponse({
        status: 409,
        description: 'Conflict - Email already exists',
        example: {
            message: 'Email already exists',
            error: 'Conflict',
            statusCode: 409,
        },
    })
    async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
        return this.authService.register(registerDto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'User login',
        description: 'Authenticate user with email and password to receive JWT tokens',
    })
    @ApiBody({
        type: LoginDto,
        description: 'User login credentials',
        examples: {
            example1: {
                summary: 'Valid login',
                value: {
                    email: 'user@example.com',
                    password: 'SecurePassword123!',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'User successfully authenticated',
        example: {
            access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            user: {
                id: 1,
                email: 'user@example.com',
                username: 'john_doe',
                createdAt: '2024-01-01T00:00:00.000Z',
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid credentials',
        example: {
            message: 'Invalid credentials',
            error: 'Unauthorized',
            statusCode: 401,
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid input data',
        example: {
            message: ['email must be a valid email'],
            error: 'Bad Request',
            statusCode: 400,
        },
    })
    async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
        return this.authService.login(loginDto);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Refresh access token',
        description: 'Use refresh token to obtain a new access token',
    })
    @ApiBody({
        description: 'Refresh token',
        schema: {
            type: 'object',
            properties: {
                refresh_token: {
                    type: 'string',
                    description: 'Valid refresh token',
                    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
            },
            required: ['refresh_token'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'New access token generated',
        example: {
            access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or expired refresh token',
        example: {
            message: 'Invalid refresh token',
            error: 'Unauthorized',
            statusCode: 401,
        },
    })
    async refresh(@Body('refresh_token') refreshToken: string) {
        return this.authService.refreshToken(refreshToken);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Get user profile',
        description: 'Retrieve the authenticated user profile information',
    })
    @ApiResponse({
        status: 200,
        description: 'User profile retrieved successfully',
        example: {
            id: 1,
            email: 'user@example.com',
            username: 'john_doe',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing JWT token',
        example: {
            message: 'Unauthorized',
            statusCode: 401,
        },
    })
    async getProfile(@Request() req: any) {
        return req.user;
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Get current user details',
        description: 'Retrieve detailed information about the currently authenticated user',
    })
    @ApiResponse({
        status: 200,
        description: 'Current user details retrieved successfully',
        example: {
            id: 1,
            email: 'user@example.com',
            username: 'john_doe',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing JWT token',
        example: {
            message: 'Unauthorized',
            statusCode: 401,
        },
    })
    async getCurrentUser(@Request() req: any) {
        return this.authService.validateUser(req.user.id);
    }
}
