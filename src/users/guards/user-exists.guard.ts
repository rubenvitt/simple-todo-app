import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';

@Injectable()
export class UserExistsGuard implements CanActivate {
    constructor(private readonly usersService: UsersService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.id;

        if (!userId) {
            throw new NotFoundException('User ID not found in request');
        }

        const userExists = await this.usersService.userExists(userId);

        if (!userExists) {
            throw new NotFoundException('User not found');
        }

        return true;
    }
} 