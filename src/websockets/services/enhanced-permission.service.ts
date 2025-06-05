import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import {
  BroadcastPermissionFilter,
  PermissionCheckResult,
  PermissionLevel,
  UserPermission,
} from '../interfaces/permission.interface';

@Injectable()
export class EnhancedPermissionService {
  private readonly logger = new Logger(EnhancedPermissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get detailed permission information for a user on a specific list
   */
  async getUserPermission(
    userId: string,
    listId: string,
  ): Promise<PermissionCheckResult> {
    try {
      // Check if user owns the list
      const ownedList = await this.prisma.list.findFirst({
        where: {
          id: listId,
          userId: userId,
        },
      });

      if (ownedList) {
        return {
          hasAccess: true,
          permissionLevel: PermissionLevel.OWNER,
          isOwner: true,
          canRead: true,
          canEdit: true,
          canDelete: true,
          canManageShares: true,
        };
      }

      // Check shared access
      const listShare = await this.prisma.listShare.findFirst({
        where: {
          listId: listId,
          userId: userId,
        },
      });

      if (!listShare) {
        return {
          hasAccess: false,
          isOwner: false,
          canRead: false,
          canEdit: false,
          canDelete: false,
          canManageShares: false,
        };
      }

      const permissionLevel = listShare.permissionLevel as PermissionLevel;

      return {
        hasAccess: true,
        permissionLevel,
        isOwner: false,
        canRead: true,
        canEdit:
          permissionLevel === PermissionLevel.EDITOR ||
          permissionLevel === PermissionLevel.OWNER,
        canDelete:
          permissionLevel === PermissionLevel.EDITOR ||
          permissionLevel === PermissionLevel.OWNER,
        canManageShares: permissionLevel === PermissionLevel.OWNER,
      };
    } catch (error) {
      this.logger.error(
        `Error checking user permission for user ${userId} on list ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        hasAccess: false,
        isOwner: false,
        canRead: false,
        canEdit: false,
        canDelete: false,
        canManageShares: false,
      };
    }
  }

  /**
   * Get all users with specific permission levels for a list
   */
  async getUsersWithPermission(
    listId: string,
    filter?: BroadcastPermissionFilter,
  ): Promise<UserPermission[]> {
    try {
      const listWithUsers = await this.prisma.list.findUnique({
        where: { id: listId },
        include: {
          owner: {
            select: { id: true, email: true, name: true },
          },
          shares: {
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
          },
        },
      });

      if (!listWithUsers) {
        return [];
      }

      const permissions: UserPermission[] = [];

      // Add owner
      if (
        !filter ||
        this.shouldIncludeUser(PermissionLevel.OWNER, true, filter)
      ) {
        permissions.push({
          userId: listWithUsers.owner.id,
          listId,
          permissionLevel: PermissionLevel.OWNER,
          isOwner: true,
        });
      }

      // Add shared users
      for (const share of listWithUsers.shares) {
        const permissionLevel = share.permissionLevel as PermissionLevel;

        if (!filter || this.shouldIncludeUser(permissionLevel, false, filter)) {
          permissions.push({
            userId: share.user.id,
            listId,
            permissionLevel,
            isOwner: false,
          });
        }
      }

      return permissions;
    } catch (error) {
      this.logger.error(
        `Error getting users with permission for list ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  /**
   * Check if user can perform specific operation
   */
  async canUserPerformOperation(
    userId: string,
    listId: string,
    operation: 'READ' | 'WRITE' | 'DELETE' | 'MANAGE',
  ): Promise<boolean> {
    const permission = await this.getUserPermission(userId, listId);

    if (!permission.hasAccess) {
      return false;
    }

    switch (operation) {
      case 'READ':
        return permission.canRead;
      case 'WRITE':
        return permission.canEdit;
      case 'DELETE':
        return permission.canDelete;
      case 'MANAGE':
        return permission.canManageShares;
      default:
        return false;
    }
  }

  /**
   * Get permission hierarchy level as number for comparison
   */
  getPermissionHierarchy(level: PermissionLevel): number {
    switch (level) {
      case PermissionLevel.VIEWER:
        return 1;
      case PermissionLevel.EDITOR:
        return 2;
      case PermissionLevel.OWNER:
        return 3;
      default:
        return 0;
    }
  }

  /**
   * Check if permission level meets minimum requirement
   */
  hasMinimumPermission(
    userLevel: PermissionLevel,
    requiredLevel: PermissionLevel,
  ): boolean {
    return (
      this.getPermissionHierarchy(userLevel) >=
      this.getPermissionHierarchy(requiredLevel)
    );
  }

  /**
   * Filter users based on broadcast permission filter
   */
  private shouldIncludeUser(
    permissionLevel: PermissionLevel,
    isOwner: boolean,
    filter: BroadcastPermissionFilter,
  ): boolean {
    // Check if we should exclude viewers
    if (filter.excludeViewer && permissionLevel === PermissionLevel.VIEWER) {
      return false;
    }

    // Check if owner should be included
    if (isOwner && filter.includeOwner === false) {
      return false;
    }

    // Check minimum permission requirement
    if (
      !this.hasMinimumPermission(permissionLevel, filter.requiredPermission)
    ) {
      return false;
    }

    // Check operation-specific requirements
    if (filter.operationType) {
      switch (filter.operationType) {
        case 'READ':
          return true; // All permission levels can read
        case 'WRITE':
        case 'DELETE':
          return (
            permissionLevel === PermissionLevel.EDITOR ||
            permissionLevel === PermissionLevel.OWNER
          );
        case 'MANAGE':
          return permissionLevel === PermissionLevel.OWNER;
        default:
          return true;
      }
    }

    return true;
  }

  /**
   * Log permission-based action for audit trail
   */
  logPermissionAction(
    userId: string,
    listId: string,
    action: string,
    permissionLevel: PermissionLevel,
    success: boolean,
    details?: string,
  ): void {
    this.logger.log(
      `Permission Action: User ${userId} | List ${listId} | Action: ${action} | ` +
        `Permission: ${permissionLevel} | Success: ${success}` +
        (details ? ` | Details: ${details}` : ''),
    );
  }
}
