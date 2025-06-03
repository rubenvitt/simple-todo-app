import { Logger } from '@nestjs/common';
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

@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
    namespace: '/ws',
})
export class WebSocketsGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private logger: Logger = new Logger('WebSocketsGateway');

    afterInit(__server: Server) {
        this.logger.log('WebSocket Gateway initialized');
    }

    handleConnection(client: Socket, ..._args: any[]) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('ping')
    handlePing(@ConnectedSocket() client: Socket): void {
        client.emit('pong', { timestamp: new Date().toISOString() });
    }

    @SubscribeMessage('join-room')
    handleJoinRoom(
        @MessageBody() data: { room: string },
        @ConnectedSocket() client: Socket,
    ): void {
        client.join(data.room);
        this.logger.log(`Client ${client.id} joined room: ${data.room}`);
        client.to(data.room).emit('user-joined', {
            userId: client.id,
            room: data.room,
            timestamp: new Date().toISOString(),
        });
    }

    @SubscribeMessage('leave-room')
    handleLeaveRoom(
        @MessageBody() data: { room: string },
        @ConnectedSocket() client: Socket,
    ): void {
        client.leave(data.room);
        this.logger.log(`Client ${client.id} left room: ${data.room}`);
        client.to(data.room).emit('user-left', {
            userId: client.id,
            room: data.room,
            timestamp: new Date().toISOString(),
        });
    }

    // Helper method to broadcast events to specific rooms
    broadcastToRoom(room: string, event: string, data: any): void {
        this.server.to(room).emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }

    // Helper method to broadcast events to specific clients
    broadcastToClient(clientId: string, event: string, data: any): void {
        this.server.to(clientId).emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
} 