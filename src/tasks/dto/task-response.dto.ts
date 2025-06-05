import { TaskPriority, TaskStatus } from '../../../generated/prisma';

export class TaskResponseDto {
  id!: string;
  title!: string;
  description?: string;
  status!: TaskStatus;
  priority!: TaskPriority;
  dueDate?: Date;
  listId!: string;
  assignedUserId?: string;
  createdAt!: Date;
  updatedAt!: Date;

  // Optional nested relations
  list?: {
    id: string;
    name: string;
    color: string;
  };

  assignedUser?: {
    id: string;
    name: string;
    email: string;
  };
}
