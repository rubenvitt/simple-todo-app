import { Test, TestingModule } from '@nestjs/testing';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: TasksService;

  const mockTasksService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateStatus: jest.fn(),
    bulkUpdateStatus: jest.fn(),
    assignTask: jest.fn(),
    unassignTask: jest.fn(),
    findTasksAssignedToMe: jest.fn(),
    findUnassignedTasks: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get<TasksService>(TasksService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have tasks service injected', () => {
    expect(tasksService).toBeDefined();
  });

  describe('findAll', () => {
    it('should call tasksService.findAll with query and user ID', async () => {
      const mockResult = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
      mockTasksService.findAll.mockResolvedValue(mockResult);

      const queryDto = { page: 1, limit: 10 };
      const req = { user: { sub: 'user-123' } };

      const result = await controller.findAll(queryDto as any, req);

      expect(tasksService.findAll).toHaveBeenCalledWith(queryDto, 'user-123');
      expect(result).toEqual(mockResult);
    });
  });

  describe('create', () => {
    const createTaskDto: CreateTaskDto = {
      title: 'New Task',
      description: 'Task Description',
      priority: 'MEDIUM',
      listId: 'list-1',
      assignedUserId: 'user-2',
    };

    const mockCreatedTask = {
      id: 'task-1',
      title: 'New Task',
      description: 'Task Description',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: null,
      listId: 'list-1',
      assignedUserId: 'user-2',
      createdAt: new Date(),
      updatedAt: new Date(),
      list: {
        id: 'list-1',
        name: 'Test List',
        color: '#3B82F6',
      },
      assignedUser: {
        id: 'user-2',
        name: 'Assigned User',
        email: 'assigned@example.com',
      },
    };

    it('should call tasksService.create with DTO and user ID', async () => {
      mockTasksService.create.mockResolvedValue(mockCreatedTask);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.create(createTaskDto, req);

      expect(tasksService.create).toHaveBeenCalledWith(
        createTaskDto,
        'user-123',
      );
      expect(result).toEqual(mockCreatedTask);
    });

    it('should handle task creation without assigned user', async () => {
      const createTaskDtoWithoutAssignee: CreateTaskDto = {
        ...createTaskDto,
        assignedUserId: undefined,
      };

      const mockCreatedTaskWithoutAssignee = {
        ...mockCreatedTask,
        assignedUserId: null,
        assignedUser: null,
      };

      mockTasksService.create.mockResolvedValue(mockCreatedTaskWithoutAssignee);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.create(createTaskDtoWithoutAssignee, req);

      expect(tasksService.create).toHaveBeenCalledWith(
        createTaskDtoWithoutAssignee,
        'user-123',
      );
      expect(result).toEqual(mockCreatedTaskWithoutAssignee);
    });

    it('should handle minimal task creation with only required fields', async () => {
      const minimalCreateTaskDto: CreateTaskDto = {
        title: 'Minimal Task',
        listId: 'list-1',
      };

      const mockMinimalCreatedTask = {
        id: 'task-2',
        title: 'Minimal Task',
        description: null,
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: null,
        listId: 'list-1',
        assignedUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        list: {
          id: 'list-1',
          name: 'Test List',
          color: '#3B82F6',
        },
        assignedUser: null,
      };

      mockTasksService.create.mockResolvedValue(mockMinimalCreatedTask);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.create(minimalCreateTaskDto, req);

      expect(tasksService.create).toHaveBeenCalledWith(
        minimalCreateTaskDto,
        'user-123',
      );
      expect(result).toEqual(mockMinimalCreatedTask);
    });
  });

  describe('update', () => {
    const updateTaskDto: UpdateTaskDto = {
      title: 'Updated Task',
      description: 'Updated Description',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    };

    const mockUpdatedTask = {
      id: 'task-1',
      title: 'Updated Task',
      description: 'Updated Description',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: null,
      listId: 'list-1',
      assignedUserId: 'user-2',
      createdAt: new Date(),
      updatedAt: new Date(),
      list: {
        id: 'list-1',
        name: 'Test List',
        color: '#3B82F6',
      },
      assignedUser: {
        id: 'user-2',
        name: 'Assigned User',
        email: 'assigned@example.com',
      },
    };

    it('should call tasksService.update with ID, DTO and user ID', async () => {
      mockTasksService.update.mockResolvedValue(mockUpdatedTask);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.update('task-1', updateTaskDto, req);

      expect(tasksService.update).toHaveBeenCalledWith(
        'task-1',
        updateTaskDto,
        'user-123',
      );
      expect(result).toEqual(mockUpdatedTask);
    });

    it('should handle partial updates', async () => {
      const partialUpdateDto: UpdateTaskDto = {
        status: 'DONE',
      };

      const mockPartiallyUpdatedTask = {
        ...mockUpdatedTask,
        status: 'DONE',
      };

      mockTasksService.update.mockResolvedValue(mockPartiallyUpdatedTask);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.update('task-1', partialUpdateDto, req);

      expect(tasksService.update).toHaveBeenCalledWith(
        'task-1',
        partialUpdateDto,
        'user-123',
      );
      expect(result).toEqual(mockPartiallyUpdatedTask);
    });

    it('should handle list change updates', async () => {
      const listChangeDto: UpdateTaskDto = {
        listId: 'list-2',
      };

      const mockTaskWithNewList = {
        ...mockUpdatedTask,
        listId: 'list-2',
        list: {
          id: 'list-2',
          name: 'New List',
          color: '#EF4444',
        },
      };

      mockTasksService.update.mockResolvedValue(mockTaskWithNewList);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.update('task-1', listChangeDto, req);

      expect(tasksService.update).toHaveBeenCalledWith(
        'task-1',
        listChangeDto,
        'user-123',
      );
      expect(result).toEqual(mockTaskWithNewList);
    });

    it('should handle assignee change updates', async () => {
      const assigneeChangeDto: UpdateTaskDto = {
        assignedUserId: 'user-3',
      };

      const mockTaskWithNewAssignee = {
        ...mockUpdatedTask,
        assignedUserId: 'user-3',
        assignedUser: {
          id: 'user-3',
          name: 'New Assignee',
          email: 'newassignee@example.com',
        },
      };

      mockTasksService.update.mockResolvedValue(mockTaskWithNewAssignee);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.update('task-1', assigneeChangeDto, req);

      expect(tasksService.update).toHaveBeenCalledWith(
        'task-1',
        assigneeChangeDto,
        'user-123',
      );
      expect(result).toEqual(mockTaskWithNewAssignee);
    });
  });

  describe('remove', () => {
    const mockDeleteResponse = {
      message: 'Task deleted successfully',
      deletedTask: {
        id: 'task-1',
        title: 'Deleted Task',
        listId: 'list-1',
      },
    };

    it('should call tasksService.remove with ID and user ID', async () => {
      mockTasksService.remove.mockResolvedValue(mockDeleteResponse);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.remove('task-1', req);

      expect(tasksService.remove).toHaveBeenCalledWith('task-1', 'user-123');
      expect(result).toEqual(mockDeleteResponse);
    });

    it('should handle deletion with proper response format', async () => {
      const customDeleteResponse = {
        message: 'Task deleted successfully',
        deletedTask: {
          id: 'task-2',
          title: 'Another Deleted Task',
          listId: 'list-2',
        },
      };

      mockTasksService.remove.mockResolvedValue(customDeleteResponse);

      const req = { user: { sub: 'user-456' } };
      const result = await controller.remove('task-2', req);

      expect(tasksService.remove).toHaveBeenCalledWith('task-2', 'user-456');
      expect(result).toEqual(customDeleteResponse);
      expect(result.message).toBe('Task deleted successfully');
      expect(result.deletedTask).toHaveProperty('id');
      expect(result.deletedTask).toHaveProperty('title');
      expect(result.deletedTask).toHaveProperty('listId');
    });

    it('should extract user ID from JWT token correctly', async () => {
      mockTasksService.remove.mockResolvedValue(mockDeleteResponse);

      const req = { user: { sub: 'jwt-user-789' } };
      await controller.remove('task-3', req);

      expect(tasksService.remove).toHaveBeenCalledWith(
        'task-3',
        'jwt-user-789',
      );
    });
  });

  describe('updateStatus', () => {
    const mockUpdatedTask = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Test Description',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      dueDate: null,
      listId: 'list-1',
      assignedUserId: 'user-2',
      createdAt: new Date(),
      updatedAt: new Date(),
      list: {
        id: 'list-1',
        name: 'Test List',
        color: '#3B82F6',
      },
      assignedUser: {
        id: 'user-2',
        name: 'Assigned User',
        email: 'assigned@example.com',
      },
    };

    it('should call updateStatus with correct parameters', async () => {
      const updateTaskStatusDto = { status: 'IN_PROGRESS' as any };
      const mockResponse = {
        message: 'Task status successfully updated from TODO to IN_PROGRESS',
        task: mockUpdatedTask,
        previousStatus: 'TODO',
        newStatus: 'IN_PROGRESS',
        validNextStatuses: ['BACKLOG', 'REVIEW', 'DONE'],
      };

      mockTasksService.updateStatus.mockResolvedValue(mockResponse);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.updateStatus(
        'task-1',
        updateTaskStatusDto,
        req,
      );

      expect(tasksService.updateStatus).toHaveBeenCalledWith(
        'task-1',
        updateTaskStatusDto,
        'user-123',
      );
      expect(result).toBe(mockResponse);
    });

    it('should extract user ID from JWT token correctly', async () => {
      const updateTaskStatusDto = { status: 'DONE' as any };
      mockTasksService.updateStatus.mockResolvedValue({
        message: 'Status updated',
        task: mockUpdatedTask,
        previousStatus: 'REVIEW',
        newStatus: 'DONE',
        validNextStatuses: ['REVIEW', 'TODO', 'IN_PROGRESS'],
      });

      const req = { user: { sub: 'user-123' } };
      await controller.updateStatus('task-1', updateTaskStatusDto, req);

      expect(tasksService.updateStatus).toHaveBeenCalledWith(
        'task-1',
        updateTaskStatusDto,
        'user-123', // Extracted from req.user.sub
      );
    });

    it('should handle different status transitions', async () => {
      const updateTaskStatusDto = { status: 'REVIEW' as any };
      const mockResponse = {
        message: 'Task status successfully updated from IN_PROGRESS to REVIEW',
        task: { ...mockUpdatedTask, status: 'REVIEW' },
        previousStatus: 'IN_PROGRESS',
        newStatus: 'REVIEW',
        validNextStatuses: ['IN_PROGRESS', 'TODO', 'DONE'],
      };

      mockTasksService.updateStatus.mockResolvedValue(mockResponse);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.updateStatus(
        'task-1',
        updateTaskStatusDto,
        req,
      );

      expect(result.newStatus).toBe('REVIEW');
      expect(result.validNextStatuses).toEqual(['IN_PROGRESS', 'TODO', 'DONE']);
    });
  });

  describe('assignTask', () => {
    const assignTaskDto = { assignedUserId: 'user-3' };
    const mockResponse = {
      message: 'Task successfully assigned to Test User',
      task: {
        id: 'task-1',
        title: 'Test Task',
        assignedUserId: 'user-3',
      },
    };

    it('should call tasksService.assignTask with correct parameters', async () => {
      mockTasksService.assignTask.mockResolvedValue(mockResponse);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.assignTask('task-1', assignTaskDto, req);

      expect(mockTasksService.assignTask).toHaveBeenCalledWith(
        'task-1',
        assignTaskDto,
        'user-123',
      );
      expect(result).toBe(mockResponse);
    });
  });

  describe('unassignTask', () => {
    const mockResponse = {
      message: 'Task successfully unassigned from Test User',
      task: {
        id: 'task-1',
        title: 'Test Task',
        assignedUserId: null,
      },
    };

    it('should call tasksService.unassignTask with correct parameters', async () => {
      mockTasksService.unassignTask.mockResolvedValue(mockResponse);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.unassignTask('task-1', req);

      expect(mockTasksService.unassignTask).toHaveBeenCalledWith(
        'task-1',
        'user-123',
      );
      expect(result).toBe(mockResponse);
    });
  });

  describe('findTasksAssignedToMe', () => {
    const mockResponse = {
      data: [
        { id: 'task-1', title: 'My Task 1', assignedUserId: 'user-123' },
        { id: 'task-2', title: 'My Task 2', assignedUserId: 'user-123' },
      ],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    };

    it('should call tasksService.findTasksAssignedToMe with correct parameters', async () => {
      const queryDto = { page: 1, limit: 10 };
      mockTasksService.findTasksAssignedToMe.mockResolvedValue(mockResponse);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.findTasksAssignedToMe(
        queryDto as any,
        req,
      );

      expect(mockTasksService.findTasksAssignedToMe).toHaveBeenCalledWith(
        queryDto,
        'user-123',
      );
      expect(result).toBe(mockResponse);
    });
  });

  describe('bulkUpdateStatus', () => {
    const bulkUpdateStatusDto = {
      taskIds: ['task-1', 'task-2'],
      status: 'IN_PROGRESS' as any,
    };

    const mockResponse = {
      message: 'Successfully updated 2 task(s) to status IN_PROGRESS',
      updatedCount: 2,
      tasks: [
        {
          id: 'task-1',
          title: 'Test Task 1',
          status: 'IN_PROGRESS',
          list: { id: 'list-1', name: 'Test List', color: '#3B82F6' },
          assignedUser: null,
        },
        {
          id: 'task-2',
          title: 'Test Task 2',
          status: 'IN_PROGRESS',
          list: { id: 'list-1', name: 'Test List', color: '#3B82F6' },
          assignedUser: null,
        },
      ],
      statusChanges: [
        {
          taskId: 'task-1',
          title: 'Test Task 1',
          previousStatus: 'TODO',
          newStatus: 'IN_PROGRESS',
        },
        {
          taskId: 'task-2',
          title: 'Test Task 2',
          previousStatus: 'TODO',
          newStatus: 'IN_PROGRESS',
        },
      ],
      validNextStatuses: ['TODO', 'REVIEW', 'DONE'],
    };

    it('should call tasksService.bulkUpdateStatus with correct parameters', async () => {
      mockTasksService.bulkUpdateStatus.mockResolvedValue(mockResponse);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.bulkUpdateStatus(
        bulkUpdateStatusDto,
        req,
      );

      expect(mockTasksService.bulkUpdateStatus).toHaveBeenCalledWith(
        bulkUpdateStatusDto,
        'user-123',
      );
      expect(result).toBe(mockResponse);
    });

    it('should extract user ID from JWT token correctly', async () => {
      mockTasksService.bulkUpdateStatus.mockResolvedValue(mockResponse);

      const req = { user: { sub: 'test-user-456' } };
      await controller.bulkUpdateStatus(bulkUpdateStatusDto, req);

      expect(mockTasksService.bulkUpdateStatus).toHaveBeenCalledWith(
        bulkUpdateStatusDto,
        'test-user-456',
      );
    });

    it('should handle bulk update response format', async () => {
      mockTasksService.bulkUpdateStatus.mockResolvedValue(mockResponse);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.bulkUpdateStatus(
        bulkUpdateStatusDto,
        req,
      );

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('updatedCount');
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('statusChanges');
      expect(result).toHaveProperty('validNextStatuses');
      expect(result.updatedCount).toBe(2);
      expect(result.tasks).toHaveLength(2);
      expect(result.statusChanges).toHaveLength(2);
    });
  });

  describe('findUnassignedTasks', () => {
    const mockResponse = {
      data: [
        { id: 'task-1', title: 'Unassigned Task 1', assignedUserId: null },
        { id: 'task-2', title: 'Unassigned Task 2', assignedUserId: null },
      ],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    };

    it('should call tasksService.findUnassignedTasks with correct parameters', async () => {
      const queryDto = { page: 1, limit: 10 };
      mockTasksService.findUnassignedTasks.mockResolvedValue(mockResponse);

      const req = { user: { sub: 'user-123' } };
      const result = await controller.findUnassignedTasks(queryDto as any, req);

      expect(mockTasksService.findUnassignedTasks).toHaveBeenCalledWith(
        queryDto,
        'user-123',
      );
      expect(result).toBe(mockResponse);
    });
  });
});
