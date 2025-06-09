import { useMemo } from 'react';
import { PermissionLevel } from '@simple-todo-app/shared';
import { useListShares } from './useListShares';
import { useAuth } from './useAuth';

export interface UsePermissionsProps {
  listId: string;
}

export interface PermissionInfo {
  userPermission: PermissionLevel | null;
  isOwner: boolean;
  isEditor: boolean;
  isViewer: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canManagePermissions: boolean;
  isLoading: boolean;
  hasAccess: boolean;
}

export const usePermissions = ({ listId }: UsePermissionsProps): PermissionInfo => {
  const { user } = useAuth();
  const { data: shares = [], isLoading } = useListShares(listId);

  const permissionInfo = useMemo(() => {
    if (!user) {
      return {
        userPermission: null,
        isOwner: false,
        isEditor: false,
        isViewer: false,
        canView: false,
        canEdit: false,
        canDelete: false,
        canShare: false,
        canManagePermissions: false,
        isLoading,
        hasAccess: false,
      };
    }

    if (isLoading) {
      // While loading, allow basic access but disable dangerous operations
      return {
        userPermission: null,
        isOwner: false,
        isEditor: false,
        isViewer: true, // Assume viewer by default while loading
        canView: true,
        canEdit: false,
        canDelete: false,
        canShare: false,
        canManagePermissions: false,
        isLoading: true,
        hasAccess: true, // Allow access while loading
      };
    }

    // Find user's permission for this list
    const userShare = shares.find(share => share.userId === user.id);
    const userPermission = userShare?.permissionLevel || null;

    // If no share found, assume the user is the owner (creator of the list)
    // This handles the case where the user created the list but shares aren't loaded yet
    const isOwner = userPermission === PermissionLevel.OWNER || (!userShare && shares.length === 0);
    const isEditor = userPermission === PermissionLevel.EDITOR;
    const isViewer = userPermission === PermissionLevel.VIEWER;

    // Determine capabilities based on permission
    const canView = isOwner || isEditor || isViewer;
    const canEdit = isOwner || isEditor;
    const canDelete = isOwner;
    const canShare = isOwner;
    const canManagePermissions = isOwner;
    const hasAccess = isOwner || isEditor || isViewer;

    return {
      userPermission: userPermission || (isOwner ? PermissionLevel.OWNER : null),
      isOwner,
      isEditor,
      isViewer,
      canView,
      canEdit,
      canDelete,
      canShare,
      canManagePermissions,
      isLoading: false,
      hasAccess,
    };
  }, [user, shares, isLoading]);

  return permissionInfo;
};

// Helper component for conditional rendering based on permissions
export interface PermissionGuardProps {
  listId: string;
  requires: 'owner' | 'editor' | 'viewer' | 'edit' | 'delete' | 'share' | 'manage';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  listId,
  requires,
  children,
  fallback = null,
}) => {
  const permissions = usePermissions({ listId });

  const hasPermission = useMemo(() => {
    switch (requires) {
      case 'owner':
        return permissions.isOwner;
      case 'editor':
        return permissions.isEditor;
      case 'viewer':
        return permissions.isViewer;
      case 'edit':
        return permissions.canEdit;
      case 'delete':
        return permissions.canDelete;
      case 'share':
        return permissions.canShare;
      case 'manage':
        return permissions.canManagePermissions;
      default:
        return false;
    }
  }, [permissions, requires]);

  if (permissions.isLoading) {
    return null; // or a loading spinner
  }

  return hasPermission ? (children as React.ReactElement) : (fallback as React.ReactElement);
};