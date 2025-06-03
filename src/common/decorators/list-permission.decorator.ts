import { SetMetadata } from '@nestjs/common';
import { PermissionLevel } from '../../../generated/prisma';
import { REQUIRED_PERMISSION_KEY } from '../guards/list-permission.guard';

/**
 * Decorator to require a specific permission level for list operations
 * 
 * @param permission - The minimum permission level required (VIEWER, EDITOR, or OWNER)
 * 
 * Usage examples:
 * @RequireListPermission(PermissionLevel.VIEWER) - For read-only operations
 * @RequireListPermission(PermissionLevel.EDITOR) - For modify operations  
 * @RequireListPermission(PermissionLevel.OWNER) - For owner-only operations
 */
export const RequireListPermission = (permission: PermissionLevel) =>
    SetMetadata(REQUIRED_PERMISSION_KEY, permission); 