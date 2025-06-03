import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
    ConnectionState,
    ConnectionStatus,
    HeartbeatConfig,
    PresenceStatus,
    PresenceUpdate,
    UserActivity,
    UserPresence
} from '../interfaces/connection.interface';

@Injectable()
export class ConnectionManagerService {
    private readonly logger = new Logger(ConnectionManagerService.name);

    // In-memory stores for connection and presence data
    private connections: Map<string, ConnectionState> = new Map(); // socketId -> ConnectionState
    private userPresence: Map<string, UserPresence> = new Map(); // userId -> UserPresence
    private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map(); // socketId -> timer
    private server?: Server;

    // Heartbeat configuration
    private readonly heartbeatConfig: HeartbeatConfig = {
        interval: 30000, // 30 seconds
        timeout: 60000, // 60 seconds
        maxMissedHeartbeats: 3,
    };

    // Cleanup interval for stale connections
    private cleanupInterval?: NodeJS.Timeout;
    private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.startCleanupProcess();
    }

    /**
     * Initialize the connection manager with the WebSocket server
     */
    initialize(server: Server): void {
        this.server = server;
        this.logger.log('Connection Manager initialized');
    }

    /**
     * Register a new connection
     */
    registerConnection(socket: Socket, userId: string, userData: any): void {
        const connectionState: ConnectionState = {
            socketId: socket.id,
            userId,
            status: ConnectionStatus.CONNECTED,
            connectedAt: new Date(),
            lastSeen: new Date(),
            lastPing: new Date(),
            ipAddress: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent'],
            reconnectionCount: 0,
        };

        this.connections.set(socket.id, connectionState);
        this.updateUserPresence(userId, socket.id, PresenceStatus.ONLINE, userData);
        this.startHeartbeatMonitoring(socket);

        this.logger.log(`Connection registered: ${socket.id} for user ${userId}`);

        // Broadcast presence update to all users
        this.broadcastPresenceUpdate(userId, userData);
    }

    /**
     * Unregister a connection
     */
    unregisterConnection(socketId: string): void {
        const connection = this.connections.get(socketId);
        if (!connection) return;

        const { userId } = connection;

        // Remove connection
        this.connections.delete(socketId);
        this.stopHeartbeatMonitoring(socketId);

        // Update user presence
        this.removeUserConnection(userId, socketId);

        this.logger.log(`Connection unregistered: ${socketId} for user ${userId}`);
    }

    /**
     * Update connection heartbeat
     */
    updateHeartbeat(socketId: string): void {
        const connection = this.connections.get(socketId);
        if (!connection) return;

        connection.lastPing = new Date();
        connection.lastSeen = new Date();
        this.connections.set(socketId, connection);

        // Update user presence last seen
        const userPresence = this.userPresence.get(connection.userId);
        if (userPresence) {
            userPresence.lastSeen = new Date();
            this.userPresence.set(connection.userId, userPresence);
        }
    }

    /**
     * Update user activity
     */
    updateUserActivity(userId: string, activity: UserActivity): void {
        const userPresence = this.userPresence.get(userId);
        if (!userPresence) return;

        userPresence.currentActivity = activity;
        userPresence.lastSeen = new Date();
        this.userPresence.set(userId, userPresence);

        // Broadcast activity update
        this.broadcastActivityUpdate(userId, activity);
    }

    /**
     * Update user presence status
     */
    updateUserStatus(userId: string, status: PresenceStatus): void {
        const userPresence = this.userPresence.get(userId);
        if (!userPresence) return;

        userPresence.status = status;
        userPresence.lastSeen = new Date();
        this.userPresence.set(userId, userPresence);

        // Broadcast status update
        this.broadcastStatusUpdate(userId, status);
    }

    /**
     * Get user presence information
     */
    getUserPresence(userId: string): UserPresence | undefined {
        return this.userPresence.get(userId);
    }

    /**
     * Get all online users
     */
    getOnlineUsers(): UserPresence[] {
        return Array.from(this.userPresence.values()).filter(
            (presence) => presence.isOnline,
        );
    }

    /**
     * Get user presence for a specific list
     */
    getUsersInList(listId: string): UserPresence[] {
        return Array.from(this.userPresence.values()).filter(
            (presence) =>
                presence.isOnline &&
                presence.currentActivity?.listId === listId,
        );
    }

    /**
     * Get connection statistics
     */
    getConnectionStats(): {
        totalConnections: number;
        onlineUsers: number;
        connectionsByStatus: Record<ConnectionStatus, number>;
    } {
        const totalConnections = this.connections.size;
        const onlineUsers = this.getOnlineUsers().length;

        const connectionsByStatus = Array.from(this.connections.values()).reduce(
            (acc, conn) => {
                acc[conn.status] = (acc[conn.status] || 0) + 1;
                return acc;
            },
            {} as Record<ConnectionStatus, number>,
        );

        return {
            totalConnections,
            onlineUsers,
            connectionsByStatus,
        };
    }

    /**
     * Start heartbeat monitoring for a connection
     */
    private startHeartbeatMonitoring(socket: Socket): void {
        const timer = setInterval(() => {
            const connection = this.connections.get(socket.id);
            if (!connection) {
                this.stopHeartbeatMonitoring(socket.id);
                return;
            }

            const now = new Date();
            const lastPing = connection.lastPing || connection.connectedAt;
            const timeSinceLastPing = now.getTime() - lastPing.getTime();

            if (timeSinceLastPing > this.heartbeatConfig.timeout) {
                this.logger.warn(
                    `Connection ${socket.id} missed heartbeat, disconnecting`,
                );
                socket.disconnect(true);
                this.unregisterConnection(socket.id);
            }
        }, this.heartbeatConfig.interval);

        this.heartbeatTimers.set(socket.id, timer);
    }

    /**
     * Stop heartbeat monitoring for a connection
     */
    private stopHeartbeatMonitoring(socketId: string): void {
        const timer = this.heartbeatTimers.get(socketId);
        if (timer) {
            clearInterval(timer);
            this.heartbeatTimers.delete(socketId);
        }
    }

    /**
     * Update user presence
     */
    private updateUserPresence(
        userId: string,
        socketId: string,
        status: PresenceStatus,
        _userData: any,
    ): void {
        let userPresence = this.userPresence.get(userId);

        if (!userPresence) {
            userPresence = {
                userId,
                status,
                isOnline: true,
                lastSeen: new Date(),
                activeConnections: [socketId],
            };
        } else {
            userPresence.status = status;
            userPresence.isOnline = true;
            userPresence.lastSeen = new Date();
            if (!userPresence.activeConnections.includes(socketId)) {
                userPresence.activeConnections.push(socketId);
            }
        }

        this.userPresence.set(userId, userPresence);
    }

    /**
     * Remove user connection (for multi-tab support)
     */
    private removeUserConnection(userId: string, socketId: string): void {
        const userPresence = this.userPresence.get(userId);
        if (!userPresence) return;

        // Remove this connection from active connections
        userPresence.activeConnections = userPresence.activeConnections.filter(
            (id) => id !== socketId,
        );

        // If no more active connections, mark user as offline
        if (userPresence.activeConnections.length === 0) {
            userPresence.isOnline = false;
            userPresence.status = PresenceStatus.OFFLINE;
            userPresence.currentActivity = undefined;
        }

        userPresence.lastSeen = new Date();
        this.userPresence.set(userId, userPresence);

        // Broadcast presence update if user went offline
        if (!userPresence.isOnline) {
            this.broadcastPresenceUpdate(userId);
        }
    }

    /**
     * Broadcast presence update to all connected users
     */
    private broadcastPresenceUpdate(userId: string, userData?: any): void {
        if (!this.server) return;

        const userPresence = this.userPresence.get(userId);
        if (!userPresence) return;

        const presenceUpdate: PresenceUpdate = {
            userId,
            userName: userData?.name || 'Unknown User',
            status: userPresence.status,
            isOnline: userPresence.isOnline,
            lastSeen: userPresence.lastSeen,
            activity: userPresence.currentActivity,
        };

        this.server.emit('user-presence-update', {
            ...presenceUpdate,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Broadcast activity update
     */
    private broadcastActivityUpdate(userId: string, activity: UserActivity): void {
        if (!this.server) return;

        this.server.emit('user-activity-update', {
            userId,
            activity,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Broadcast status update
     */
    private broadcastStatusUpdate(userId: string, status: PresenceStatus): void {
        if (!this.server) return;

        this.server.emit('user-status-update', {
            userId,
            status,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Start cleanup process for stale connections
     */
    private startCleanupProcess(): void {
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, this.CLEANUP_INTERVAL);
    }

    /**
     * Perform cleanup of stale connections and presence data
     */
    private performCleanup(): void {
        const now = new Date();
        const staleThreshold = 10 * 60 * 1000; // 10 minutes

        // Clean up stale connections
        const staleConnections: string[] = [];
        for (const [socketId, connection] of this.connections.entries()) {
            const timeSinceLastSeen = now.getTime() - connection.lastSeen.getTime();
            if (timeSinceLastSeen > staleThreshold) {
                staleConnections.push(socketId);
            }
        }

        staleConnections.forEach((socketId) => {
            this.logger.log(`Cleaning up stale connection: ${socketId}`);
            this.unregisterConnection(socketId);
        });

        // Clean up offline users after extended period
        const offlineThreshold = 24 * 60 * 60 * 1000; // 24 hours
        const usersToRemove: string[] = [];

        for (const [userId, presence] of this.userPresence.entries()) {
            if (
                !presence.isOnline &&
                now.getTime() - presence.lastSeen.getTime() > offlineThreshold
            ) {
                usersToRemove.push(userId);
            }
        }

        usersToRemove.forEach((userId) => {
            this.logger.log(`Removing old offline user presence: ${userId}`);
            this.userPresence.delete(userId);
        });

        if (staleConnections.length > 0 || usersToRemove.length > 0) {
            this.logger.log(
                `Cleanup completed: ${staleConnections.length} connections, ${usersToRemove.length} user presences`,
            );
        }
    }

    /**
     * Cleanup on module destroy
     */
    onModuleDestroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        // Clear all heartbeat timers
        for (const timer of this.heartbeatTimers.values()) {
            clearInterval(timer);
        }

        this.connections.clear();
        this.userPresence.clear();
        this.heartbeatTimers.clear();

        this.logger.log('Connection Manager destroyed');
    }
} 