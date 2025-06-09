import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Server } from 'socket.io';
import { WebSocketsGateway } from '../websockets/websockets.gateway';
import { NotificationResponseDto } from './dto';

@Injectable()
export class WebSocketNotificationService {
  constructor(
    @Inject(forwardRef(() => WebSocketsGateway))
    private readonly webSocketGateway: WebSocketsGateway,
  ) {}

  private get server(): Server | null {
    return this.webSocketGateway.server || null;
  }

  /**
   * Broadcast new notification to specific user
   */
  async broadcastNewNotification(
    userId: string,
    notification: NotificationResponseDto,
  ): Promise<void> {
    if (!this.server) {
      console.warn(
        'WebSocket server not available for notification broadcasting',
      );
      return;
    }

    try {
      // Get all sockets for the user
      const userSockets = Array.from(
        this.server.sockets.sockets.values(),
      ).filter((socket: any) => socket.user && socket.user.id === userId);

      // Send to all user's connected devices
      userSockets.forEach((socket) => {
        socket.emit('notification:new', {
          notification,
          timestamp: new Date().toISOString(),
        });
      });

      console.log(
        `📨 Broadcasted new notification to user ${userId} on ${userSockets.length} devices`,
      );
    } catch (error) {
      console.error('Failed to broadcast new notification:', error);
    }
  }

  /**
   * Broadcast notification update to specific user
   */
  async broadcastNotificationUpdate(
    userId: string,
    notification: NotificationResponseDto,
  ): Promise<void> {
    if (!this.server) {
      console.warn(
        'WebSocket server not available for notification broadcasting',
      );
      return;
    }

    try {
      // Get all sockets for the user
      const userSockets = Array.from(
        this.server.sockets.sockets.values(),
      ).filter((socket: any) => socket.user && socket.user.id === userId);

      // Send to all user's connected devices
      userSockets.forEach((socket) => {
        socket.emit('notification:updated', {
          notification,
          timestamp: new Date().toISOString(),
        });
      });

      console.log(
        `📨 Broadcasted notification update to user ${userId} on ${userSockets.length} devices`,
      );
    } catch (error) {
      console.error('Failed to broadcast notification update:', error);
    }
  }

  /**
   * Broadcast notification deletion to specific user
   */
  async broadcastNotificationDelete(
    userId: string,
    notificationId: string,
  ): Promise<void> {
    if (!this.server) {
      console.warn(
        'WebSocket server not available for notification broadcasting',
      );
      return;
    }

    try {
      // Get all sockets for the user
      const userSockets = Array.from(
        this.server.sockets.sockets.values(),
      ).filter((socket: any) => socket.user && socket.user.id === userId);

      // Send to all user's connected devices
      userSockets.forEach((socket) => {
        socket.emit('notification:deleted', {
          notificationId,
          timestamp: new Date().toISOString(),
        });
      });

      console.log(
        `📨 Broadcasted notification deletion to user ${userId} on ${userSockets.length} devices`,
      );
    } catch (error) {
      console.error('Failed to broadcast notification deletion:', error);
    }
  }
}
