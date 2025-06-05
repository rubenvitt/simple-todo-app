import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ChangePasswordDto,
  ProfileResponseDto,
  SearchUsersDto,
  UpdateProfileDto,
} from './dto';
import { UserExistsGuard } from './guards';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, UserExistsGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieve the profile information of the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    example: {
      id: 1,
      email: 'user@example.com',
      username: 'john_doe',
      firstName: 'John',
      lastName: 'Doe',
      avatar: 'https://example.com/avatar.jpg',
      bio: 'Software developer passionate about clean code',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    example: {
      message: 'User not found',
      error: 'Not Found',
      statusCode: 404,
    },
  })
  async getProfile(@Request() req: any): Promise<ProfileResponseDto> {
    return this.usersService.getProfile(req.user.id);
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Update the profile information of the authenticated user',
  })
  @ApiBody({
    type: UpdateProfileDto,
    description: 'Profile update data',
    examples: {
      example1: {
        summary: 'Update profile',
        value: {
          firstName: 'Jane',
          lastName: 'Smith',
          username: 'jane_smith',
          bio: 'Full-stack developer with 5 years of experience',
          avatar: 'https://example.com/new-avatar.jpg',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    example: {
      id: 1,
      email: 'user@example.com',
      username: 'jane_smith',
      firstName: 'Jane',
      lastName: 'Smith',
      avatar: 'https://example.com/new-avatar.jpg',
      bio: 'Full-stack developer with 5 years of experience',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
    example: {
      message: ['username must be longer than or equal to 3 characters'],
      error: 'Bad Request',
      statusCode: 400,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Username already exists',
    example: {
      message: 'Username already exists',
      error: 'Conflict',
      statusCode: 409,
    },
  })
  async updateProfile(
    @Request() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  @Put('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password',
    description: 'Change the password for the authenticated user',
  })
  @ApiBody({
    type: ChangePasswordDto,
    description: 'Password change data',
    examples: {
      example1: {
        summary: 'Change password',
        value: {
          currentPassword: 'CurrentPassword123!',
          newPassword: 'NewSecurePassword456!',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    example: {
      message: 'Password changed successfully',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
    example: {
      message: ['newPassword must be stronger'],
      error: 'Bad Request',
      statusCode: 400,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid current password or missing JWT token',
    example: {
      message: 'Current password is incorrect',
      error: 'Unauthorized',
      statusCode: 401,
    },
  })
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.usersService.changePassword(req.user.id, changePasswordDto);
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete user account',
    description:
      'Permanently delete the authenticated user account and all associated data',
  })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
    example: {
      message: 'Account deleted successfully',
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    example: {
      message: 'User not found',
      error: 'Not Found',
      statusCode: 404,
    },
  })
  async deleteAccount(@Request() req: any): Promise<{ message: string }> {
    return this.usersService.deleteAccount(req.user.id);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search users',
    description:
      'Search for users by email or username for collaboration purposes',
  })
  @ApiQuery({
    name: 'query',
    required: true,
    type: String,
    description: 'Search query (email or username)',
    example: 'john',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of results to return',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Users found successfully',
    example: [
      {
        id: 2,
        email: 'john.doe@example.com',
        username: 'john_doe',
        firstName: 'John',
        lastName: 'Doe',
        avatar: 'https://example.com/avatar.jpg',
      },
      {
        id: 3,
        email: 'jane.smith@example.com',
        username: 'jane_smith',
        firstName: 'Jane',
        lastName: 'Smith',
        avatar: 'https://example.com/avatar2.jpg',
      },
    ],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid search query',
    example: {
      message: ['query must be at least 2 characters long'],
      error: 'Bad Request',
      statusCode: 400,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async searchUsers(@Query() searchDto: SearchUsersDto, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.usersService.searchUsers(searchDto, userId);
  }
}
