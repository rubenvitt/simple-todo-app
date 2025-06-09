import type { 
  User, 
  List, 
  Task, 
  ListShare, 
  Invitation,
  Notification 
} from '@simple-todo-app/shared'

// Counter for unique IDs
let idCounter = 1

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: `user-${idCounter++}`,
  email: `user${idCounter}@example.com`,
  name: `Test User ${idCounter}`,
  avatar: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

export const createMockList = (overrides: Partial<List> = {}): List => ({
  id: `list-${idCounter++}`,
  title: `Test List ${idCounter}`,
  description: `Description for test list ${idCounter}`,
  color: '#1890ff',
  ownerId: `user-${idCounter}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isShared: false,
  userRole: 'OWNER',
  tasks: [],
  shares: [],
  _count: {
    tasks: 0,
    shares: 0,
  },
  ...overrides,
})

export const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${idCounter++}`,
  title: `Test Task ${idCounter}`,
  description: `Description for test task ${idCounter}`,
  status: 'TODO',
  priority: 'MEDIUM',
  listId: `list-${idCounter}`,
  assigneeId: null,
  dueDate: null,
  completedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  position: idCounter,
  tags: [],
  attachments: [],
  comments: [],
  list: null,
  assignee: null,
  ...overrides,
})

export const createMockListShare = (overrides: Partial<ListShare> = {}): ListShare => ({
  id: `share-${idCounter++}`,
  listId: `list-${idCounter}`,
  userId: `user-${idCounter}`,
  role: 'VIEWER',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  user: createMockUser(),
  list: createMockList(),
  ...overrides,
})

export const createMockInvitation = (overrides: Partial<Invitation> = {}): Invitation => ({
  id: `invitation-${idCounter++}`,
  email: `invitee${idCounter}@example.com`,
  listId: `list-${idCounter}`,
  inviterId: `user-${idCounter}`,
  role: 'VIEWER',
  status: 'PENDING',
  token: `token-${idCounter}`,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  inviter: createMockUser(),
  list: createMockList(),
  ...overrides,
})

export const createMockNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: `notification-${idCounter++}`,
  type: 'TASK_ASSIGNED',
  title: `Test Notification ${idCounter}`,
  message: `Message for test notification ${idCounter}`,
  userId: `user-${idCounter}`,
  entityId: `entity-${idCounter}`,
  entityType: 'task',
  read: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  data: {},
  ...overrides,
})

// Utility functions for creating multiple items
export const createMockUsers = (count: number, overrides: Partial<User> = []): User[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockUser(Array.isArray(overrides) ? overrides[index] : overrides)
  )
}

export const createMockLists = (count: number, overrides: Partial<List> = []): List[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockList(Array.isArray(overrides) ? overrides[index] : overrides)
  )
}

export const createMockTasks = (count: number, overrides: Partial<Task> = []): Task[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockTask(Array.isArray(overrides) ? overrides[index] : overrides)
  )
}

export const createMockListShares = (count: number, overrides: Partial<ListShare> = []): ListShare[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockListShare(Array.isArray(overrides) ? overrides[index] : overrides)
  )
}

export const createMockInvitations = (count: number, overrides: Partial<Invitation> = []): Invitation[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockInvitation(Array.isArray(overrides) ? overrides[index] : overrides)
  )
}

export const createMockNotifications = (count: number, overrides: Partial<Notification> = []): Notification[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockNotification(Array.isArray(overrides) ? overrides[index] : overrides)
  )
}

// Reset counter for consistent test data
export const resetIdCounter = (start: number = 1) => {
  idCounter = start
}