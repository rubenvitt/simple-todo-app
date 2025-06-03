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
    UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangePasswordDto, ProfileResponseDto, SearchUsersDto, UpdateProfileDto } from './dto';
import { UserExistsGuard } from './guards';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, UserExistsGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('profile')
    async getProfile(@Request() req: any): Promise<ProfileResponseDto> {
        return this.usersService.getProfile(req.user.id);
    }

    @Put('profile')
    async updateProfile(
        @Request() req: any,
        @Body() updateProfileDto: UpdateProfileDto,
    ): Promise<ProfileResponseDto> {
        return this.usersService.updateProfile(req.user.id, updateProfileDto);
    }

    @Put('password')
    @HttpCode(HttpStatus.OK)
    async changePassword(
        @Request() req: any,
        @Body() changePasswordDto: ChangePasswordDto,
    ): Promise<{ message: string }> {
        return this.usersService.changePassword(req.user.id, changePasswordDto);
    }

    @Delete('account')
    @HttpCode(HttpStatus.OK)
    async deleteAccount(@Request() req: any): Promise<{ message: string }> {
        return this.usersService.deleteAccount(req.user.id);
    }

    @Get('search')
    async searchUsers(@Query() searchDto: SearchUsersDto, @Request() req: any) {
        const userId = req.user?.sub || req.user?.id;
        return this.usersService.searchUsers(searchDto, userId);
    }
}
