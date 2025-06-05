export interface List {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListWithStats extends List {
  taskCount: number;
  completedTaskCount: number;
  memberCount: number;
}