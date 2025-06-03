import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { NotificationType } from '../../../generated/prisma';

export class QueryNotificationsDto {
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @IsOptional()
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    read?: boolean;

    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType;
} 