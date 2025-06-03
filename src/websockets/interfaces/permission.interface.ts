export enum PermissionLevel {
    VIEWER = 'VIEWER',
    EDITOR = 'EDITOR',
    OWNER = 'OWNER'
}

export interface UserPermission {
    userId: string;
    listId: string;
    permissionLevel: PermissionLevel;
    isOwner: boolean;
}

export interface PermissionCheckResult {
    hasAccess: boolean;
    permissionLevel?: PermissionLevel;
    isOwner: boolean;
    canRead: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canManageShares: boolean;
}

export interface BroadcastPermissionFilter {
    requiredPermission: PermissionLevel;
    includeOwner?: boolean;
    excludeViewer?: boolean;
    operationType?: 'READ' | 'WRITE' | 'DELETE' | 'MANAGE';
}

export interface PermissionAwareEventPayload {
    baseData: any;
    viewerData?: any;
    editorData?: any;
    ownerData?: any;
} 