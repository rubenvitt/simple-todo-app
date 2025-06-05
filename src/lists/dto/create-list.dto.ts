import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateListDto {
  @IsString()
  @MinLength(1, { message: 'List name cannot be empty' })
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Color must be a valid hex color code (e.g., #FF0000 or #F00)',
  })
  color?: string;
}
