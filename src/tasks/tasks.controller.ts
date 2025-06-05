import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  BulkUpdateStatusDto,
  CreateTaskDto,
  QueryTasksDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dto';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all tasks',
    description:
      'Retrieve all tasks accessible to the authenticated user with optional filtering',
  })
  @ApiQuery({
    name: 'listId',
    required: false,
    type: Number,
    description: 'Filter tasks by list ID',
    example: 1,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter tasks by status',
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    type: String,
    description: 'Filter tasks by priority',
    example: 'HIGH',
  })
  @ApiQuery({
    name: 'assignedUserId',
    required: false,
    type: Number,
    description: 'Filter tasks by assigned user ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
    example: [
      {
        id: 1,
        title: 'Complete project documentation',
        description: 'Write comprehensive documentation for the API',
        status: 'PENDING',
        priority: 'HIGH',
        dueDate: '2024-12-31T23:59:59.000Z',
        listId: 1,
        assignedUserId: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findAll(@Query() queryDto: QueryTasksDto, @Request() req: any) {
    const userId = req.user?.sub; // Extract user ID from JWT token
    return this.tasksService.findAll(queryDto, userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new task',
    description: 'Create a new task in the specified list',
  })
  @ApiBody({
    type: CreateTaskDto,
    description: 'Task creation data',
    examples: {
      example1: {
        summary: 'Basic task',
        value: {
          title: 'Complete project documentation',
          description: 'Write comprehensive documentation for the API',
          listId: 1,
          priority: 'HIGH',
          dueDate: '2024-12-31T23:59:59.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    example: {
      id: 1,
      title: 'Complete project documentation',
      description: 'Write comprehensive documentation for the API',
      status: 'PENDING',
      priority: 'HIGH',
      dueDate: '2024-12-31T23:59:59.000Z',
      listId: 1,
      assignedUserId: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No permission to create tasks in this list',
  })
  async create(@Body() createTaskDto: CreateTaskDto, @Request() req: any) {
    const userId = req.user?.sub; // Extract user ID from JWT token
    return this.tasksService.create(createTaskDto, userId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a task',
    description: 'Update an existing task by ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Task ID',
    example: '1',
  })
  @ApiBody({
    type: UpdateTaskDto,
    description: 'Task update data',
    examples: {
      example1: {
        summary: 'Update task',
        value: {
          title: 'Updated task title',
          description: 'Updated task description',
          priority: 'MEDIUM',
          dueDate: '2024-12-31T23:59:59.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    example: {
      id: 1,
      title: 'Updated task title',
      description: 'Updated task description',
      status: 'PENDING',
      priority: 'MEDIUM',
      dueDate: '2024-12-31T23:59:59.000Z',
      listId: 1,
      assignedUserId: null,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No permission to update this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub; // Extract user ID from JWT token
    return this.tasksService.update(id, updateTaskDto, userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a task',
    description: 'Delete an existing task by ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Task ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Task deleted successfully',
    example: {
      message: 'Task deleted successfully',
      id: 1,
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No permission to delete this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub; // Extract user ID from JWT token
    return this.tasksService.remove(id, userId);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update task status',
    description: 'Update the status of a specific task',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Task ID',
    example: '1',
  })
  @ApiBody({
    type: UpdateTaskStatusDto,
    description: 'Task status update data',
    examples: {
      example1: {
        summary: 'Mark as completed',
        value: {
          status: 'COMPLETED',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Task status updated successfully',
    example: {
      id: 1,
      title: 'Complete project documentation',
      status: 'COMPLETED',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid status value',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No permission to update this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateTaskStatusDto: UpdateTaskStatusDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub; // Extract user ID from JWT token
    return this.tasksService.updateStatus(id, updateTaskStatusDto, userId);
  }

  @Patch('bulk/status')
  @ApiOperation({
    summary: 'Bulk update task status',
    description: 'Update the status of multiple tasks at once',
  })
  @ApiBody({
    type: BulkUpdateStatusDto,
    description: 'Bulk status update data',
    examples: {
      example1: {
        summary: 'Mark multiple tasks as completed',
        value: {
          taskIds: [1, 2, 3],
          status: 'COMPLETED',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks status updated successfully',
    example: {
      message: 'Updated 3 tasks successfully',
      updatedTasks: [1, 2, 3],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No permission to update some tasks',
  })
  async bulkUpdateStatus(
    @Body() bulkUpdateStatusDto: BulkUpdateStatusDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub; // Extract user ID from JWT token
    return this.tasksService.bulkUpdateStatus(bulkUpdateStatusDto, userId);
  }

  @Patch(':id/assign')
  @ApiOperation({
    summary: 'Assign task to user',
    description: 'Assign a task to a specific user',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Task ID',
    example: '1',
  })
  @ApiBody({
    description: 'Task assignment data',
    schema: {
      type: 'object',
      properties: {
        assignedUserId: {
          type: 'number',
          description: 'ID of the user to assign the task to',
          example: 2,
        },
      },
      required: ['assignedUserId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Task assigned successfully',
    example: {
      id: 1,
      title: 'Complete project documentation',
      assignedUserId: 2,
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid user ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No permission to assign this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task or user not found',
  })
  async assignTask(
    @Param('id') id: string,
    @Body() assignTaskDto: any,
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.tasksService.assignTask(id, assignTaskDto, userId);
  }

  @Patch(':id/unassign')
  @ApiOperation({
    summary: 'Unassign task',
    description: 'Remove user assignment from a task',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Task ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Task unassigned successfully',
    example: {
      id: 1,
      title: 'Complete project documentation',
      assignedUserId: null,
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No permission to unassign this task',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async unassignTask(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub;
    return this.tasksService.unassignTask(id, userId);
  }

  @Get('assigned-to-me')
  @ApiOperation({
    summary: 'Get tasks assigned to me',
    description: 'Retrieve all tasks assigned to the authenticated user',
  })
  @ApiQuery({
    name: 'listId',
    required: false,
    type: Number,
    description: 'Filter tasks by list ID',
    example: 1,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter tasks by status',
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    type: String,
    description: 'Filter tasks by priority',
    example: 'HIGH',
  })
  @ApiResponse({
    status: 200,
    description: 'Assigned tasks retrieved successfully',
    example: [
      {
        id: 1,
        title: 'Complete project documentation',
        description: 'Write comprehensive documentation for the API',
        status: 'PENDING',
        priority: 'HIGH',
        dueDate: '2024-12-31T23:59:59.000Z',
        listId: 1,
        assignedUserId: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findTasksAssignedToMe(
    @Query() queryDto: QueryTasksDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.tasksService.findTasksAssignedToMe(queryDto, userId);
  }

  @Get('unassigned')
  @ApiOperation({
    summary: 'Get unassigned tasks',
    description: 'Retrieve all tasks that are not assigned to any user',
  })
  @ApiQuery({
    name: 'listId',
    required: false,
    type: Number,
    description: 'Filter tasks by list ID',
    example: 1,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter tasks by status',
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    type: String,
    description: 'Filter tasks by priority',
    example: 'HIGH',
  })
  @ApiResponse({
    status: 200,
    description: 'Unassigned tasks retrieved successfully',
    example: [
      {
        id: 2,
        title: 'Review code changes',
        description: 'Review and approve pending code changes',
        status: 'PENDING',
        priority: 'MEDIUM',
        dueDate: '2024-12-31T23:59:59.000Z',
        listId: 1,
        assignedUserId: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async findUnassignedTasks(
    @Query() queryDto: QueryTasksDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.tasksService.findUnassignedTasks(queryDto, userId);
  }
}
