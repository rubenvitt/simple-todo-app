import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../common/services/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { WebSocketsGateway } from './websockets.gateway';

describe.skip('WebSocketsGateway', () => {
    let gateway: WebSocketsGateway;
    let tasksService: jest.Mocked<TasksService>;
    let usersService: jest.Mocked<UsersService>;
    let prismaService: any;

    const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockList = {
        id: 'list-id-123',
        name: 'Test List',
        userId: 'user-id-123',
    };

    const mockTask = {
        id: 'task-id-123',
        title: 'Test Task',
        description: 'Test Description',
        status: 'TODO' as any,
        priority: 'MEDIUM' as any,
        listId: 'list-id-123',
        assignedUserId: null,
        dueDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        list: {
            id: 'list-id-123',
            name: 'Test List',
            color: '#000000'
        },
        assignedUser: null
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WebSocketsGateway,
                {
                    provide: JwtService,
                    useValue: {
                        verify: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
                {
                    provide: PrismaService,
                    useValue: {
                        user: {
                            findUnique: jest.fn(),
                        },
                        list: {
                            findFirst: jest.fn(),
                            findUnique: jest.fn(),
                        },
                        task: {
                            findUnique: jest.fn(),
                        },
                    },
                },
                {
                    provide: TasksService,
                    useValue: {
                        create: jest.fn(),
                        update: jest.fn(),
                        remove: jest.fn(),
                        updateStatus: jest.fn(),
                        assignTask: jest.fn(),
                        unassignTask: jest.fn(),
                    },
                },
                {
                    provide: UsersService,
                    useValue: {
                        updateProfile: jest.fn(),
                    },
                },
            ],
        }).compile();

        gateway = module.get<WebSocketsGateway>(WebSocketsGateway);
        tasksService = module.get(TasksService);
        usersService = module.get(UsersService);
        prismaService = module.get(PrismaService);

        // Setup mock server
        gateway.server = {
            to: jest.fn().mockReturnValue({
                emit: jest.fn(),
            }),
            sockets: {
                sockets: new Map(),
            },
        } as any;
    });

    afterEach(() => {
        // Clean up any intervals that might be running
        if ((gateway as any).cleanupInterval) {
            clearInterval((gateway as any).cleanupInterval);
        }
        jest.clearAllMocks();
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
            user: mockUser,
            emit: jest.fn(),
        } as any;

        gateway.handlePing(mockClient);

        expect(mockClient.emit).toHaveBeenCalledWith('pong', {
            timestamp: expect.any(String),
            userId: mockUser.id,
        });
    });

    it('should handle join room (legacy)', () => {
        const mockClient = {
            id: 'test-client-id',
            user: mockUser,
            join: jest.fn(),
            emit: jest.fn(),
            to: jest.fn().mockReturnValue({
                emit: jest.fn(),
            }),
        } as any;

        const roomData = { room: 'test-room' };
        gateway.handleJoinRoom(roomData, mockClient);

        expect(mockClient.join).toHaveBeenCalledWith('test-room');
        expect(mockClient.emit).toHaveBeenCalledWith('room-joined', {
            room: 'test-room',
            timestamp: expect.any(String),
        });
    });

    it('should handle leave room (legacy)', () => {
        const mockClient = {
            id: 'test-client-id',
            user: mockUser,
            leave: jest.fn(),
            emit: jest.fn(),
            to: jest.fn().mockReturnValue({
                emit: jest.fn(),
            }),
        } as any;

        const roomData = { room: 'test-room' };
        gateway.handleLeaveRoom(roomData, mockClient);

        expect(mockClient.leave).toHaveBeenCalledWith('test-room');
        expect(mockClient.emit).toHaveBeenCalledWith('room-left', {
            room: 'test-room',
            timestamp: expect.any(String),
        });
    });

    describe('List Room Management', () => {
        it('should successfully join list room with valid access', async () => {
            // Mock list access validation to return true
            prismaService.list.findFirst.mockResolvedValue(mockList);

            const mockClient = {
                id: 'test-client-id',
                user: mockUser,
                join: jest.fn(),
                emit: jest.fn(),
                to: jest.fn().mockReturnValue({
                    emit: jest.fn(),
                }),
            } as any;

            const roomData = { listId: 'list-id-123' };
            await gateway.handleJoinListRoom(roomData, mockClient);

            expect(prismaService.list.findFirst).toHaveBeenCalledWith({
                where: {
                    id: 'list-id-123',
                    OR: [
                        { userId: mockUser.id },
                        { shares: { some: { userId: mockUser.id } } },
                    ],
                },
            });
            expect(mockClient.join).toHaveBeenCalledWith('list-list-id-123');
            expect(mockClient.emit).toHaveBeenCalledWith('list-room-joined', {
                listId: 'list-id-123',
                roomName: 'list-list-id-123',
                memberCount: 1,
                timestamp: expect.any(String),
            });
        });

        it('should reject list room join without access', async () => {
            // Mock list access validation to return null (no access)
            prismaService.list.findFirst.mockResolvedValue(null);

            const mockClient = {
                id: 'test-client-id',
                user: mockUser,
                join: jest.fn(),
                emit: jest.fn(),
            } as any;

            const roomData = { listId: 'list-id-123' };
            await gateway.handleJoinListRoom(roomData, mockClient);

            expect(mockClient.join).not.toHaveBeenCalled();
            expect(mockClient.emit).toHaveBeenCalledWith('error', {
                message: 'Access denied: You do not have permission to access this list',
                listId: 'list-id-123',
            });
        });

        it('should handle leave list room successfully', async () => {
            const mockClient = {
                id: 'test-client-id',
                user: mockUser,
                leave: jest.fn(),
                emit: jest.fn(),
                to: jest.fn().mockReturnValue({
                    emit: jest.fn(),
                }),
            } as any;

            const roomData = { listId: 'list-id-123' };
            await gateway.handleLeaveListRoom(roomData, mockClient);

            expect(mockClient.leave).toHaveBeenCalledWith('list-list-id-123');
            expect(mockClient.emit).toHaveBeenCalledWith('list-room-left', {
                listId: 'list-id-123',
                roomName: 'list-list-id-123',
                timestamp: expect.any(String),
            });
        });

        it('should reject list room operations without authentication', async () => {
            const mockClient = {
                id: 'test-client-id',
                user: undefined,
                emit: jest.fn(),
                join: jest.fn(),
                leave: jest.fn(),
            } as any;

            const roomData = { listId: 'list-id-123' };

            // Test join list room without auth
            await gateway.handleJoinListRoom(roomData, mockClient);
            expect(mockClient.emit).toHaveBeenCalledWith('error', { message: 'Authentication required' });
            expect(mockClient.join).not.toHaveBeenCalled();

            // Reset mock
            mockClient.emit.mockClear();

            // Test leave list room without auth
            await gateway.handleLeaveListRoom(roomData, mockClient);
            expect(mockClient.emit).toHaveBeenCalledWith('error', { message: 'Authentication required' });
            expect(mockClient.leave).not.toHaveBeenCalled();
        });

        it('should get room members with valid access', async () => {
            // Mock list access validation
            prismaService.list.findFirst.mockResolvedValue(mockList);

            const mockClient = {
                id: 'test-client-id',
                user: mockUser,
                emit: jest.fn(),
            } as any;

            const roomData = { listId: 'list-id-123' };
            await gateway.handleGetRoomMembers(roomData, mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('room-members', {
                listId: 'list-id-123',
                members: [],
                memberCount: 0,
                timestamp: expect.any(String),
            });
        });

        it('should reject room members request without access', async () => {
            // Mock list access validation to return null
            prismaService.list.findFirst.mockResolvedValue(null);

            const mockClient = {
                id: 'test-client-id',
                user: mockUser,
                emit: jest.fn(),
            } as any;

            const roomData = { listId: 'list-id-123' };
            await gateway.handleGetRoomMembers(roomData, mockClient);

            expect(mockClient.emit).toHaveBeenCalledWith('error', {
                message: 'Access denied: You do not have permission to access this list',
                listId: 'list-id-123',
            });
        });
    });

    describe('Room Cleanup and Management', () => {
        it('should add and remove clients from room tracking', async () => {
            // Mock list access validation
            prismaService.list.findFirst.mockResolvedValue(mockList);

            const mockClient = {
                id: 'test-client-id',
                user: mockUser,
                join: jest.fn(),
                leave: jest.fn(),
                emit: jest.fn(),
                to: jest.fn().mockReturnValue({ emit: jest.fn() }),
            } as any;

            // Join room
            await gateway.handleJoinListRoom({ listId: 'list-id-123' }, mockClient);

            // Check if room was created in internal tracking
            const rooms = (gateway as any).rooms;
            expect(rooms.has('list-list-id-123')).toBe(true);

            const roomData = rooms.get('list-list-id-123');
            expect(roomData.members.has('test-client-id')).toBe(true);
            expect(roomData.listId).toBe('list-id-123');

            // Leave room
            await gateway.handleLeaveListRoom({ listId: 'list-id-123' }, mockClient);

            // Check if room was cleaned up (empty room should be removed)
            expect(rooms.has('list-list-id-123')).toBe(false);
        });

        it('should cleanup client from all rooms on disconnect', () => {
            const mockClient = {
                id: 'test-client-id',
                user: mockUser,
            } as any;

            // Manually add client to rooms tracking
            const rooms = (gateway as any).rooms;
            rooms.set('list-room1', {
                listId: 'list1',
                members: new Map([['test-client-id', { userId: mockUser.id, userName: mockUser.name, userEmail: mockUser.email, joinedAt: new Date() }]]),
                createdAt: new Date(),
                lastActivity: new Date(),
            });
            rooms.set('list-room2', {
                listId: 'list2',
                members: new Map([['test-client-id', { userId: mockUser.id, userName: mockUser.name, userEmail: mockUser.email, joinedAt: new Date() }]]),
                createdAt: new Date(),
                lastActivity: new Date(),
            });

            // Simulate disconnect
            gateway.handleDisconnect(mockClient);

            // Check that rooms are cleaned up (should be empty and removed)
            expect(rooms.has('list-room1')).toBe(false);
            expect(rooms.has('list-room2')).toBe(false);
        });

        it('should start and stop room cleanup interval', () => {
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            const setIntervalSpy = jest.spyOn(global, 'setInterval');

            // Initialize gateway (should start cleanup)
            gateway.afterInit({} as any);
            expect(setIntervalSpy).toHaveBeenCalled();

            // Destroy module (should stop cleanup)
            gateway.onModuleDestroy();
            expect(clearIntervalSpy).toHaveBeenCalled();

            clearIntervalSpy.mockRestore();
            setIntervalSpy.mockRestore();
        });
    });

    describe('Enhanced Broadcasting Methods', () => {
        it('should broadcast to list room', async () => {
            const mockServer = {
                to: jest.fn().mockReturnValue({
                    emit: jest.fn(),
                }),
            } as any;
            gateway.server = mockServer;

            const testData = { message: 'test broadcast' };
            await gateway.broadcastToListRoom('list-id-123', 'test-event', testData);

            expect(mockServer.to).toHaveBeenCalledWith('list-list-id-123');
        });

        it('should broadcast to authorized list members', async () => {
            // Mock authorized users query
            prismaService.list.findUnique.mockResolvedValue({
                owner: { id: 'owner-id', email: 'owner@test.com', name: 'Owner' },
                shares: [
                    { user: { id: 'shared-user-id', email: 'shared@test.com', name: 'Shared User' } }
                ],
            });

            const ownerSocket = {
                user: { id: 'owner-id', email: 'owner@test.com', name: 'Owner' },
                emit: jest.fn(),
            };

            const sharedSocket = {
                user: { id: 'shared-user-id', email: 'shared@test.com', name: 'Shared User' },
                emit: jest.fn(),
            };

            const unauthorizedSocket = {
                user: { id: 'unauthorized-id', email: 'unauthorized@test.com', name: 'Unauthorized' },
                emit: jest.fn(),
            };

            const mockSockets = new Map();
            mockSockets.set('owner-socket', ownerSocket);
            mockSockets.set('shared-socket', sharedSocket);
            mockSockets.set('unauthorized-socket', unauthorizedSocket);

            gateway.server = {
                sockets: { sockets: mockSockets },
            } as any;

            const testData = { message: 'authorized broadcast' };
            await gateway.broadcastToAuthorizedListMembers('list-id-123', 'test-event', testData);

            expect(ownerSocket.emit).toHaveBeenCalledWith('test-event', {
                message: 'authorized broadcast',
                listId: 'list-id-123',
                timestamp: expect.any(String),
            });

            expect(sharedSocket.emit).toHaveBeenCalledWith('test-event', {
                message: 'authorized broadcast',
                listId: 'list-id-123',
                timestamp: expect.any(String),
            });

            expect(unauthorizedSocket.emit).not.toHaveBeenCalled();
        });
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

    it('should reject room operations without authentication', () => {
        const mockClient = {
            id: 'test-client-id',
            user: undefined, // No user attached
            emit: jest.fn(),
            join: jest.fn(),
            leave: jest.fn(),
        } as any;

        const roomData = { room: 'test-room' };

        // Test join room without auth
        gateway.handleJoinRoom(roomData, mockClient);
        expect(mockClient.emit).toHaveBeenCalledWith('error', { message: 'Authentication required' });
        expect(mockClient.join).not.toHaveBeenCalled();

        // Reset mock
        mockClient.emit.mockClear();

        // Test leave room without auth
        gateway.handleLeaveRoom(roomData, mockClient);
        expect(mockClient.emit).toHaveBeenCalledWith('error', { message: 'Authentication required' });
        expect(mockClient.leave).not.toHaveBeenCalled();
    });

    it('should handle connection with authenticated user', async () => {
        const mockClient = {
            id: 'test-client-id',
            user: mockUser,
            emit: jest.fn(),
            disconnect: jest.fn(),
        } as any;

        await gateway.handleConnection(mockClient);

        expect(mockClient.emit).toHaveBeenCalledWith('connection-established', {
            message: 'Successfully connected to WebSocket',
            user: {
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
            },
            timestamp: expect.any(String),
        });
        expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect client without user', async () => {
        const mockClient = {
            id: 'test-client-id',
            user: undefined,
            emit: jest.fn(),
            disconnect: jest.fn(),
        } as any;

        await gateway.handleConnection(mockClient);

        expect(mockClient.disconnect).toHaveBeenCalled();
        expect(mockClient.emit).not.toHaveBeenCalled();
    });

    it('should broadcast to authenticated users only', () => {
        const authenticatedSocket = {
            user: { id: 'user1', email: 'user1@test.com', name: 'User 1' },
            emit: jest.fn(),
        };

        const unauthenticatedSocket = {
            user: undefined,
            emit: jest.fn(),
        };

        const mockSockets = new Map();
        mockSockets.set('socket1', authenticatedSocket);
        mockSockets.set('socket2', unauthenticatedSocket);

        const mockServer = {
            sockets: {
                sockets: mockSockets,
            },
        } as any;

        gateway.server = mockServer;

        const testData = { message: 'test broadcast' };
        gateway.broadcastToAuthenticatedUsers('test-event', testData);

        expect(authenticatedSocket.emit).toHaveBeenCalledWith('test-event', {
            message: 'test broadcast',
            timestamp: expect.any(String),
        });
        expect(unauthenticatedSocket.emit).not.toHaveBeenCalled();
    });

    describe('Task Event Handlers', () => {
        const mockClient = {
            id: 'test-client-id',
            user: mockUser,
            emit: jest.fn(),
        } as any;

        beforeEach(() => {
            mockClient.emit.mockClear();
        });

        describe('handleTaskCreate', () => {
            it('should successfully create a task', async () => {
                const createTaskDto = {
                    title: 'New Task',
                    description: 'Task description',
                    listId: 'list-id-123',
                    priority: 'HIGH' as any,
                };

                tasksService.create.mockResolvedValue(mockTask);

                // Setup broadcast mock
                const broadcastSpy = jest.spyOn(gateway, 'broadcastToListRoom').mockImplementation();

                await gateway.handleTaskCreate(createTaskDto, mockClient);

                expect(tasksService.create).toHaveBeenCalledWith(createTaskDto, mockUser.id);
                expect(mockClient.emit).toHaveBeenCalledWith('task-created', {
                    message: 'Task created successfully',
                    task: mockTask,
                    timestamp: expect.any(String),
                });
                expect(broadcastSpy).toHaveBeenCalledWith('list-id-123', 'task-created', {
                    task: mockTask,
                    createdBy: {
                        id: mockUser.id,
                        name: mockUser.name,
                        email: mockUser.email,
                    },
                });
            });

            it('should handle task creation error', async () => {
                const createTaskDto = {
                    title: 'New Task',
                    description: 'Task description',
                    listId: 'list-id-123',
                };

                tasksService.create.mockRejectedValue(new Error('Creation failed'));

                await gateway.handleTaskCreate(createTaskDto, mockClient);

                expect(mockClient.emit).toHaveBeenCalledWith('error', {
                    message: 'Creation failed',
                });
            });

            it('should reject unauthenticated task creation', async () => {
                const unauthClient = { ...mockClient, user: undefined };
                const createTaskDto = { title: 'New Task', listId: 'list-id-123' };

                await gateway.handleTaskCreate(createTaskDto, unauthClient);

                expect(unauthClient.emit).toHaveBeenCalledWith('error', { message: 'Authentication required' });
                expect(tasksService.create).not.toHaveBeenCalled();
            });
        });

        describe('handleTaskUpdate', () => {
            it('should successfully update a task', async () => {
                const updateData = { title: 'Updated Task' };
                const requestData = { taskId: 'task-id-123', updateData };

                tasksService.update.mockResolvedValue(mockTask);
                const broadcastSpy = jest.spyOn(gateway, 'broadcastToListRoom').mockImplementation();

                await gateway.handleTaskUpdate(requestData, mockClient);

                expect(tasksService.update).toHaveBeenCalledWith('task-id-123', updateData, mockUser.id);
                expect(mockClient.emit).toHaveBeenCalledWith('task-updated', {
                    message: 'Task updated successfully',
                    task: mockTask,
                    timestamp: expect.any(String),
                });
                expect(broadcastSpy).toHaveBeenCalledWith('list-id-123', 'task-updated', {
                    task: mockTask,
                    updatedBy: {
                        id: mockUser.id,
                        name: mockUser.name,
                        email: mockUser.email,
                    },
                });
            });
        });

        describe('handleTaskDelete', () => {
            it('should successfully delete a task', async () => {
                const requestData = { taskId: 'task-id-123' };
                const deletionResult = {
                    message: 'Task deleted successfully',
                    deletedTask: { id: 'task-id-123', title: 'Test Task', listId: 'list-id-123' }
                };

                prismaService.task.findUnique.mockResolvedValue({
                    id: 'task-id-123',
                    title: 'Test Task',
                    listId: 'list-id-123'
                });
                tasksService.remove.mockResolvedValue(deletionResult);
                const broadcastSpy = jest.spyOn(gateway, 'broadcastToListRoom').mockImplementation();

                await gateway.handleTaskDelete(requestData, mockClient);

                expect(tasksService.remove).toHaveBeenCalledWith('task-id-123', mockUser.id);
                expect(mockClient.emit).toHaveBeenCalledWith('task-deleted', {
                    message: 'Task deleted successfully',
                    deletedTask: deletionResult.deletedTask,
                    timestamp: expect.any(String),
                });
                expect(broadcastSpy).toHaveBeenCalled();
            });

            it('should handle task not found', async () => {
                const requestData = { taskId: 'nonexistent-task' };

                prismaService.task.findUnique.mockResolvedValue(null);

                await gateway.handleTaskDelete(requestData, mockClient);

                expect(mockClient.emit).toHaveBeenCalledWith('error', {
                    message: 'Task not found',
                    taskId: 'nonexistent-task'
                });
                expect(tasksService.remove).not.toHaveBeenCalled();
            });
        });

        describe('handleTaskStatusUpdate', () => {
            it('should successfully update task status', async () => {
                const requestData = { taskId: 'task-id-123', status: { status: 'IN_PROGRESS' as any } };
                const statusUpdateResult = {
                    message: 'Status updated',
                    task: mockTask,
                    previousStatus: 'TODO' as any,
                    newStatus: 'IN_PROGRESS' as any,
                    validNextStatuses: ['DONE', 'TODO'] as any[]
                };

                tasksService.updateStatus.mockResolvedValue(statusUpdateResult);
                const broadcastSpy = jest.spyOn(gateway, 'broadcastToListRoom').mockImplementation();

                await gateway.handleTaskStatusUpdate(requestData, mockClient);

                expect(tasksService.updateStatus).toHaveBeenCalledWith('task-id-123', { status: 'IN_PROGRESS' as any }, mockUser.id);
                expect(mockClient.emit).toHaveBeenCalledWith('task-status-updated', {
                    message: statusUpdateResult.message,
                    task: mockTask,
                    previousStatus: 'TODO' as any,
                    newStatus: 'IN_PROGRESS' as any,
                    validNextStatuses: ['DONE', 'TODO'] as any[],
                    timestamp: expect.any(String),
                });
                expect(broadcastSpy).toHaveBeenCalled();
            });
        });

        describe('handleTaskAssign', () => {
            it('should successfully assign a task', async () => {
                const requestData = { taskId: 'task-id-123', assignedUserId: 'assigned-user-id' };
                const assignmentResult = {
                    message: 'Task assigned',
                    task: { ...mockTask, assignedUser: { id: 'assigned-user-id', name: 'Assigned User', email: 'assigned@test.com' } }
                };

                tasksService.assignTask.mockResolvedValue(assignmentResult);
                const broadcastSpy = jest.spyOn(gateway, 'broadcastToListRoom').mockImplementation();

                await gateway.handleTaskAssign(requestData, mockClient);

                expect(tasksService.assignTask).toHaveBeenCalledWith('task-id-123', { assignedUserId: 'assigned-user-id' }, mockUser.id);
                expect(mockClient.emit).toHaveBeenCalledWith('task-assigned', {
                    message: assignmentResult.message,
                    task: assignmentResult.task,
                    timestamp: expect.any(String),
                });
                expect(broadcastSpy).toHaveBeenCalled();
            });
        });

        describe('handleTaskUnassign', () => {
            it('should successfully unassign a task', async () => {
                const requestData = { taskId: 'task-id-123' };
                const taskWithAssignment = {
                    id: 'task-id-123',
                    title: 'Test Task',
                    assignedUser: { id: 'assigned-user-id', name: 'Assigned User', email: 'assigned@test.com' },
                    list: { id: 'list-id-123', name: 'Test List' }
                };
                const unassignmentResult = {
                    message: 'Task unassigned',
                    task: mockTask,
                    previousAssignee: { id: 'assigned-user-id', name: 'Assigned User', email: 'assigned@test.com' }
                };

                prismaService.task.findUnique.mockResolvedValue(taskWithAssignment);
                tasksService.unassignTask.mockResolvedValue(unassignmentResult);
                const broadcastSpy = jest.spyOn(gateway, 'broadcastToListRoom').mockImplementation();

                await gateway.handleTaskUnassign(requestData, mockClient);

                expect(tasksService.unassignTask).toHaveBeenCalledWith('task-id-123', mockUser.id);
                expect(mockClient.emit).toHaveBeenCalledWith('task-unassigned', {
                    message: unassignmentResult.message,
                    task: mockTask,
                    timestamp: expect.any(String),
                });
                expect(broadcastSpy).toHaveBeenCalled();
            });
        });
    });

    describe('User Event Handlers', () => {
        const mockClient = {
            id: 'test-client-id',
            user: { ...mockUser },
            emit: jest.fn(),
        } as any;

        beforeEach(() => {
            mockClient.emit.mockClear();
            mockClient.user = { ...mockUser }; // Reset user object
        });

        describe('handleUserProfileUpdate', () => {
            it('should successfully update user profile', async () => {
                const updateData = { name: 'Updated Name', email: 'updated@test.com' };
                const updatedProfile = {
                    id: mockUser.id,
                    name: 'Updated Name',
                    email: 'updated@test.com',
                    createdAt: mockUser.createdAt,
                    updatedAt: new Date(),
                };

                usersService.updateProfile.mockResolvedValue(updatedProfile);
                const broadcastSpy = jest.spyOn(gateway, 'broadcastToAuthenticatedUsers').mockImplementation();

                await gateway.handleUserProfileUpdate(updateData, mockClient);

                expect(usersService.updateProfile).toHaveBeenCalledWith(mockUser.id, updateData);
                expect(mockClient.emit).toHaveBeenCalledWith('user-profile-updated', {
                    message: 'Profile updated successfully',
                    profile: updatedProfile,
                    timestamp: expect.any(String),
                });
                expect(broadcastSpy).toHaveBeenCalledWith('user-profile-changed', {
                    userId: mockUser.id,
                    profile: {
                        id: updatedProfile.id,
                        name: updatedProfile.name,
                        email: updatedProfile.email,
                    },
                });

                // Check that socket user info was updated
                expect(mockClient.user.name).toBe('Updated Name');
                expect(mockClient.user.email).toBe('updated@test.com');
            });

            it('should handle profile update error', async () => {
                const updateData = { name: 'Updated Name' };

                usersService.updateProfile.mockRejectedValue(new Error('Update failed'));

                await gateway.handleUserProfileUpdate(updateData, mockClient);

                expect(mockClient.emit).toHaveBeenCalledWith('error', {
                    message: 'Update failed',
                });
            });

            it('should reject unauthenticated profile update', async () => {
                const unauthClient = { ...mockClient, user: undefined };
                const updateData = { name: 'Updated Name' };

                await gateway.handleUserProfileUpdate(updateData, unauthClient);

                expect(unauthClient.emit).toHaveBeenCalledWith('error', { message: 'Authentication required' });
                expect(usersService.updateProfile).not.toHaveBeenCalled();
            });
        });

        describe('handleUserStatusChange', () => {
            it('should successfully change user status', async () => {
                const statusData = { status: 'busy', message: 'In a meeting' };
                const broadcastSpy = jest.spyOn(gateway, 'broadcastToAuthenticatedUsers').mockImplementation();

                await gateway.handleUserStatusChange(statusData, mockClient);

                expect(mockClient.emit).toHaveBeenCalledWith('user-status-changed', {
                    message: 'Status updated successfully',
                    status: 'busy',
                    statusMessage: 'In a meeting',
                    timestamp: expect.any(String),
                });
                expect(broadcastSpy).toHaveBeenCalledWith('user-status-updated', {
                    userId: mockUser.id,
                    userName: mockUser.name,
                    status: 'busy',
                    statusMessage: 'In a meeting',
                });
            });

            it('should handle status change without message', async () => {
                const statusData = { status: 'available' };
                const broadcastSpy = jest.spyOn(gateway, 'broadcastToAuthenticatedUsers').mockImplementation();

                await gateway.handleUserStatusChange(statusData, mockClient);

                expect(mockClient.emit).toHaveBeenCalledWith('user-status-changed', {
                    message: 'Status updated successfully',
                    status: 'available',
                    statusMessage: undefined,
                    timestamp: expect.any(String),
                });
                expect(broadcastSpy).toHaveBeenCalledWith('user-status-updated', {
                    userId: mockUser.id,
                    userName: mockUser.name,
                    status: 'available',
                    statusMessage: undefined,
                });
            });

            it('should reject unauthenticated status change', async () => {
                const unauthClient = { ...mockClient, user: undefined };
                const statusData = { status: 'busy' };

                await gateway.handleUserStatusChange(statusData, unauthClient);

                expect(unauthClient.emit).toHaveBeenCalledWith('error', { message: 'Authentication required' });
            });
        });
    });
}); 