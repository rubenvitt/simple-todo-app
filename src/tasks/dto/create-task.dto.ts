import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { TaskPriority } from '../../../generated/prisma';

export class CreateTaskDto {
  @IsString()
  @MinLength(1, { message: 'Task title cannot be empty' })
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsUUID()
  listId!: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;
}
