import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/api.service';
import type { TaskWithAssignee, TaskStatus, CreateTaskDto, UpdateTaskDto } from '@simple-todo-app/shared';

// Fetch tasks for a list
export const useTasks = (listId: string) => {
  return useQuery({
    queryKey: ['tasks', listId],
    queryFn: async () => {
      const response = await apiClient.get(`/tasks?listId=${listId}`);
      // Handle paginated response structure
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return response.data.data as TaskWithAssignee[];
      }
      return response.data as TaskWithAssignee[];
    },
    enabled: !!listId,
  });
};

// Create a new task
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateTaskDto) => {
      const response = await apiClient.post<TaskWithAssignee>('/tasks', data);
      return response.data;
    },
    onSuccess: (newTask: TaskWithAssignee) => {
      // Update the tasks list cache
      queryClient.setQueryData(['tasks', newTask.listId], (oldTasks: TaskWithAssignee[] = []) => {
        return [...oldTasks, newTask];
      });
    },
  });
};

// Update task status
export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const response = await apiClient.patch(`/tasks/${taskId}/status`, { status });
      return response.data;
    },
    onSuccess: (data: any) => {
      // Extract the task from the response (API returns { task: TaskWithAssignee, ... })
      const updatedTask = data.task || data;
      
      console.log('🔄 Cache update - Updated task:', updatedTask);
      
      // Update the task in cache
      queryClient.setQueryData(['tasks', updatedTask.listId], (oldTasks: TaskWithAssignee[] = []) => {
        const newTasks = oldTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        );
        console.log('🔄 Cache update - New tasks array:', newTasks);
        return newTasks;
      });
      
      // Also invalidate the query to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['tasks', updatedTask.listId] });
    },
  });
};

// Update task order and optionally status
export const useUpdateTaskOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      taskId, 
      order, 
      status 
    }: { 
      taskId: string; 
      order: number; 
      status?: TaskStatus; 
    }) => {
      const data: any = { order };
      if (status) data.status = status;
      const response = await apiClient.patch<TaskWithAssignee>(`/tasks/${taskId}`, data);
      return response.data;
    },
    onSuccess: (updatedTask: TaskWithAssignee) => {
      // Update the task in cache
      queryClient.setQueryData(['tasks', updatedTask.listId], (oldTasks: TaskWithAssignee[] = []) => {
        return oldTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        );
      });
    },
  });
};

// Update a task
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: UpdateTaskDto }) => {
      const response = await apiClient.patch<TaskWithAssignee>(`/tasks/${taskId}`, data);
      return response.data;
    },
    onSuccess: (updatedTask: TaskWithAssignee) => {
      // Update the task in cache
      queryClient.setQueryData(['tasks', updatedTask.listId], (oldTasks: TaskWithAssignee[] = []) => {
        return oldTasks.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        );
      });
    },
  });
};

// Delete a task
export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskId: string) => {
      await apiClient.delete(`/tasks/${taskId}`);
    },
    onSuccess: (_, taskId) => {
      // Remove the task from all lists in cache
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (oldTasks: TaskWithAssignee[] | undefined) => {
        return oldTasks?.filter(task => task.id !== taskId) || [];
      });
    },
  });
};