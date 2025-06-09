import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { NotificationType } from '../../../generated/prisma';

export class CreateNotificationDto {
  @IsUUID()
  userId!: string;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsString()
  title!: string;

  @IsString()
  message!: string;
}
