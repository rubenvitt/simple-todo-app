import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { PermissionLevel } from '../../../generated/prisma';

export class CreateListShareDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  userEmail!: string;

  @IsEnum(PermissionLevel, {
    message: 'Permission level must be one of: VIEWER, EDITOR, OWNER',
  })
  @IsNotEmpty({ message: 'Permission level is required' })
  permissionLevel!: PermissionLevel;
}
