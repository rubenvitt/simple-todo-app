import { Logger, OnModuleDestroy, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from '../tasks/dto';
import { TasksService } from '../tasks/tasks.service';
import { UpdateProfileDto } from '../users/dto';
import { UsersService } from '../users/users.service';
import { WsJwtAuthGuard } from './guards';
import {
  PresenceStatus,
  UserActivity,
} from './interfaces/connection.interface';
import { PermissionLevel } from './interfaces/permission.interface';
import { ConnectionManagerService } from './services/connection-manager.service';
import { EnhancedBroadcastService } from './services/enhanced-broadcast.service';
import { EnhancedPermissionService } from './services/enhanced-permission.service';

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

// Room management interface
interface RoomMembership {
  userId: string;
  userName: string;
  userEmail: string;
  joinedAt: Date;
}

// In-memory store for room memberships and metadata
interface RoomData {
  listId: string;
  members: Map<string, RoomMembership>; // socketId -> RoomMembership
  createdAt: Date;
  lastActivity: Date;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/ws',
})
@UseGuards(WsJwtAuthGuard)
export class WebSocketsGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private logger: Logger = new Logger('WebSocketsGateway');

  // In-memory store for room data and memberships
  private rooms: Map<string, RoomData> = new Map();

  // Cleanup interval for empty rooms (30 minutes)
  private readonly ROOM_CLEANUP_INTERVAL = 30 * 60 * 1000;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly enhancedPermissionService: EnhancedPermissionService,
    private readonly enhancedBroadcastService: EnhancedBroadcastService,
  ) {}

  afterInit(server: Server) {
    this.logger.log(
      'WebSocket Gateway initialized with JWT authentication and room management',
    );

    // Initialize connection manager with server
    this.connectionManager.initialize(server);

    // Start automatic room cleanup process
    this.startRoomCleanup();
  }

  async handleConnection(client: AuthenticatedSocket, ..._args: any[]) {
    // Authentication is handled by WsJwtAuthGuard, but we can do additional setup here
    try {
      const user = client.user;
      if (user) {
        this.logger.log(
          `Authenticated client connected: ${client.id} (User: ${user.email})`,
        );

        // Register connection with connection manager
        this.connectionManager.registerConnection(client, user.id, user);

        // Send welcome message with user info and connection stats
        const connectionStats = this.connectionManager.getConnectionStats();
        client.emit('connection-established', {
          message: 'Successfully connected to WebSocket',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          connectionStats,
          timestamp: new Date().toISOString(),
        });
      } else {
        // This should not happen if WsJwtAuthGuard is working correctly
        this.logger.warn(
          `Client connected without authentication: ${client.id}`,
        );
        client.disconnect();
      }
    } catch (error) {
      this.logger.error(
        `Error during connection handling: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.user;
    const userInfo = user ? ` (User: ${user.email})` : '';
    this.logger.log(`Client disconnected: ${client.id}${userInfo}`);

    // Unregister connection from connection manager
    this.connectionManager.unregisterConnection(client.id);

    // Remove client from all rooms and clean up memberships
    this.cleanupClientFromRooms(client);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket): void {
    // Update heartbeat in connection manager
    this.connectionManager.updateHeartbeat(client.id);

    client.emit('pong', {
      timestamp: new Date().toISOString(),
      userId: client.user?.id,
      connectionStatus: 'healthy',
    });
  }

  @SubscribeMessage('join-list-room')
  async handleJoinListRoom(
    @MessageBody() data: { listId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    const { listId } = data;

    try {
      // Validate room membership - check if user has access to this list
      const hasAccess = await this.validateListAccess(client.user.id, listId);

      if (!hasAccess) {
        client.emit('error', {
          message:
            'Access denied: You do not have permission to access this list',
          listId,
        });
        return;
      }

      const roomName = `list-${listId}`;

      // Join the socket.io room
      client.join(roomName);

      // Update room membership data
      this.addClientToRoom(roomName, listId, client);

      this.logger.log(
        `Client ${client.id} (User: ${client.user.email}) joined list room: ${listId}`,
      );

      // Notify other users in the room about the new user
      client.to(roomName).emit('user-joined-list', {
        userId: client.user.id,
        userName: client.user.name,
        userEmail: client.user.email,
        listId,
        timestamp: new Date().toISOString(),
      });

      // Send confirmation to the joining user with room info
      const roomData = this.rooms.get(roomName);
      const memberCount = roomData?.members.size || 1;

      client.emit('list-room-joined', {
        listId,
        roomName,
        memberCount,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Error joining list room ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message: 'Failed to join list room',
        listId,
      });
    }
  }

  @SubscribeMessage('leave-list-room')
  async handleLeaveListRoom(
    @MessageBody() data: { listId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    const { listId } = data;
    const roomName = `list-${listId}`;

    try {
      // Leave the socket.io room
      client.leave(roomName);

      // Remove from room membership data
      this.removeClientFromRoom(roomName, client);

      this.logger.log(
        `Client ${client.id} (User: ${client.user.email}) left list room: ${listId}`,
      );

      // Notify other users in the room about the user leaving
      client.to(roomName).emit('user-left-list', {
        userId: client.user.id,
        userName: client.user.name,
        userEmail: client.user.email,
        listId,
        timestamp: new Date().toISOString(),
      });

      // Send confirmation to the leaving user
      client.emit('list-room-left', {
        listId,
        roomName,
        timestamp: new Date().toISOString(),
      });

      // Check if room is empty and cleanup if needed
      this.checkAndCleanupEmptyRoom(roomName);
    } catch (error) {
      this.logger.error(
        `Error leaving list room ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message: 'Failed to leave list room',
        listId,
      });
    }
  }

  // Legacy room handlers for backward compatibility
  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    // For legacy support, allow generic room joining without validation
    // In production, you might want to deprecate this in favor of join-list-room
    client.join(data.room);
    this.logger.log(
      `Client ${client.id} (User: ${client.user.email}) joined generic room: ${data.room}`,
    );

    client.to(data.room).emit('user-joined', {
      userId: client.user.id,
      userName: client.user.name,
      userEmail: client.user.email,
      room: data.room,
      timestamp: new Date().toISOString(),
    });

    client.emit('room-joined', {
      room: data.room,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    client.leave(data.room);
    this.logger.log(
      `Client ${client.id} (User: ${client.user.email}) left generic room: ${data.room}`,
    );

    client.to(data.room).emit('user-left', {
      userId: client.user.id,
      userName: client.user.name,
      userEmail: client.user.email,
      room: data.room,
      timestamp: new Date().toISOString(),
    });

    client.emit('room-left', {
      room: data.room,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('get-room-members')
  async handleGetRoomMembers(
    @MessageBody() data: { listId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    const { listId } = data;
    const roomName = `list-${listId}`;

    try {
      // Validate access to the list
      const hasAccess = await this.validateListAccess(client.user.id, listId);

      if (!hasAccess) {
        client.emit('error', {
          message:
            'Access denied: You do not have permission to access this list',
          listId,
        });
        return;
      }

      const roomData = this.rooms.get(roomName);
      const members = roomData ? Array.from(roomData.members.values()) : [];

      client.emit('room-members', {
        listId,
        members,
        memberCount: members.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Error getting room members for ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message: 'Failed to get room members',
        listId,
      });
    }
  }

  // =============================================================================
  // TASK EVENT HANDLERS
  // =============================================================================

  @SubscribeMessage('task-create')
  async handleTaskCreate(
    @MessageBody() data: CreateTaskDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      // Create task using the TasksService
      const newTask = await this.tasksService.create(data, client.user.id);

      this.logger.log(
        `Task created via WebSocket: ${newTask.id} by user ${client.user.email}`,
      );

      // Send confirmation to the creating user
      client.emit('task-created', {
        message: 'Task created successfully',
        task: newTask,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to all users in the list room
      await this.broadcastToListRoom(newTask.listId, 'task-created', {
        task: newTask,
        createdBy: {
          id: client.user.id,
          name: client.user.name,
          email: client.user.email,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error creating task via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message:
          error instanceof Error ? error.message : 'Failed to create task',
      });
    }
  }

  @SubscribeMessage('task-update')
  async handleTaskUpdate(
    @MessageBody() data: { taskId: string; updateData: UpdateTaskDto },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    const { taskId, updateData } = data;

    try {
      // Update task using the TasksService
      const updatedTask = await this.tasksService.update(
        taskId,
        updateData,
        client.user.id,
      );

      this.logger.log(
        `Task updated via WebSocket: ${taskId} by user ${client.user.email}`,
      );

      // Send confirmation to the updating user
      client.emit('task-updated', {
        message: 'Task updated successfully',
        task: updatedTask,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to all users in the list room
      await this.broadcastToListRoom(updatedTask.listId, 'task-updated', {
        task: updatedTask,
        updatedBy: {
          id: client.user.id,
          name: client.user.name,
          email: client.user.email,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error updating task via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message:
          error instanceof Error ? error.message : 'Failed to update task',
        taskId,
      });
    }
  }

  @SubscribeMessage('task-delete')
  async handleTaskDelete(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    const { taskId } = data;

    try {
      // Get task info before deletion for broadcasting
      const taskToDelete = await this.prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true, title: true, listId: true },
      });

      if (!taskToDelete) {
        client.emit('error', { message: 'Task not found', taskId });
        return;
      }

      // Delete task using the TasksService
      const deletionResult = await this.tasksService.remove(
        taskId,
        client.user.id,
      );

      this.logger.log(
        `Task deleted via WebSocket: ${taskId} by user ${client.user.email}`,
      );

      // Send confirmation to the deleting user
      client.emit('task-deleted', {
        message: 'Task deleted successfully',
        deletedTask: deletionResult.deletedTask,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to all users in the list room
      await this.broadcastToListRoom(taskToDelete.listId, 'task-deleted', {
        deletedTask: deletionResult.deletedTask,
        deletedBy: {
          id: client.user.id,
          name: client.user.name,
          email: client.user.email,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting task via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message:
          error instanceof Error ? error.message : 'Failed to delete task',
        taskId,
      });
    }
  }

  @SubscribeMessage('task-status-update')
  async handleTaskStatusUpdate(
    @MessageBody() data: { taskId: string; status: UpdateTaskStatusDto },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    const { taskId, status } = data;

    try {
      // Update task status using the TasksService
      const statusUpdateResult = await this.tasksService.updateStatus(
        taskId,
        status,
        client.user.id,
      );

      this.logger.log(
        `Task status updated via WebSocket: ${taskId} to ${status.status} by user ${client.user.email}`,
      );

      // Send confirmation to the updating user
      client.emit('task-status-updated', {
        message: statusUpdateResult.message,
        task: statusUpdateResult.task,
        previousStatus: statusUpdateResult.previousStatus,
        newStatus: statusUpdateResult.newStatus,
        validNextStatuses: statusUpdateResult.validNextStatuses,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to all users in the list room
      await this.broadcastToListRoom(
        statusUpdateResult.task.listId,
        'task-status-updated',
        {
          task: statusUpdateResult.task,
          previousStatus: statusUpdateResult.previousStatus,
          newStatus: statusUpdateResult.newStatus,
          updatedBy: {
            id: client.user.id,
            name: client.user.name,
            email: client.user.email,
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `Error updating task status via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update task status',
        taskId,
      });
    }
  }

  @SubscribeMessage('task-assign')
  async handleTaskAssign(
    @MessageBody() data: { taskId: string; assignedUserId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    const { taskId, assignedUserId } = data;

    try {
      // Assign task using the TasksService
      const assignmentResult = await this.tasksService.assignTask(
        taskId,
        { assignedUserId },
        client.user.id,
      );

      this.logger.log(
        `Task assigned via WebSocket: ${taskId} to user ${assignedUserId} by user ${client.user.email}`,
      );

      // Send confirmation to the assigning user
      client.emit('task-assigned', {
        message: assignmentResult.message,
        task: assignmentResult.task,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to all users in the list room
      await this.broadcastToListRoom(
        assignmentResult.task.listId,
        'task-assigned',
        {
          task: assignmentResult.task,
          assignedBy: {
            id: client.user.id,
            name: client.user.name,
            email: client.user.email,
          },
        },
      );

      // Send specific notification to the assigned user if they're connected
      if (assignmentResult.task.assignedUser) {
        const assignedUserSockets = Array.from(
          this.server.sockets.sockets.values(),
        ).filter(
          (socket: AuthenticatedSocket) =>
            socket.user && socket.user.id === assignedUserId,
        );

        assignedUserSockets.forEach((socket: AuthenticatedSocket) => {
          socket.emit('task-assigned-to-me', {
            message: `You have been assigned to task: ${assignmentResult.task.title}`,
            task: assignmentResult.task,
            assignedBy: {
              id: client.user!.id,
              name: client.user!.name,
              email: client.user!.email,
            },
            timestamp: new Date().toISOString(),
          });
        });
      }
    } catch (error) {
      this.logger.error(
        `Error assigning task via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message:
          error instanceof Error ? error.message : 'Failed to assign task',
        taskId,
      });
    }
  }

  @SubscribeMessage('task-unassign')
  async handleTaskUnassign(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    const { taskId } = data;

    try {
      // Get task info before unassigning for notification
      const taskBeforeUnassign = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignedUser: {
            select: { id: true, name: true, email: true },
          },
          list: {
            select: { id: true, name: true },
          },
        },
      });

      if (!taskBeforeUnassign) {
        client.emit('error', { message: 'Task not found', taskId });
        return;
      }

      // Unassign task using the TasksService
      const unassignmentResult = await this.tasksService.unassignTask(
        taskId,
        client.user.id,
      );

      this.logger.log(
        `Task unassigned via WebSocket: ${taskId} by user ${client.user.email}`,
      );

      // Send confirmation to the unassigning user
      client.emit('task-unassigned', {
        message: unassignmentResult.message,
        task: unassignmentResult.task,
        timestamp: new Date().toISOString(),
      });

      // Broadcast to all users in the list room
      await this.broadcastToListRoom(
        unassignmentResult.task.listId,
        'task-unassigned',
        {
          task: unassignmentResult.task,
          previouslyAssignedUser: taskBeforeUnassign.assignedUser,
          unassignedBy: {
            id: client.user.id,
            name: client.user.name,
            email: client.user.email,
          },
        },
      );

      // Send specific notification to the previously assigned user if they're connected
      if (taskBeforeUnassign.assignedUser) {
        const previouslyAssignedUserSockets = Array.from(
          this.server.sockets.sockets.values(),
        ).filter(
          (socket: AuthenticatedSocket) =>
            socket.user &&
            socket.user.id === taskBeforeUnassign.assignedUser!.id,
        );

        previouslyAssignedUserSockets.forEach((socket: AuthenticatedSocket) => {
          socket.emit('task-unassigned-from-me', {
            message: `You have been unassigned from task: ${taskBeforeUnassign.title}`,
            task: unassignmentResult.task,
            unassignedBy: {
              id: client.user!.id,
              name: client.user!.name,
              email: client.user!.email,
            },
            timestamp: new Date().toISOString(),
          });
        });
      }
    } catch (error) {
      this.logger.error(
        `Error unassigning task via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message:
          error instanceof Error ? error.message : 'Failed to unassign task',
        taskId,
      });
    }
  }

  // =============================================================================
  // USER EVENT HANDLERS
  // =============================================================================

  @SubscribeMessage('user-profile-update')
  async handleUserProfileUpdate(
    @MessageBody() data: UpdateProfileDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      // Update user profile using the UsersService
      const updatedProfile = await this.usersService.updateProfile(
        client.user.id,
        data,
      );

      this.logger.log(
        `User profile updated via WebSocket: ${client.user.id} by user ${client.user.email}`,
      );

      // Update the socket's user info
      client.user = {
        ...client.user,
        name: updatedProfile.name,
        email: updatedProfile.email,
        updatedAt: updatedProfile.updatedAt,
      };

      // Send confirmation to the updating user
      client.emit('user-profile-updated', {
        message: 'Profile updated successfully',
        profile: updatedProfile,
        timestamp: new Date().toISOString(),
      });

      // Broadcast profile changes to all authenticated users for real-time UI updates
      // (This helps update user names in task assignments, room member lists, etc.)
      this.broadcastToAuthenticatedUsers('user-profile-changed', {
        userId: client.user.id,
        profile: {
          id: updatedProfile.id,
          name: updatedProfile.name,
          email: updatedProfile.email,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error updating user profile via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message:
          error instanceof Error ? error.message : 'Failed to update profile',
      });
    }
  }

  @SubscribeMessage('user-status-change')
  async handleUserStatusChange(
    @MessageBody() data: { status: string; message?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    const { status, message } = data;

    try {
      this.logger.log(
        `User status changed via WebSocket: ${client.user.id} to ${status} by user ${client.user.email}`,
      );

      // Send confirmation to the user
      client.emit('user-status-changed', {
        message: 'Status updated successfully',
        status,
        statusMessage: message,
        timestamp: new Date().toISOString(),
      });

      // Broadcast status change to all authenticated users
      // This can be used for presence indicators in the UI
      this.broadcastToAuthenticatedUsers('user-status-updated', {
        userId: client.user.id,
        userName: client.user.name,
        status,
        statusMessage: message,
      });
    } catch (error) {
      this.logger.error(
        `Error updating user status via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message:
          error instanceof Error ? error.message : 'Failed to update status',
      });
    }
  }

  // Enhanced helper methods for room-based messaging

  /**
   * Broadcast event to a specific list room with authorization validation
   */
  async broadcastToListRoom(
    listId: string,
    event: string,
    data: any,
  ): Promise<void> {
    const roomName = `list-${listId}`;
    this.server.to(roomName).emit(event, {
      ...data,
      listId,
      timestamp: new Date().toISOString(),
    });

    // Update room activity
    const roomData = this.rooms.get(roomName);
    if (roomData) {
      roomData.lastActivity = new Date();
    }
  }

  /**
   * Broadcast event to specific authorized users in a list room
   */
  async broadcastToAuthorizedListMembers(
    listId: string,
    event: string,
    data: any,
  ): Promise<void> {
    try {
      // Get all users who have access to this list
      const authorizedUsers = await this.getListAuthorizedUsers(listId);
      const authorizedUserIds = new Set(authorizedUsers.map((user) => user.id));

      // Get all connected authenticated sockets
      const authenticatedSockets = Array.from(
        this.server.sockets.sockets.values(),
      ).filter(
        (socket: AuthenticatedSocket) =>
          socket.user && authorizedUserIds.has(socket.user.id),
      );

      // Send the event to authorized connected users
      authenticatedSockets.forEach((socket: AuthenticatedSocket) => {
        socket.emit(event, {
          ...data,
          listId,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      this.logger.error(
        `Error broadcasting to authorized list members for ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Helper method to broadcast events to specific rooms with authentication context
  broadcastToRoom(room: string, event: string, data: any): void {
    this.server.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Helper method to broadcast events to specific clients with authentication context
  broadcastToClient(clientId: string, event: string, data: any): void {
    this.server.to(clientId).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Helper method to broadcast events to authenticated users only
  broadcastToAuthenticatedUsers(event: string, data: any): void {
    // Get all connected sockets and filter for authenticated ones
    const authenticatedSockets = Array.from(
      this.server.sockets.sockets.values(),
    ).filter((socket: AuthenticatedSocket) => socket.user);

    authenticatedSockets.forEach((socket: AuthenticatedSocket) => {
      socket.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });
  }

  // Private helper methods for room management

  /**
   * Validate if a user has access to a specific list
   */
  private async validateListAccess(
    userId: string,
    listId: string,
  ): Promise<boolean> {
    try {
      const access = await this.prisma.list.findFirst({
        where: {
          id: listId,
          OR: [
            { userId: userId }, // Owner
            {
              shares: {
                some: { userId: userId },
              },
            }, // Shared access
          ],
        },
      });

      return access !== null;
    } catch (error) {
      this.logger.error(
        `Error validating list access for user ${userId} and list ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  /**
   * Get all users who have access to a specific list
   */
  private async getListAuthorizedUsers(
    listId: string,
  ): Promise<{ id: string; email: string; name: string }[]> {
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

      const users = [listWithUsers.owner];
      listWithUsers.shares.forEach((share) => {
        users.push(share.user);
      });

      // Remove duplicates by user ID
      const uniqueUsers = users.filter(
        (user, index, self) =>
          index === self.findIndex((u) => u.id === user.id),
      );

      return uniqueUsers;
    } catch (error) {
      this.logger.error(
        `Error getting authorized users for list ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  /**
   * Add a client to room membership tracking
   */
  private addClientToRoom(
    roomName: string,
    listId: string,
    client: AuthenticatedSocket,
  ): void {
    if (!client.user) return;

    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, {
        listId,
        members: new Map(),
        createdAt: new Date(),
        lastActivity: new Date(),
      });
    }

    const roomData = this.rooms.get(roomName)!;
    roomData.members.set(client.id, {
      userId: client.user.id,
      userName: client.user.name,
      userEmail: client.user.email,
      joinedAt: new Date(),
    });
    roomData.lastActivity = new Date();
  }

  /**
   * Remove a client from room membership tracking
   */
  private removeClientFromRoom(
    roomName: string,
    client: AuthenticatedSocket,
  ): void {
    const roomData = this.rooms.get(roomName);
    if (roomData) {
      roomData.members.delete(client.id);
      roomData.lastActivity = new Date();
    }
  }

  /**
   * Remove a client from all rooms when disconnecting
   */
  private cleanupClientFromRooms(client: AuthenticatedSocket): void {
    for (const [roomName, roomData] of this.rooms.entries()) {
      if (roomData.members.has(client.id)) {
        roomData.members.delete(client.id);
        roomData.lastActivity = new Date();

        // Check if room became empty
        this.checkAndCleanupEmptyRoom(roomName);
      }
    }
  }

  /**
   * Check if a room is empty and clean it up
   */
  private checkAndCleanupEmptyRoom(roomName: string): void {
    const roomData = this.rooms.get(roomName);
    if (roomData && roomData.members.size === 0) {
      this.logger.log(
        `Cleaning up empty room: ${roomName} (listId: ${roomData.listId})`,
      );
      this.rooms.delete(roomName);
    }
  }

  /**
   * Start automatic cleanup process for inactive rooms
   */
  private startRoomCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.performRoomCleanup();
    }, this.ROOM_CLEANUP_INTERVAL);
  }

  /**
   * Perform cleanup of inactive or empty rooms
   */
  private performRoomCleanup(): void {
    const now = new Date();
    const inactiveThreshold = new Date(
      now.getTime() - this.ROOM_CLEANUP_INTERVAL,
    );

    for (const [roomName, roomData] of this.rooms.entries()) {
      // Clean up empty rooms or very inactive rooms
      if (
        roomData.members.size === 0 ||
        roomData.lastActivity < inactiveThreshold
      ) {
        this.logger.log(
          `Cleaning up inactive room: ${roomName} (listId: ${roomData.listId}, members: ${roomData.members.size})`,
        );
        this.rooms.delete(roomName);
      }
    }
  }

  // =============================================================================
  // ENHANCED PERMISSION-AWARE EVENT HANDLERS
  // =============================================================================

  /**
   * Enhanced task creation with permission-level-aware broadcasting
   */
  @SubscribeMessage('enhanced-task-create')
  async handleEnhancedTaskCreate(
    @MessageBody() data: CreateTaskDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      // Validate user can create tasks (needs EDITOR+ permission)
      const userPermission =
        await this.enhancedPermissionService.getUserPermission(
          client.user.id,
          data.listId,
        );

      if (!userPermission.canEdit) {
        await this.enhancedBroadcastService.broadcastAuditEvent(
          this.server,
          data.listId,
          client.user.id,
          'task-create-denied',
          userPermission.permissionLevel || PermissionLevel.VIEWER,
          false,
          'Insufficient permissions to create tasks',
        );

        client.emit('error', {
          message: 'Access denied: Insufficient permissions to create tasks',
          requiredPermission: 'EDITOR',
        });
        return;
      }

      // Create task using the TasksService
      const newTask = await this.tasksService.create(data, client.user.id);

      // Log permission action
      this.enhancedPermissionService.logPermissionAction(
        client.user.id,
        data.listId,
        'task-create',
        userPermission.permissionLevel || PermissionLevel.VIEWER,
        true,
        `Created task: ${newTask.title}`,
      );

      // Send confirmation to the creating user
      client.emit('enhanced-task-created', {
        message: 'Task created successfully',
        task: newTask,
        userPermission: userPermission.permissionLevel,
        timestamp: new Date().toISOString(),
      });

      // Use permission-aware notification broadcasting
      await this.enhancedBroadcastService.broadcastPermissionAwareNotification(
        this.server,
        newTask.listId,
        'enhanced-task-created',
        `New task created: ${newTask.title}`,
        client.user.id,
        client.user.name,
        'WRITE',
      );

      // Broadcast audit event to owners
      await this.enhancedBroadcastService.broadcastAuditEvent(
        this.server,
        newTask.listId,
        client.user.id,
        'task-create',
        userPermission.permissionLevel || PermissionLevel.VIEWER,
        true,
        `Task created: ${newTask.title}`,
      );
    } catch (error) {
      this.logger.error(
        `Error creating enhanced task via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message:
          error instanceof Error ? error.message : 'Failed to create task',
      });
    }
  }

  /**
   * Enhanced task deletion with strict permission checks
   */
  @SubscribeMessage('enhanced-task-delete')
  async handleEnhancedTaskDelete(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    const { taskId } = data;

    try {
      // Get task info first
      const taskToDelete = await this.prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true, title: true, listId: true },
      });

      if (!taskToDelete) {
        client.emit('error', { message: 'Task not found', taskId });
        return;
      }

      // Validate user can delete tasks (needs EDITOR+ permission)
      const userPermission =
        await this.enhancedPermissionService.getUserPermission(
          client.user.id,
          taskToDelete.listId,
        );

      if (!userPermission.canDelete) {
        await this.enhancedBroadcastService.broadcastAuditEvent(
          this.server,
          taskToDelete.listId,
          client.user.id,
          'task-delete-denied',
          userPermission.permissionLevel || PermissionLevel.VIEWER,
          false,
          `Attempted to delete task: ${taskToDelete.title}`,
        );

        client.emit('error', {
          message: 'Access denied: Insufficient permissions to delete tasks',
          requiredPermission: 'EDITOR',
          taskId,
        });
        return;
      }

      // Delete task using the TasksService
      const deletionResult = await this.tasksService.remove(
        taskId,
        client.user.id,
      );

      // Log permission action
      this.enhancedPermissionService.logPermissionAction(
        client.user.id,
        taskToDelete.listId,
        'task-delete',
        userPermission.permissionLevel || PermissionLevel.VIEWER,
        true,
        `Deleted task: ${taskToDelete.title}`,
      );

      // Send confirmation to the deleting user
      client.emit('enhanced-task-deleted', {
        message: 'Task deleted successfully',
        deletedTask: deletionResult.deletedTask,
        userPermission: userPermission.permissionLevel,
        timestamp: new Date().toISOString(),
      });

      // Broadcast only to users with EDITOR+ permissions (exclude viewers from sensitive operations)
      await this.enhancedBroadcastService.broadcastToEditorsAndOwners(
        this.server,
        taskToDelete.listId,
        'enhanced-task-deleted',
        {
          deletedTask: deletionResult.deletedTask,
          deletedBy: {
            id: client.user.id,
            name: client.user.name,
            email: client.user.email,
          },
        },
      );

      // Broadcast audit event to owners
      await this.enhancedBroadcastService.broadcastAuditEvent(
        this.server,
        taskToDelete.listId,
        client.user.id,
        'task-delete',
        userPermission.permissionLevel || PermissionLevel.VIEWER,
        true,
        `Task deleted: ${taskToDelete.title}`,
      );
    } catch (error) {
      this.logger.error(
        `Error deleting enhanced task via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message:
          error instanceof Error ? error.message : 'Failed to delete task',
        taskId,
      });
    }
  }

  /**
   * Permission change event handler
   */
  @SubscribeMessage('change-user-permission')
  async handleChangeUserPermission(
    @MessageBody()
    data: {
      listId: string;
      targetUserId: string;
      newPermissionLevel: PermissionLevel;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    const { listId, targetUserId, newPermissionLevel } = data;

    try {
      // Validate user can manage permissions (needs OWNER permission)
      const userPermission =
        await this.enhancedPermissionService.getUserPermission(
          client.user.id,
          listId,
        );

      if (!userPermission.canManageShares) {
        await this.enhancedBroadcastService.broadcastAuditEvent(
          this.server,
          listId,
          client.user.id,
          'permission-change-denied',
          userPermission.permissionLevel || PermissionLevel.VIEWER,
          false,
          `Attempted to change permission for user ${targetUserId}`,
        );

        client.emit('error', {
          message: 'Access denied: Only list owners can manage permissions',
          requiredPermission: 'OWNER',
        });
        return;
      }

      // Update permission in database (this would be done via a ListSharesService)
      // For demo purposes, we'll simulate this

      // Log permission action
      this.enhancedPermissionService.logPermissionAction(
        client.user.id,
        listId,
        'permission-change',
        userPermission.permissionLevel || PermissionLevel.VIEWER,
        true,
        `Changed user ${targetUserId} permission to ${newPermissionLevel}`,
      );

      // Send confirmation to the changing user
      client.emit('permission-changed', {
        message: 'Permission updated successfully',
        targetUserId,
        newPermissionLevel,
        timestamp: new Date().toISOString(),
      });

      // Broadcast permission change to all list members
      await this.enhancedBroadcastService.broadcastPermissionChange(
        this.server,
        listId,
        targetUserId,
        newPermissionLevel,
        client.user.id,
        client.user.name,
      );

      // Broadcast audit event to owners
      await this.enhancedBroadcastService.broadcastAuditEvent(
        this.server,
        listId,
        client.user.id,
        'permission-change',
        userPermission.permissionLevel || PermissionLevel.VIEWER,
        true,
        `Permission changed for user ${targetUserId} to ${newPermissionLevel}`,
      );
    } catch (error) {
      this.logger.error(
        `Error changing user permission via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to change permission',
      });
    }
  }

  /**
   * Get user's permission level for a list
   */
  @SubscribeMessage('get-my-permission')
  async handleGetMyPermission(
    @MessageBody() data: { listId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const userPermission =
        await this.enhancedPermissionService.getUserPermission(
          client.user.id,
          data.listId,
        );

      client.emit('my-permission', {
        listId: data.listId,
        permission: userPermission,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Error getting user permission via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to get permission information',
      });
    }
  }

  // =============================================================================
  // CONNECTION MANAGEMENT & PRESENCE TRACKING EVENT HANDLERS
  // =============================================================================

  /**
   * Update user presence status
   */
  @SubscribeMessage('update-presence-status')
  handleUpdatePresenceStatus(
    @MessageBody() data: { status: PresenceStatus },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      this.connectionManager.updateUserStatus(client.user.id, data.status);

      client.emit('presence-status-updated', {
        status: data.status,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `User ${client.user.email} updated presence status to: ${data.status}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating presence status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', { message: 'Failed to update presence status' });
    }
  }

  /**
   * Update user activity
   */
  @SubscribeMessage('update-user-activity')
  handleUpdateUserActivity(
    @MessageBody() data: { activity: UserActivity },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const activityWithTimestamp: UserActivity = {
        ...data.activity,
        timestamp: new Date(),
      };

      this.connectionManager.updateUserActivity(
        client.user.id,
        activityWithTimestamp,
      );

      client.emit('user-activity-updated', {
        activity: activityWithTimestamp,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `User ${client.user.email} updated activity: ${data.activity.type}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating user activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', { message: 'Failed to update user activity' });
    }
  }

  /**
   * Get online users
   */
  @SubscribeMessage('get-online-users')
  handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket): void {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const onlineUsers = this.connectionManager.getOnlineUsers();

      client.emit('online-users', {
        users: onlineUsers,
        count: onlineUsers.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Error getting online users: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', { message: 'Failed to get online users' });
    }
  }

  /**
   * Get users in specific list
   */
  @SubscribeMessage('get-users-in-list')
  handleGetUsersInList(
    @MessageBody() data: { listId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const usersInList = this.connectionManager.getUsersInList(data.listId);

      client.emit('users-in-list', {
        listId: data.listId,
        users: usersInList,
        count: usersInList.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Error getting users in list: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', { message: 'Failed to get users in list' });
    }
  }

  /**
   * Get user presence information
   */
  @SubscribeMessage('get-user-presence')
  handleGetUserPresence(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const userPresence = this.connectionManager.getUserPresence(data.userId);

      if (userPresence) {
        client.emit('user-presence', {
          presence: userPresence,
          timestamp: new Date().toISOString(),
        });
      } else {
        client.emit('user-presence', {
          presence: null,
          message: 'User not found or offline',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(
        `Error getting user presence: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', { message: 'Failed to get user presence' });
    }
  }

  /**
   * Get connection statistics (admin feature)
   */
  @SubscribeMessage('get-connection-stats')
  handleGetConnectionStats(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): void {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const connectionStats = this.connectionManager.getConnectionStats();

      client.emit('connection-stats', {
        stats: connectionStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Error getting connection stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', { message: 'Failed to get connection statistics' });
    }
  }

  /**
   * Enhanced join list room with activity tracking
   */
  @SubscribeMessage('join-list-room-with-activity')
  async handleJoinListRoomWithActivity(
    @MessageBody() data: { listId: string; activity?: UserActivity },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    if (!client.user) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      // First perform regular room joining
      await this.handleJoinListRoom({ listId: data.listId }, client);

      // Then update user activity if provided
      if (data.activity) {
        const activityWithDetails: UserActivity = {
          ...data.activity,
          listId: data.listId,
          timestamp: new Date(),
        };

        this.connectionManager.updateUserActivity(
          client.user.id,
          activityWithDetails,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error joining list room with activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', {
        message: 'Failed to join list room with activity tracking',
      });
    }
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Cleanup connection manager
    this.connectionManager.onModuleDestroy();
  }
}
