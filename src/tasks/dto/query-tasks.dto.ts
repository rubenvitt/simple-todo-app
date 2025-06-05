import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '../../../generated/prisma';

export class QueryTasksDto {
  // Filtering options
  @IsOptional()
  @IsUUID()
  listId?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @IsOptional()
  @IsString()
  search?: string; // Search in title and description

  // Pagination
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  // Sorting
  @IsOptional()
  @IsEnum(['title', 'status', 'priority', 'dueDate', 'createdAt', 'updatedAt'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  // Include relations
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeList?: boolean = false;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeAssignedUser?: boolean = false;
}
