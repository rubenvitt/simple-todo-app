export const TaskStatus = {
  BACKLOG: 'BACKLOG',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  DONE: 'DONE'
} as const;

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
} as const;

export type TaskPriority = typeof TaskPriority[keyof typeof TaskPriority];

export interface Task {
  id: string;
  title: string;
  description?: string;
  listId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assigneeId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  tags?: string[];
  order: number;
}

export interface TaskWithAssignee extends Task {
  assignee?: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
}

// DTO types for frontend
export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  listId: string;
  assignedUserId?: string;
  tags?: string[];
  order?: number;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  listId?: string;
  assignedUserId?: string | null;
  tags?: string[];
  order?: number;
}