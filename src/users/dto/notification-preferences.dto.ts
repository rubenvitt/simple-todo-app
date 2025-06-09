import { IsBoolean, IsEnum, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationFrequency {
  IMMEDIATE = 'IMMEDIATE',
  DAILY_DIGEST = 'DAILY_DIGEST',
  WEEKLY_DIGEST = 'WEEKLY_DIGEST',
  DISABLED = 'DISABLED',
}

export interface NotificationTypePreferences {
  GENERAL: boolean;
  TASK_ASSIGNMENT: boolean;
  TASK_STATUS_CHANGE: boolean;
  LIST_SHARED: boolean;
  INVITATION_RECEIVED: boolean;
  INVITATION_ACCEPTED: boolean;
  LIST_UPDATE: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ description: 'Enable in-app notifications', default: true })
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @ApiProperty({ description: 'Enable email notifications', default: true })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiProperty({
    description: 'Notification frequency preference',
    enum: NotificationFrequency,
    default: NotificationFrequency.IMMEDIATE,
  })
  @IsOptional()
  @IsEnum(NotificationFrequency)
  frequency?: NotificationFrequency;

  @ApiProperty({
    description: 'Notification type preferences',
  })
  @IsOptional()
  @IsObject()
  types?: NotificationTypePreferences;
}

export class NotificationPreferencesResponseDto {
  @ApiProperty({ description: 'Enable in-app notifications' })
  inApp!: boolean;

  @ApiProperty({ description: 'Enable email notifications' })
  email!: boolean;

  @ApiProperty({
    description: 'Notification frequency preference',
    enum: NotificationFrequency,
  })
  frequency!: NotificationFrequency;

  @ApiProperty({
    description: 'Notification type preferences',
  })
  types!: NotificationTypePreferences;
}
