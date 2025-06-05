import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import {
  BulkUpdateStatusDto,
  CreateTaskDto,
  QueryTasksDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dto';
import { TaskStateTransitions } from './utils/task-state-transitions';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTaskDto: CreateTaskDto, userId: string) {
    // First, verify that the user has access to the specified list
    const list = await this.prisma.list.findFirst({
      where: {
        id: createTaskDto.listId,
        OR: [
          { userId: userId }, // User owns the list
          {
            shares: {
              some: {
                userId: userId,
                permissionLevel: { in: ['EDITOR', 'OWNER'] },
              },
            },
          }, // User has edit access
        ],
      },
    });

    if (!list) {
      throw new Error(
        'List not found or you do not have permission to add tasks to this list',
      );
    }

    // If assignedUserId is provided, verify the user exists and has access to the list
    if (createTaskDto.assignedUserId) {
      const assignedUser = await this.prisma.user.findUnique({
        where: { id: createTaskDto.assignedUserId },
      });

      if (!assignedUser) {
        throw new Error('Assigned user not found');
      }

      // Check if assigned user has access to the list
      const hasAccess = await this.prisma.list.findFirst({
        where: {
          id: createTaskDto.listId,
          OR: [
            { userId: createTaskDto.assignedUserId }, // Assigned user owns the list
            { shares: { some: { userId: createTaskDto.assignedUserId } } }, // Assigned user has shared access
          ],
        },
      });

      if (!hasAccess) {
        throw new Error('Assigned user does not have access to this list');
      }
    }

    // Create the task with default values
    const task = await this.prisma.task.create({
      data: {
        title: createTaskDto.title,
        description: createTaskDto.description,
        priority: createTaskDto.priority || 'MEDIUM',
        dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
        listId: createTaskDto.listId,
        assignedUserId: createTaskDto.assignedUserId,
        status: 'TODO', // Default status for new tasks
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

    return task;
  }

  async findAll(queryDto: QueryTasksDto, userId?: string) {
    const {
      listId,
      status,
      priority,
      assignedUserId,
      dueDateFrom,
      dueDateTo,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
      includeList,
      includeAssignedUser,
    } = queryDto;

    // Build where clause for filtering
    const where: any = {};

    if (listId) {
      where.listId = listId;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assignedUserId) {
      where.assignedUserId = assignedUserId;
    }

    // Date range filtering
    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) {
        where.dueDate.gte = new Date(dueDateFrom);
      }
      if (dueDateTo) {
        where.dueDate.lte = new Date(dueDateTo);
      }
    }

    // Search in title and description
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // User access control - only show tasks from lists the user owns or has access to
    if (userId) {
      where.list = {
        OR: [
          { userId: userId }, // User owns the list
          { shares: { some: { userId: userId } } }, // User has shared access
        ],
      };
    }

    // Calculate pagination
    const skip = ((page || 1) - 1) * (limit || 10);

    // Build include clause for relations
    const include: any = {};
    if (includeList) {
      include.list = {
        select: {
          id: true,
          name: true,
          color: true,
        },
      };
    }
    if (includeAssignedUser) {
      include.assignedUser = {
        select: {
          id: true,
          name: true,
          email: true,
        },
      };
    }

    // Build orderBy clause
    const orderBy: any = {};
    orderBy[sortBy || 'createdAt'] = sortOrder || 'desc';

    // Execute query with count for pagination
    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: Object.keys(include).length > 0 ? include : undefined,
        orderBy,
        skip,
        take: limit || 10,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: tasks,
      pagination: {
        page: page || 1,
        limit: limit || 10,
        total,
        totalPages: Math.ceil(total / (limit || 10)),
      },
    };
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string) {
    // First, find the task and verify the user has permission to update it
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
      include: {
        list: {
          include: {
            shares: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Check if user has permission to update this task
    const hasPermission =
      existingTask.list.userId === userId || // User owns the list
      existingTask.assignedUserId === userId || // User is assigned to the task
      existingTask.list.shares.some(
        (share) =>
          share.userId === userId &&
          ['EDITOR', 'OWNER'].includes(share.permissionLevel),
      ); // User has edit access to the list

    if (!hasPermission) {
      throw new Error('You do not have permission to update this task');
    }

    // If listId is being changed, verify access to the new list
    if (updateTaskDto.listId && updateTaskDto.listId !== existingTask.listId) {
      const newList = await this.prisma.list.findFirst({
        where: {
          id: updateTaskDto.listId,
          OR: [
            { userId: userId }, // User owns the new list
            {
              shares: {
                some: {
                  userId: userId,
                  permissionLevel: { in: ['EDITOR', 'OWNER'] },
                },
              },
            }, // User has edit access
          ],
        },
      });

      if (!newList) {
        throw new Error(
          'New list not found or you do not have permission to move tasks to this list',
        );
      }
    }

    // If assignedUserId is being changed, verify the user exists and has access
    if (updateTaskDto.assignedUserId !== undefined) {
      if (updateTaskDto.assignedUserId !== null) {
        const assignedUser = await this.prisma.user.findUnique({
          where: { id: updateTaskDto.assignedUserId },
        });

        if (!assignedUser) {
          throw new Error('Assigned user not found');
        }

        // Check if assigned user has access to the target list
        const targetListId = updateTaskDto.listId || existingTask.listId;
        const hasAccess = await this.prisma.list.findFirst({
          where: {
            id: targetListId,
            OR: [
              { userId: updateTaskDto.assignedUserId }, // Assigned user owns the list
              { shares: { some: { userId: updateTaskDto.assignedUserId } } }, // Assigned user has shared access
            ],
          },
        });

        if (!hasAccess) {
          throw new Error('Assigned user does not have access to this list');
        }
      }
      // If assignedUserId is explicitly set to null/undefined, it will be handled by Prisma
    }

    // Prepare update data
    const updateData: any = {};

    if (updateTaskDto.title !== undefined)
      updateData.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined)
      updateData.description = updateTaskDto.description;
    if (updateTaskDto.status !== undefined)
      updateData.status = updateTaskDto.status;
    if (updateTaskDto.priority !== undefined)
      updateData.priority = updateTaskDto.priority;
    if (updateTaskDto.dueDate !== undefined) {
      updateData.dueDate = updateTaskDto.dueDate
        ? new Date(updateTaskDto.dueDate)
        : null;
    }
    if (updateTaskDto.listId !== undefined)
      updateData.listId = updateTaskDto.listId;
    if (updateTaskDto.assignedUserId !== undefined) {
      updateData.assignedUserId = updateTaskDto.assignedUserId;
    }

    // Update the task
    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: updateData,
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

    return updatedTask;
  }

  async remove(id: string, userId: string) {
    // First, find the task and verify the user has permission to delete it
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
      include: {
        list: {
          include: {
            shares: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Check if user has permission to delete this task
    const hasPermission =
      existingTask.list.userId === userId || // User owns the list
      existingTask.assignedUserId === userId || // User is assigned to the task
      existingTask.list.shares.some(
        (share) =>
          share.userId === userId &&
          ['EDITOR', 'OWNER'].includes(share.permissionLevel),
      ); // User has edit access to the list

    if (!hasPermission) {
      throw new Error('You do not have permission to delete this task');
    }

    // Delete the task (Prisma will handle cascade deletions based on schema)
    await this.prisma.task.delete({
      where: { id },
    });

    // Return success response with minimal task info for confirmation
    return {
      message: 'Task deleted successfully',
      deletedTask: {
        id: existingTask.id,
        title: existingTask.title,
        listId: existingTask.listId,
      },
    };
  }

  async updateStatus(
    id: string,
    updateTaskStatusDto: UpdateTaskStatusDto,
    userId: string,
  ) {
    // First, find the task and verify the user has permission to update it
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
      include: {
        list: {
          include: {
            shares: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Check if user has permission to update this task
    const hasPermission =
      existingTask.list.userId === userId || // User owns the list
      existingTask.assignedUserId === userId || // User is assigned to the task
      existingTask.list.shares.some(
        (share) =>
          share.userId === userId &&
          ['EDITOR', 'OWNER'].includes(share.permissionLevel),
      ); // User has edit access to the list

    if (!hasPermission) {
      throw new Error('You do not have permission to update this task status');
    }

    // Validate status transition
    if (
      !TaskStateTransitions.isValidTransition(
        existingTask.status,
        updateTaskStatusDto.status,
      )
    ) {
      throw new Error(
        TaskStateTransitions.getTransitionErrorMessage(
          existingTask.status,
          updateTaskStatusDto.status,
        ),
      );
    }

    // Update only the status
    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        status: updateTaskStatusDto.status,
        updatedAt: new Date(), // Ensure updatedAt is refreshed
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

    return {
      message: `Task status successfully updated from ${existingTask.status} to ${updateTaskStatusDto.status}`,
      task: updatedTask,
      previousStatus: existingTask.status,
      newStatus: updateTaskStatusDto.status,
      validNextStatuses: TaskStateTransitions.getValidTransitions(
        updateTaskStatusDto.status,
      ),
    };
  }

  async assignTask(id: string, assignTaskDto: any, userId: string) {
    // First, find the task and verify the user has permission to update it
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
      include: {
        list: {
          include: {
            shares: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Check if user has permission to assign this task
    const hasPermission =
      existingTask.list.userId === userId || // User owns the list
      existingTask.assignedUserId === userId || // User is assigned to the task
      existingTask.list.shares.some(
        (share) =>
          share.userId === userId &&
          ['EDITOR', 'OWNER'].includes(share.permissionLevel),
      ); // User has edit access to the list

    if (!hasPermission) {
      throw new Error('You do not have permission to assign this task');
    }

    // Verify the user to be assigned exists and has access to the list
    const assignedUser = await this.prisma.user.findUnique({
      where: { id: assignTaskDto.assignedUserId },
    });

    if (!assignedUser) {
      throw new Error('Assigned user not found');
    }

    // Check if assigned user has access to the list
    const hasAccess = await this.prisma.list.findFirst({
      where: {
        id: existingTask.listId,
        OR: [
          { userId: assignTaskDto.assignedUserId }, // Assigned user owns the list
          { shares: { some: { userId: assignTaskDto.assignedUserId } } }, // Assigned user has shared access
        ],
      },
    });

    if (!hasAccess) {
      throw new Error('Assigned user does not have access to this list');
    }

    // Update the task with the new assignment
    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        assignedUserId: assignTaskDto.assignedUserId,
        updatedAt: new Date(),
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

    return {
      message: `Task successfully assigned to ${assignedUser.name}`,
      task: updatedTask,
    };
  }

  async unassignTask(id: string, userId: string) {
    // First, find the task and verify the user has permission to update it
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
      include: {
        list: {
          include: {
            shares: {
              where: { userId },
            },
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

    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Check if user has permission to unassign this task
    const hasPermission =
      existingTask.list.userId === userId || // User owns the list
      existingTask.assignedUserId === userId || // User is assigned to the task
      existingTask.list.shares.some(
        (share) =>
          share.userId === userId &&
          ['EDITOR', 'OWNER'].includes(share.permissionLevel),
      ); // User has edit access to the list

    if (!hasPermission) {
      throw new Error('You do not have permission to unassign this task');
    }

    if (!existingTask.assignedUserId) {
      throw new Error('Task is not currently assigned to anyone');
    }

    const previousAssignee = existingTask.assignedUser;

    // Remove the assignment
    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        assignedUserId: null,
        updatedAt: new Date(),
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

    return {
      message: `Task successfully unassigned from ${previousAssignee?.name || 'user'}`,
      task: updatedTask,
      previousAssignee: previousAssignee,
    };
  }

  async findTasksAssignedToMe(queryDto: QueryTasksDto, userId: string) {
    // Copy the query but force assignedUserId to current user
    const assignedQuery = {
      ...queryDto,
      assignedUserId: userId,
    };

    return this.findAll(assignedQuery, userId);
  }

  async findUnassignedTasks(queryDto: QueryTasksDto, userId: string) {
    // Use the existing findAll method but modify the where clause for unassigned tasks
    const {
      listId,
      status,
      priority,
      dueDateFrom,
      dueDateTo,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
      includeList,
      includeAssignedUser,
    } = queryDto;

    // Build where clause for filtering
    const where: any = {};

    // Force unassigned tasks
    where.assignedUserId = null;

    if (listId) {
      where.listId = listId;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    // Date range filtering
    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) {
        where.dueDate.gte = new Date(dueDateFrom);
      }
      if (dueDateTo) {
        where.dueDate.lte = new Date(dueDateTo);
      }
    }

    // Search in title and description
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // User access control - only show tasks from lists the user owns or has access to
    where.list = {
      OR: [
        { userId: userId }, // User owns the list
        { shares: { some: { userId: userId } } }, // User has shared access
      ],
    };

    // Calculate pagination
    const skip = ((page || 1) - 1) * (limit || 10);

    // Build include clause for relations
    const include: any = {};
    if (includeList) {
      include.list = {
        select: {
          id: true,
          name: true,
          color: true,
        },
      };
    }
    if (includeAssignedUser) {
      include.assignedUser = {
        select: {
          id: true,
          name: true,
          email: true,
        },
      };
    }

    // Build orderBy clause
    const orderBy: any = {};
    orderBy[sortBy || 'createdAt'] = sortOrder || 'desc';

    // Execute query with count for pagination
    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: Object.keys(include).length > 0 ? include : undefined,
        orderBy,
        skip,
        take: limit || 10,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: tasks,
      pagination: {
        page: page || 1,
        limit: limit || 10,
        total,
        totalPages: Math.ceil(total / (limit || 10)),
      },
    };
  }

  async bulkUpdateStatus(
    bulkUpdateStatusDto: BulkUpdateStatusDto,
    userId: string,
  ) {
    const { taskIds, status } = bulkUpdateStatusDto;

    // First, fetch all tasks and verify permissions
    const existingTasks = await this.prisma.task.findMany({
      where: {
        id: { in: taskIds },
      },
      include: {
        list: {
          include: {
            shares: {
              where: { userId },
            },
          },
        },
      },
    });

    // Check if all tasks exist
    if (existingTasks.length !== taskIds.length) {
      const foundIds = existingTasks.map((task) => task.id);
      const missingIds = taskIds.filter((id: string) => !foundIds.includes(id));
      throw new Error(`Tasks not found: ${missingIds.join(', ')}`);
    }

    // Validate permissions and state transitions for each task
    const unauthorizedTasks: string[] = [];
    const invalidTransitions: {
      taskId: string;
      currentStatus: string;
      error: string;
    }[] = [];

    for (const task of existingTasks) {
      // Check permissions
      const hasPermission =
        task.list.userId === userId || // User owns the list
        task.assignedUserId === userId || // User is assigned to the task
        task.list.shares.some(
          (share) =>
            share.userId === userId &&
            ['EDITOR', 'OWNER'].includes(share.permissionLevel),
        ); // User has edit access to the list

      if (!hasPermission) {
        unauthorizedTasks.push(task.id);
        continue;
      }

      // Validate state transition
      if (!TaskStateTransitions.isValidTransition(task.status, status)) {
        invalidTransitions.push({
          taskId: task.id,
          currentStatus: task.status,
          error: TaskStateTransitions.getTransitionErrorMessage(
            task.status,
            status,
          ),
        });
      }
    }

    // If there are any authorization or validation errors, throw them
    if (unauthorizedTasks.length > 0) {
      throw new Error(
        `You do not have permission to update these tasks: ${unauthorizedTasks.join(', ')}`,
      );
    }

    if (invalidTransitions.length > 0) {
      const errorMessages = invalidTransitions.map(
        (t) => `Task ${t.taskId}: ${t.error}`,
      );
      throw new Error(
        `Invalid state transitions:\n${errorMessages.join('\n')}`,
      );
    }

    // Perform bulk update using Prisma transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      const updatedTasks = await prisma.task.updateMany({
        where: {
          id: { in: taskIds },
        },
        data: {
          status,
          updatedAt: new Date(),
        },
      });

      // Fetch the updated tasks with relations for response
      const tasksWithRelations = await prisma.task.findMany({
        where: {
          id: { in: taskIds },
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

      return { updatedTasks, tasksWithRelations };
    });

    // Prepare response with status change summary
    const statusChanges = existingTasks.map((task) => ({
      taskId: task.id,
      title: task.title,
      previousStatus: task.status,
      newStatus: status,
    }));

    return {
      message: `Successfully updated ${result.updatedTasks.count} task(s) to status ${status}`,
      updatedCount: result.updatedTasks.count,
      tasks: result.tasksWithRelations,
      statusChanges,
      validNextStatuses: TaskStateTransitions.getValidTransitions(status),
    };
  }
}
