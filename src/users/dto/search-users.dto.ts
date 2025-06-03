import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class SearchUsersDto {
    @IsOptional()
    @IsString()
    search?: string; // Search in name and email

    @IsOptional()
    @IsUUID()
    listId?: string; // Only users with access to this list

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
    @Max(50)
    limit?: number = 10;
} 