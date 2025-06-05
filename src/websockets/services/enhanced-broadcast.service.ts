import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  BroadcastPermissionFilter,
  PermissionAwareEventPayload,
  PermissionLevel,
} from '../interfaces/permission.interface';
import { EnhancedPermissionService } from './enhanced-permission.service';

// Extended Socket interface to include user information
interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

@Injectable()
export class EnhancedBroadcastService {
  private readonly logger = new Logger(EnhancedBroadcastService.name);

  constructor(private readonly permissionService: EnhancedPermissionService) {}

  /**
   * Broadcast event with permission-level filtering
   */
  async broadcastWithPermissionFilter(
    server: Server,
    listId: string,
    event: string,
    data: any,
    filter: BroadcastPermissionFilter,
  ): Promise<void> {
    try {
      // Get users with required permissions
      const authorizedUsers =
        await this.permissionService.getUsersWithPermission(listId, filter);
      const authorizedUserIds = new Set(
        authorizedUsers.map((user) => user.userId),
      );

      // Get all connected authenticated sockets
      const authenticatedSockets = Array.from(
        server.sockets.sockets.values(),
      ).filter(
        (socket: AuthenticatedSocket) =>
          socket.user && authorizedUserIds.has(socket.user.id),
      );

      // Broadcast to authorized users
      authenticatedSockets.forEach((socket: AuthenticatedSocket) => {
        socket.emit(event, {
          ...data,
          listId,
          timestamp: new Date().toISOString(),
        });
      });

      this.logger.log(
        `Permission-filtered broadcast: Event ${event} sent to ${authenticatedSockets.length} users ` +
          `for list ${listId} (Filter: ${filter.requiredPermission}, Operation: ${filter.operationType || 'N/A'})`,
      );
    } catch (error) {
      this.logger.error(
        `Error in permission-filtered broadcast for list ${listId}: ` +
          `${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Broadcast with role-specific event payloads
   */
  async broadcastWithRoleSpecificPayload(
    server: Server,
    listId: string,
    baseEvent: string,
    payload: PermissionAwareEventPayload,
  ): Promise<void> {
    try {
      // Get all users with any permission
      const allAuthorizedUsers =
        await this.permissionService.getUsersWithPermission(listId);

      // Group users by permission level
      const usersByPermission = {
        [PermissionLevel.VIEWER]: [] as string[],
        [PermissionLevel.EDITOR]: [] as string[],
        [PermissionLevel.OWNER]: [] as string[],
      };

      allAuthorizedUsers.forEach((user) => {
        usersByPermission[user.permissionLevel].push(user.userId);
      });

      // Get all connected authenticated sockets
      const authenticatedSockets = Array.from(
        server.sockets.sockets.values(),
      ).filter((socket: AuthenticatedSocket) => socket.user);

      // Send appropriate payload to each user based on their permission level
      authenticatedSockets.forEach((socket: AuthenticatedSocket) => {
        if (!socket.user) return;

        const userId = socket.user.id;
        let eventPayload = payload.baseData;

        // Determine user's permission level and add appropriate data
        if (usersByPermission[PermissionLevel.OWNER].includes(userId)) {
          eventPayload = {
            ...eventPayload,
            ...(payload.ownerData || {}),
            permissionLevel: PermissionLevel.OWNER,
          };
        } else if (usersByPermission[PermissionLevel.EDITOR].includes(userId)) {
          eventPayload = {
            ...eventPayload,
            ...(payload.editorData || {}),
            permissionLevel: PermissionLevel.EDITOR,
          };
        } else if (usersByPermission[PermissionLevel.VIEWER].includes(userId)) {
          eventPayload = {
            ...eventPayload,
            ...(payload.viewerData || {}),
            permissionLevel: PermissionLevel.VIEWER,
          };
        }

        socket.emit(baseEvent, {
          ...eventPayload,
          listId,
          timestamp: new Date().toISOString(),
        });
      });

      this.logger.log(
        `Role-specific broadcast: Event ${baseEvent} sent with differentiated payloads for list ${listId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error in role-specific broadcast for list ${listId}: ` +
          `${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Broadcast to users with minimum permission level
   */
  async broadcastToMinimumPermission(
    server: Server,
    listId: string,
    event: string,
    data: any,
    minimumPermission: PermissionLevel,
    operationType?: 'READ' | 'WRITE' | 'DELETE' | 'MANAGE',
  ): Promise<void> {
    const filter: BroadcastPermissionFilter = {
      requiredPermission: minimumPermission,
      operationType,
    };

    await this.broadcastWithPermissionFilter(
      server,
      listId,
      event,
      data,
      filter,
    );
  }

  /**
   * Broadcast only to editors and owners (exclude viewers)
   */
  async broadcastToEditorsAndOwners(
    server: Server,
    listId: string,
    event: string,
    data: any,
  ): Promise<void> {
    const filter: BroadcastPermissionFilter = {
      requiredPermission: PermissionLevel.EDITOR,
      excludeViewer: true,
    };

    await this.broadcastWithPermissionFilter(
      server,
      listId,
      event,
      data,
      filter,
    );
  }

  /**
   * Broadcast only to owners
   */
  async broadcastToOwnersOnly(
    server: Server,
    listId: string,
    event: string,
    data: any,
  ): Promise<void> {
    const filter: BroadcastPermissionFilter = {
      requiredPermission: PermissionLevel.OWNER,
    };

    await this.broadcastWithPermissionFilter(
      server,
      listId,
      event,
      data,
      filter,
    );
  }

  /**
   * Broadcast notification with permission-aware content
   */
  async broadcastPermissionAwareNotification(
    server: Server,
    listId: string,
    event: string,
    baseMessage: string,
    actionUserId: string,
    actionUserName: string,
    operation: 'READ' | 'WRITE' | 'DELETE' | 'MANAGE',
  ): Promise<void> {
    try {
      const payload: PermissionAwareEventPayload = {
        baseData: {
          message: baseMessage,
          actionUser: {
            id: actionUserId,
            name: actionUserName,
          },
        },
        viewerData: {
          // Viewers get basic information
          allowedActions: ['view'],
        },
        editorData: {
          // Editors get more detailed information
          allowedActions: ['view', 'edit', 'create'],
          canModify: true,
        },
        ownerData: {
          // Owners get full information
          allowedActions: ['view', 'edit', 'create', 'delete', 'manage'],
          canModify: true,
          canManage: true,
        },
      };

      await this.broadcastWithRoleSpecificPayload(
        server,
        listId,
        event,
        payload,
      );

      // Log the permission-aware notification
      this.logger.log(
        `Permission-aware notification sent: ${event} for list ${listId} by user ${actionUserName} (Operation: ${operation})`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending permission-aware notification for list ${listId}: ` +
          `${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Broadcast audit event for security logging
   */
  async broadcastAuditEvent(
    server: Server,
    listId: string,
    userId: string,
    action: string,
    permissionLevel: PermissionLevel,
    success: boolean,
    details?: string,
  ): Promise<void> {
    try {
      // Only send audit events to owners for security reasons
      await this.broadcastToOwnersOnly(server, listId, 'audit-event', {
        userId,
        action,
        permissionLevel,
        success,
        details,
        auditTimestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Audit event broadcast: User ${userId} performed ${action} on list ${listId} ` +
          `(Permission: ${permissionLevel}, Success: ${success})`,
      );
    } catch (error) {
      this.logger.error(
        `Error broadcasting audit event for list ${listId}: ` +
          `${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Broadcast permission change notification
   */
  async broadcastPermissionChange(
    server: Server,
    listId: string,
    targetUserId: string,
    newPermissionLevel: PermissionLevel,
    changedByUserId: string,
    changedByUserName: string,
  ): Promise<void> {
    try {
      // Notify all authorized users about permission changes
      await this.broadcastWithPermissionFilter(
        server,
        listId,
        'permission-changed',
        {
          targetUserId,
          newPermissionLevel,
          changedBy: {
            id: changedByUserId,
            name: changedByUserName,
          },
        },
        {
          requiredPermission: PermissionLevel.VIEWER, // All users should know about permission changes
        },
      );

      // Send special notification to the user whose permissions changed
      const targetUserSockets = Array.from(
        server.sockets.sockets.values(),
      ).filter(
        (socket: AuthenticatedSocket) =>
          socket.user && socket.user.id === targetUserId,
      );

      targetUserSockets.forEach((socket: AuthenticatedSocket) => {
        socket.emit('your-permission-changed', {
          listId,
          newPermissionLevel,
          changedBy: {
            id: changedByUserId,
            name: changedByUserName,
          },
          timestamp: new Date().toISOString(),
        });
      });

      this.logger.log(
        `Permission change broadcast: User ${targetUserId} permission changed to ${newPermissionLevel} ` +
          `on list ${listId} by ${changedByUserName}`,
      );
    } catch (error) {
      this.logger.error(
        `Error broadcasting permission change for list ${listId}: ` +
          `${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
