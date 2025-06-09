export const PermissionLevel = {
  VIEWER: 'VIEWER',
  EDITOR: 'EDITOR',
  OWNER: 'OWNER',
} as const;

export type PermissionLevel = (typeof PermissionLevel)[keyof typeof PermissionLevel];

export interface List {
  id: string;
  name: string;
  description?: string;
  color?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isOwner?: boolean;
  permissionLevel?: PermissionLevel;
}

export interface ListWithStats extends List {
  taskCount: number;
  completedTaskCount: number;
  memberCount: number;
  // Alternative property names for compatibility
  totalTasksCount: number;
  completedTasksCount: number;
  isShared: boolean;
}

export interface ListShare {
  id: string;
  listId: string;
  userId: string;
  permissionLevel: PermissionLevel;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  list?: {
    id: string;
    name: string;
    description?: string;
    color: string;
  };
}