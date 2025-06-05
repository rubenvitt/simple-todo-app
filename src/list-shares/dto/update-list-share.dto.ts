import { IsEnum, IsNotEmpty } from 'class-validator';
import { PermissionLevel } from '../../../generated/prisma';

export class UpdateListShareDto {
  @IsEnum(PermissionLevel, {
    message: 'Permission level must be one of: VIEWER, EDITOR, OWNER',
  })
  @IsNotEmpty({ message: 'Permission level is required' })
  permissionLevel!: PermissionLevel;
}
