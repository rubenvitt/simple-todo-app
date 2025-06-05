import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionLevel } from '../../../generated/prisma';
import { ListSharesService } from '../../list-shares/list-shares.service';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';

@Injectable()
export class ListPermissionGuard implements CanActivate {
  constructor(
    private readonly listSharesService: ListSharesService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission =
      this.reflector.getAllAndOverride<PermissionLevel>(
        REQUIRED_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requiredPermission) {
      // If no permission requirement is specified, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const listId = request.params.listId || request.params.id;

    if (!user) {
      throw new NotFoundException('User not authenticated');
    }

    if (!listId) {
      throw new NotFoundException('List ID not provided');
    }

    // Get user's permission level for this list
    const userPermission = await this.listSharesService.getUserPermissionLevel(
      user.id,
      listId,
    );

    if (!userPermission) {
      throw new NotFoundException(
        'List not found or you do not have access to it',
      );
    }

    // Check if user has sufficient permission
    if (!this.hasPermission(userPermission, requiredPermission)) {
      throw new ForbiddenException(
        'Insufficient permissions for this operation',
      );
    }

    // Store user permission in request for potential use in controllers
    request.userPermission = userPermission;

    return true;
  }

  private hasPermission(
    userPermission: PermissionLevel,
    requiredPermission: PermissionLevel,
  ): boolean {
    // Define permission hierarchy: OWNER > EDITOR > VIEWER
    const permissionHierarchy = {
      [PermissionLevel.VIEWER]: 1,
      [PermissionLevel.EDITOR]: 2,
      [PermissionLevel.OWNER]: 3,
    };

    return (
      permissionHierarchy[userPermission] >=
      permissionHierarchy[requiredPermission]
    );
  }
}
