import { IsEnum } from 'class-validator';
import { TaskStatus } from '../../../generated/prisma';

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus, {
    message: 'Status must be one of: BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE',
  })
  status!: TaskStatus;
}
