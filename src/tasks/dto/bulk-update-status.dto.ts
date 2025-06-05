import { IsArray, IsEnum, IsUUID } from 'class-validator';
import { TaskStatus } from '../../../generated/prisma';

export class BulkUpdateStatusDto {
  @IsArray()
  @IsUUID(4, { each: true })
  taskIds!: string[];

  @IsEnum(TaskStatus, {
    message: 'Status must be one of: BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE',
  })
  status!: TaskStatus;
}
