import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateTaskDto,
  QueryTasksDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dto';
import { TasksService } from './tasks.service';
import { TaskStateTransitions } from './utils/task-state-transitions';

// Mock the TaskStateTransitions utility
jest.mock('./utils/task-state-transitions');
const mockTaskStateTransitions = TaskStateTransitions as jest.Mocked<
  typeof TaskStateTransitions
>;

describe('TasksService', () => {
  let service: TasksService;
  let prismaService: any;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockList = {
    id: 'test-list-id',
    name: 'Test List',
    userId: mockUser.id,
    shares: [],
  };

  const mockTask = {
    id: 'test-task-id',
    title: 'Test Task',
    description: 'Test task description',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: null,
    listId: mockList.id,
    assignedUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    list: {
      id: mockList.id,
      name: mockList.name,
      color: '#3B82F6',
    },
    assignedUser: null,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      task: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      list: {
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prismaService = module.get(PrismaService);

    // Setup default mocks for TaskStateTransitions
    mockTaskStateTransitions.isValidTransition.mockReturnValue(true);
    mockTaskStateTransitions.getValidTransitions.mockReturnValue([
      'IN_PROGRESS',
      'DONE',
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createTaskDto: CreateTaskDto = {
      title: 'New Task',
      description: 'New task description',
      priority: 'HIGH',
      listId: mockList.id,
    };

    it('should create a task successfully', async () => {
      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.task.create.mockResolvedValue(mockTask);

      const result = await service.create(createTaskDto, mockUser.id);

      expect(prismaService.list.findFirst).toHaveBeenCalledWith({
        where: {
          id: createTaskDto.listId,
          OR: [
            { userId: mockUser.id },
            {
              shares: {
                some: {
                  userId: mockUser.id,
                  permissionLevel: { in: ['EDITOR', 'OWNER'] },
                },
              },
            },
          ],
        },
      });

      expect(prismaService.task.create).toHaveBeenCalledWith({
        data: {
          title: createTaskDto.title,
          description: createTaskDto.description,
          priority: createTaskDto.priority,
          dueDate: null,
          listId: createTaskDto.listId,
          assignedUserId: undefined,
          status: 'TODO',
        },
        include: {
          list: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      expect(result).toEqual(mockTask);
    });

    it('should create a task with assigned user', async () => {
      const createTaskDtoWithAssignee = {
        ...createTaskDto,
        assignedUserId: 'assigned-user-id',
      };

      const assignedUser = {
        id: 'assigned-user-id',
        email: 'assigned@example.com',
        name: 'Assigned User',
      };

      prismaService.list.findFirst
        .mockResolvedValueOnce(mockList) // First call - check list access for creator
        .mockResolvedValueOnce(mockList); // Second call - check list access for assignee
      prismaService.user.findUnique.mockResolvedValue(assignedUser);
      prismaService.task.create.mockResolvedValue({
        ...mockTask,
        assignedUserId: assignedUser.id,
        assignedUser: assignedUser,
      });

      const result = await service.create(
        createTaskDtoWithAssignee,
        mockUser.id,
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: createTaskDtoWithAssignee.assignedUserId },
      });

      expect(result.assignedUserId).toBe(assignedUser.id);
    });

    it('should throw error if list not found or no permission', async () => {
      prismaService.list.findFirst.mockResolvedValue(null);

      await expect(service.create(createTaskDto, mockUser.id)).rejects.toThrow(
        'List not found or you do not have permission to add tasks to this list',
      );
    });

    it('should throw error if assigned user not found', async () => {
      const createTaskDtoWithInvalidAssignee = {
        ...createTaskDto,
        assignedUserId: 'invalid-user-id',
      };

      prismaService.list.findFirst.mockResolvedValue(mockList);
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createTaskDtoWithInvalidAssignee, mockUser.id),
      ).rejects.toThrow('Assigned user not found');
    });
  });

  describe('findAll', () => {
    const queryDto: QueryTasksDto = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    it('should return paginated tasks', async () => {
      const mockTasks = [mockTask];
      const mockTotal = 1;

      prismaService.task.findMany.mockResolvedValue(mockTasks);
      prismaService.task.count.mockResolvedValue(mockTotal);

      const result = await service.findAll(queryDto, mockUser.id);

      expect(prismaService.task.findMany).toHaveBeenCalledWith({
        where: {
          list: {
            OR: [
              { userId: mockUser.id },
              { shares: { some: { userId: mockUser.id } } },
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });

      expect(result).toEqual({
        data: mockTasks,
        pagination: {
          page: 1,
          limit: 10,
          total: mockTotal,
          totalPages: 1,
        },
      });
    });

    it('should filter tasks by status', async () => {
      const queryWithStatus = { ...queryDto, status: 'DONE' as const };

      prismaService.task.findMany.mockResolvedValue([]);
      prismaService.task.count.mockResolvedValue(0);

      await service.findAll(queryWithStatus, mockUser.id);

      expect(prismaService.task.findMany).toHaveBeenCalledWith({
        where: {
          status: 'DONE',
          list: {
            OR: [
              { userId: mockUser.id },
              { shares: { some: { userId: mockUser.id } } },
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should search tasks by title and description', async () => {
      const queryWithSearch = { ...queryDto, search: 'test search' };

      prismaService.task.findMany.mockResolvedValue([]);
      prismaService.task.count.mockResolvedValue(0);

      await service.findAll(queryWithSearch, mockUser.id);

      expect(prismaService.task.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: 'test search', mode: 'insensitive' } },
            { description: { contains: 'test search', mode: 'insensitive' } },
          ],
          list: {
            OR: [
              { userId: mockUser.id },
              { shares: { some: { userId: mockUser.id } } },
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('update', () => {
    const updateTaskDto: UpdateTaskDto = {
      title: 'Updated Task',
      description: 'Updated description',
      status: 'IN_PROGRESS',
    };

    it('should update task successfully for owner', async () => {
      const taskWithList = {
        ...mockTask,
        list: {
          ...mockList,
          shares: [],
        },
      };

      const updatedTask = {
        ...mockTask,
        ...updateTaskDto,
      };

      prismaService.task.findUnique.mockResolvedValue(taskWithList);
      prismaService.task.update.mockResolvedValue(updatedTask);

      const result = await service.update(
        mockTask.id,
        updateTaskDto,
        mockUser.id,
      );

      expect(prismaService.task.findUnique).toHaveBeenCalledWith({
        where: { id: mockTask.id },
        include: {
          list: {
            include: {
              shares: {
                where: { userId: mockUser.id },
              },
            },
          },
        },
      });

      expect(result).toEqual(updatedTask);
    });

    it('should throw error if task not found', async () => {
      prismaService.task.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateTaskDto, mockUser.id),
      ).rejects.toThrow('Task not found');
    });

    it('should throw error if user has no permission', async () => {
      const taskWithDifferentOwner = {
        ...mockTask,
        assignedUserId: null,
        list: {
          ...mockList,
          userId: 'other-user-id',
          shares: [], // No shared access
        },
      };

      prismaService.task.findUnique.mockResolvedValue(taskWithDifferentOwner);

      await expect(
        service.update(mockTask.id, updateTaskDto, mockUser.id),
      ).rejects.toThrow('You do not have permission to update this task');
    });
  });

  describe('remove', () => {
    it('should delete task successfully for owner', async () => {
      const taskWithList = {
        ...mockTask,
        list: {
          ...mockList,
          shares: [],
        },
      };

      prismaService.task.findUnique.mockResolvedValue(taskWithList);
      prismaService.task.delete.mockResolvedValue(mockTask);

      const result = await service.remove(mockTask.id, mockUser.id);

      expect(prismaService.task.delete).toHaveBeenCalledWith({
        where: { id: mockTask.id },
      });

      expect(result).toEqual({
        message: 'Task deleted successfully',
        deletedTask: {
          id: mockTask.id,
          title: mockTask.title,
          listId: mockTask.listId,
        },
      });
    });

    it('should throw error if task not found', async () => {
      prismaService.task.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('non-existent-id', mockUser.id),
      ).rejects.toThrow('Task not found');
    });
  });

  describe('updateStatus', () => {
    const updateStatusDto: UpdateTaskStatusDto = {
      status: 'IN_PROGRESS',
    };

    it('should update task status successfully', async () => {
      const taskWithList = {
        ...mockTask,
        list: {
          ...mockList,
          shares: [],
        },
      };

      const updatedTask = {
        ...mockTask,
        status: 'IN_PROGRESS',
      };

      prismaService.task.findUnique.mockResolvedValue(taskWithList);
      prismaService.task.update.mockResolvedValue(updatedTask);
      mockTaskStateTransitions.isValidTransition.mockReturnValue(true);
      mockTaskStateTransitions.getValidTransitions.mockReturnValue([
        'REVIEW',
        'DONE',
      ]);

      const result = await service.updateStatus(
        mockTask.id,
        updateStatusDto,
        mockUser.id,
      );

      expect(mockTaskStateTransitions.isValidTransition).toHaveBeenCalledWith(
        mockTask.status,
        updateStatusDto.status,
      );

      expect(prismaService.task.update).toHaveBeenCalledWith({
        where: { id: mockTask.id },
        data: {
          status: updateStatusDto.status,
          updatedAt: expect.any(Date),
        },
        include: {
          list: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      expect(result).toEqual({
        message: `Task status successfully updated from ${mockTask.status} to ${updateStatusDto.status}`,
        task: updatedTask,
        previousStatus: mockTask.status,
        newStatus: updateStatusDto.status,
        validNextStatuses: ['REVIEW', 'DONE'],
      });
    });

    it('should throw error for invalid status transition', async () => {
      const taskWithList = {
        ...mockTask,
        list: {
          ...mockList,
          shares: [],
        },
      };

      prismaService.task.findUnique.mockResolvedValue(taskWithList);
      mockTaskStateTransitions.isValidTransition.mockReturnValue(false);
      mockTaskStateTransitions.getTransitionErrorMessage.mockReturnValue(
        'Invalid transition from TODO to DONE',
      );

      await expect(
        service.updateStatus(mockTask.id, { status: 'DONE' }, mockUser.id),
      ).rejects.toThrow('Invalid transition from TODO to DONE');
    });
  });
});
