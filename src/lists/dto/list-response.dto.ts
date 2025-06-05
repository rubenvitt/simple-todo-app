import { PermissionLevel } from '../../../generated/prisma';

export class ListResponseDto {
  id!: string;
  name!: string;
  description?: string | null;
  color!: string;
  userId!: string;
  createdAt!: Date;
  updatedAt!: Date;
  isOwner?: boolean;
  permissionLevel?: PermissionLevel | 'OWNER' | null;
}
