import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketsGateway } from './websockets.gateway';

describe('WebSocketsGateway', () => {
    let gateway: WebSocketsGateway;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [WebSocketsGateway],
        }).compile();

        gateway = module.get<WebSocketsGateway>(WebSocketsGateway);
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    it('should have a server property', () => {
        expect(gateway.server).toBeDefined();
    });

    it('should handle ping message', () => {
        const mockClient = {
            id: 'test-client-id',
            emit: jest.fn(),
        } as any;

        gateway.handlePing(mockClient);

        expect(mockClient.emit).toHaveBeenCalledWith('pong', {
            timestamp: expect.any(String),
        });
    });

    it('should handle join room', () => {
        const mockClient = {
            id: 'test-client-id',
            join: jest.fn(),
            to: jest.fn().mockReturnValue({
                emit: jest.fn(),
            }),
        } as any;

        const roomData = { room: 'test-room' };
        gateway.handleJoinRoom(roomData, mockClient);

        expect(mockClient.join).toHaveBeenCalledWith('test-room');
    });

    it('should handle leave room', () => {
        const mockClient = {
            id: 'test-client-id',
            leave: jest.fn(),
            to: jest.fn().mockReturnValue({
                emit: jest.fn(),
            }),
        } as any;

        const roomData = { room: 'test-room' };
        gateway.handleLeaveRoom(roomData, mockClient);

        expect(mockClient.leave).toHaveBeenCalledWith('test-room');
    });

    it('should broadcast to room', () => {
        const mockServer = {
            to: jest.fn().mockReturnValue({
                emit: jest.fn(),
            }),
        } as any;

        gateway.server = mockServer;

        const testData = { message: 'test' };
        gateway.broadcastToRoom('test-room', 'test-event', testData);

        expect(mockServer.to).toHaveBeenCalledWith('test-room');
    });

    it('should broadcast to client', () => {
        const mockServer = {
            to: jest.fn().mockReturnValue({
                emit: jest.fn(),
            }),
        } as any;

        gateway.server = mockServer;

        const testData = { message: 'test' };
        gateway.broadcastToClient('client-id', 'test-event', testData);

        expect(mockServer.to).toHaveBeenCalledWith('client-id');
    });
}); 