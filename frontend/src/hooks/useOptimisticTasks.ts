import { useCallback } from 'react';
import { useOptimisticUpdates } from './useOptimisticUpdates';
import { useWebSocket } from './useWebSocket';

interface Task {
  id: string;
  listId: string;
  title: string;
  description?: string;
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId?: string;
  dueDate?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskUpdateData {
  id: string;
  title?: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assigneeId?: string;
  dueDate?: string;
  position?: number;
}

interface TaskCreateData {
  listId: string;
  title: string;
  description?: string;
  priority?: Task['priority'];
  assigneeId?: string;
  dueDate?: string;
}

interface UseOptimisticTasksOptions {
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
  onTaskMoved?: (task: Task, fromStatus: Task['status'], toStatus: Task['status']) => void;
  onError?: (error: any, operation: string) => void;
}

export const useOptimisticTasks = (
  wsHook: ReturnType<typeof useWebSocket>,
  options: UseOptimisticTasksOptions = {}
) => {
  const optimisticUpdates = useOptimisticUpdates<Task>(wsHook);

  const createTask = useCallback(async (taskData: TaskCreateData): Promise<Task> => {
    const tempId = `temp_${Date.now()}`;
    const optimisticTask: Task = {
      id: tempId,
      listId: taskData.listId,
      title: taskData.title,
      description: taskData.description,
      status: 'TODO',
      priority: taskData.priority || 'MEDIUM',
      assigneeId: taskData.assigneeId,
      dueDate: taskData.dueDate,
      position: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    options.onTaskCreated?.(optimisticTask);

    return optimisticUpdates.performUpdate(
      'task:create',
      optimisticTask,
      undefined,
      {
        onSuccess: (createdTask) => {
          if (createdTask.id !== tempId) {
            options.onTaskUpdated?.(createdTask);
          }
        },
        onError: (error) => {
          options.onError?.(error, 'create');
        }
      }
    );
  }, [optimisticUpdates, options]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<TaskUpdateData>, currentTask: Task): Promise<Task> => {
    const optimisticTask: Task = {
      ...currentTask,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    options.onTaskUpdated?.(optimisticTask);

    return optimisticUpdates.performUpdate(
      'task:update',
      optimisticTask,
      currentTask,
      {
        onSuccess: (updatedTask) => {
          options.onTaskUpdated?.(updatedTask);
        },
        onError: (error) => {
          options.onError?.(error, 'update');
          options.onTaskUpdated?.(currentTask);
        },
        onRevert: (originalTask) => {
          options.onTaskUpdated?.(originalTask);
        }
      }
    );
  }, [optimisticUpdates, options]);

  const deleteTask = useCallback(async (taskId: string, currentTask: Task): Promise<void> => {
    options.onTaskDeleted?.(taskId);

    return optimisticUpdates.performUpdate(
      'task:delete',
      { id: taskId },
      currentTask,
      {
        onError: (error) => {
          options.onError?.(error, 'delete');
          options.onTaskCreated?.(currentTask);
        },
        onRevert: (originalTask) => {
          options.onTaskCreated?.(originalTask);
        }
      }
    ).then(() => {});
  }, [optimisticUpdates, options]);

  const moveTask = useCallback(async (
    taskId: string, 
    newStatus: Task['status'], 
    newPosition: number,
    currentTask: Task
  ): Promise<Task> => {
    const fromStatus = currentTask.status;
    const optimisticTask: Task = {
      ...currentTask,
      status: newStatus,
      position: newPosition,
      updatedAt: new Date().toISOString()
    };

    options.onTaskMoved?.(optimisticTask, fromStatus, newStatus);

    return optimisticUpdates.performUpdate(
      'task:move',
      optimisticTask,
      currentTask,
      {
        onSuccess: (movedTask) => {
          options.onTaskMoved?.(movedTask, fromStatus, movedTask.status);
        },
        onError: (error) => {
          options.onError?.(error, 'move');
          options.onTaskMoved?.(currentTask, newStatus, fromStatus);
        },
        onRevert: (originalTask) => {
          options.onTaskMoved?.(originalTask, newStatus, originalTask.status);
        }
      }
    );
  }, [optimisticUpdates, options]);

  const assignTask = useCallback(async (
    taskId: string, 
    assigneeId: string | undefined, 
    currentTask: Task
  ): Promise<Task> => {
    const optimisticTask: Task = {
      ...currentTask,
      assigneeId,
      updatedAt: new Date().toISOString()
    };

    return updateTask(taskId, { assigneeId }, currentTask);
  }, [updateTask]);

  const updateTaskPriority = useCallback(async (
    taskId: string, 
    priority: Task['priority'], 
    currentTask: Task
  ): Promise<Task> => {
    return updateTask(taskId, { priority }, currentTask);
  }, [updateTask]);

  const updateTaskDueDate = useCallback(async (
    taskId: string, 
    dueDate: string | undefined, 
    currentTask: Task
  ): Promise<Task> => {
    return updateTask(taskId, { dueDate }, currentTask);
  }, [updateTask]);

  return {
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    assignTask,
    updateTaskPriority,
    updateTaskDueDate,
    pendingUpdates: optimisticUpdates.pendingUpdates,
    clearPendingUpdates: optimisticUpdates.clearPendingUpdates,
    retryUpdate: optimisticUpdates.retryUpdate
  };
};