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
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto } from '../tasks/dto';
import { TasksService } from '../tasks/tasks.service';
import { UpdateProfileDto } from '../users/dto';
import { UsersService } from '../users/users.service';
import { WsJwtAuthGuard } from './guards';

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
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
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
    ) { }

    afterInit(__server: Server) {
        this.logger.log('WebSocket Gateway initialized with JWT authentication and room management');

        // Start automatic room cleanup process
        this.startRoomCleanup();
    }

    async handleConnection(client: AuthenticatedSocket, ..._args: any[]) {
        // Authentication is handled by WsJwtAuthGuard, but we can do additional setup here
        try {
            const user = client.user;
            if (user) {
                this.logger.log(`Authenticated client connected: ${client.id} (User: ${user.email})`);

                // Send welcome message with user info
                client.emit('connection-established', {
                    message: 'Successfully connected to WebSocket',
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                    },
                    timestamp: new Date().toISOString(),
                });
            } else {
                // This should not happen if WsJwtAuthGuard is working correctly
                this.logger.warn(`Client connected without authentication: ${client.id}`);
                client.disconnect();
            }
        } catch (error) {
            this.logger.error(`Error during connection handling: ${error instanceof Error ? error.message : 'Unknown error'}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: AuthenticatedSocket) {
        const user = client.user;
        const userInfo = user ? ` (User: ${user.email})` : '';
        this.logger.log(`Client disconnected: ${client.id}${userInfo}`);

        // Remove client from all rooms and clean up memberships
        this.cleanupClientFromRooms(client);
    }

    @SubscribeMessage('ping')
    handlePing(@ConnectedSocket() client: AuthenticatedSocket): void {
        client.emit('pong', {
            timestamp: new Date().toISOString(),
            userId: client.user?.id,
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
                    message: 'Access denied: You do not have permission to access this list',
                    listId
                });
                return;
            }

            const roomName = `list-${listId}`;

            // Join the socket.io room
            client.join(roomName);

            // Update room membership data
            this.addClientToRoom(roomName, listId, client);

            this.logger.log(`Client ${client.id} (User: ${client.user.email}) joined list room: ${listId}`);

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
            this.logger.error(`Error joining list room ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            client.emit('error', {
                message: 'Failed to join list room',
                listId
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

            this.logger.log(`Client ${client.id} (User: ${client.user.email}) left list room: ${listId}`);

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
            this.logger.error(`Error leaving list room ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            client.emit('error', {
                message: 'Failed to leave list room',
                listId
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
        this.logger.log(`Client ${client.id} (User: ${client.user.email}) joined generic room: ${data.room}`);

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
        this.logger.log(`Client ${client.id} (User: ${client.user.email}) left generic room: ${data.room}`);

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
                    message: 'Access denied: You do not have permission to access this list',
                    listId
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
            this.logger.error(`Error getting room members for ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            client.emit('error', {
                message: 'Failed to get room members',
                listId
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

            this.logger.log(`Task created via WebSocket: ${newTask.id} by user ${client.user.email}`);

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
            this.logger.error(`Error creating task via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`);
            client.emit('error', {
                message: error instanceof Error ? error.message : 'Failed to create task',
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
            const updatedTask = await this.tasksService.update(taskId, updateData, client.user.id);

            this.logger.log(`Task updated via WebSocket: ${taskId} by user ${client.user.email}`);

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
            this.logger.error(`Error updating task via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`);
            client.emit('error', {
                message: error instanceof Error ? error.message : 'Failed to update task',
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
                select: { id: true, title: true, listId: true }
            });

            if (!taskToDelete) {
                client.emit('error', { message: 'Task not found', taskId });
                return;
            }

            // Delete task using the TasksService
            const deletionResult = await this.tasksService.remove(taskId, client.user.id);

            this.logger.log(`Task deleted via WebSocket: ${taskId} by user ${client.user.email}`);

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
            this.logger.error(`Error deleting task via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`);
            client.emit('error', {
                message: error instanceof Error ? error.message : 'Failed to delete task',
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
            const statusUpdateResult = await this.tasksService.updateStatus(taskId, status, client.user.id);

            this.logger.log(`Task status updated via WebSocket: ${taskId} to ${status.status} by user ${client.user.email}`);

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
            await this.broadcastToListRoom(statusUpdateResult.task.listId, 'task-status-updated', {
                task: statusUpdateResult.task,
                previousStatus: statusUpdateResult.previousStatus,
                newStatus: statusUpdateResult.newStatus,
                updatedBy: {
                    id: client.user.id,
                    name: client.user.name,
                    email: client.user.email,
                },
            });

        } catch (error) {
            this.logger.error(`Error updating task status via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`);
            client.emit('error', {
                message: error instanceof Error ? error.message : 'Failed to update task status',
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
            const assignmentResult = await this.tasksService.assignTask(taskId, { assignedUserId }, client.user.id);

            this.logger.log(`Task assigned via WebSocket: ${taskId} to user ${assignedUserId} by user ${client.user.email}`);

            // Send confirmation to the assigning user
            client.emit('task-assigned', {
                message: assignmentResult.message,
                task: assignmentResult.task,
                timestamp: new Date().toISOString(),
            });

            // Broadcast to all users in the list room
            await this.broadcastToListRoom(assignmentResult.task.listId, 'task-assigned', {
                task: assignmentResult.task,
                assignedBy: {
                    id: client.user.id,
                    name: client.user.name,
                    email: client.user.email,
                },
            });

            // Send specific notification to the assigned user if they're connected
            if (assignmentResult.task.assignedUser) {
                const assignedUserSockets = Array.from(this.server.sockets.sockets.values())
                    .filter((socket: AuthenticatedSocket) =>
                        socket.user && socket.user.id === assignedUserId
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
            this.logger.error(`Error assigning task via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`);
            client.emit('error', {
                message: error instanceof Error ? error.message : 'Failed to assign task',
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
                        select: { id: true, name: true, email: true }
                    },
                    list: {
                        select: { id: true, name: true }
                    }
                }
            });

            if (!taskBeforeUnassign) {
                client.emit('error', { message: 'Task not found', taskId });
                return;
            }

            // Unassign task using the TasksService
            const unassignmentResult = await this.tasksService.unassignTask(taskId, client.user.id);

            this.logger.log(`Task unassigned via WebSocket: ${taskId} by user ${client.user.email}`);

            // Send confirmation to the unassigning user
            client.emit('task-unassigned', {
                message: unassignmentResult.message,
                task: unassignmentResult.task,
                timestamp: new Date().toISOString(),
            });

            // Broadcast to all users in the list room
            await this.broadcastToListRoom(unassignmentResult.task.listId, 'task-unassigned', {
                task: unassignmentResult.task,
                previouslyAssignedUser: taskBeforeUnassign.assignedUser,
                unassignedBy: {
                    id: client.user.id,
                    name: client.user.name,
                    email: client.user.email,
                },
            });

            // Send specific notification to the previously assigned user if they're connected
            if (taskBeforeUnassign.assignedUser) {
                const previouslyAssignedUserSockets = Array.from(this.server.sockets.sockets.values())
                    .filter((socket: AuthenticatedSocket) =>
                        socket.user && socket.user.id === taskBeforeUnassign.assignedUser!.id
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
            this.logger.error(`Error unassigning task via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`);
            client.emit('error', {
                message: error instanceof Error ? error.message : 'Failed to unassign task',
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
            const updatedProfile = await this.usersService.updateProfile(client.user.id, data);

            this.logger.log(`User profile updated via WebSocket: ${client.user.id} by user ${client.user.email}`);

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
            this.logger.error(`Error updating user profile via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`);
            client.emit('error', {
                message: error instanceof Error ? error.message : 'Failed to update profile',
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
            this.logger.log(`User status changed via WebSocket: ${client.user.id} to ${status} by user ${client.user.email}`);

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
            this.logger.error(`Error updating user status via WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`);
            client.emit('error', {
                message: error instanceof Error ? error.message : 'Failed to update status',
            });
        }
    }

    // Enhanced helper methods for room-based messaging

    /**
     * Broadcast event to a specific list room with authorization validation
     */
    async broadcastToListRoom(listId: string, event: string, data: any): Promise<void> {
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
    async broadcastToAuthorizedListMembers(listId: string, event: string, data: any): Promise<void> {
        try {
            // Get all users who have access to this list
            const authorizedUsers = await this.getListAuthorizedUsers(listId);
            const authorizedUserIds = new Set(authorizedUsers.map(user => user.id));

            // Get all connected authenticated sockets
            const authenticatedSockets = Array.from(this.server.sockets.sockets.values())
                .filter((socket: AuthenticatedSocket) =>
                    socket.user && authorizedUserIds.has(socket.user.id)
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
            this.logger.error(`Error broadcasting to authorized list members for ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        const authenticatedSockets = Array.from(this.server.sockets.sockets.values())
            .filter((socket: AuthenticatedSocket) => socket.user);

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
    private async validateListAccess(userId: string, listId: string): Promise<boolean> {
        try {
            const access = await this.prisma.list.findFirst({
                where: {
                    id: listId,
                    OR: [
                        { userId: userId }, // Owner
                        {
                            shares: {
                                some: { userId: userId }
                            }
                        }, // Shared access
                    ],
                },
            });

            return access !== null;
        } catch (error) {
            this.logger.error(`Error validating list access for user ${userId} and list ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    /**
     * Get all users who have access to a specific list
     */
    private async getListAuthorizedUsers(listId: string): Promise<{ id: string; email: string; name: string }[]> {
        try {
            const listWithUsers = await this.prisma.list.findUnique({
                where: { id: listId },
                include: {
                    owner: {
                        select: { id: true, email: true, name: true }
                    },
                    shares: {
                        include: {
                            user: {
                                select: { id: true, email: true, name: true }
                            }
                        }
                    }
                }
            });

            if (!listWithUsers) {
                return [];
            }

            const users = [listWithUsers.owner];
            listWithUsers.shares.forEach(share => {
                users.push(share.user);
            });

            // Remove duplicates by user ID
            const uniqueUsers = users.filter((user, index, self) =>
                index === self.findIndex(u => u.id === user.id)
            );

            return uniqueUsers;
        } catch (error) {
            this.logger.error(`Error getting authorized users for list ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return [];
        }
    }

    /**
     * Add a client to room membership tracking
     */
    private addClientToRoom(roomName: string, listId: string, client: AuthenticatedSocket): void {
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
    private removeClientFromRoom(roomName: string, client: AuthenticatedSocket): void {
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
            this.logger.log(`Cleaning up empty room: ${roomName} (listId: ${roomData.listId})`);
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
        const inactiveThreshold = new Date(now.getTime() - this.ROOM_CLEANUP_INTERVAL);

        for (const [roomName, roomData] of this.rooms.entries()) {
            // Clean up empty rooms or very inactive rooms
            if (roomData.members.size === 0 || roomData.lastActivity < inactiveThreshold) {
                this.logger.log(`Cleaning up inactive room: ${roomName} (listId: ${roomData.listId}, members: ${roomData.members.size})`);
                this.rooms.delete(roomName);
            }
        }
    }

    /**
     * Cleanup on module destroy
     */
    onModuleDestroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
} 