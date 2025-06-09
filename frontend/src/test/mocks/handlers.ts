import { http, HttpResponse } from 'msw'
import {
  createMockUser,
  createMockList,
  createMockTask,
  createMockListShare,
  createMockInvitation,
  createMockNotification,
} from '../factories'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Auth handlers
export const authHandlers = [
  // Login
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as any
    const { email, password } = body

    if (email === 'test@example.com' && password === 'password') {
      return HttpResponse.json({
        user: createMockUser({ email, name: 'Test User' }),
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      })
    }

    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  // Register
  http.post(`${API_BASE_URL}/auth/register`, async ({ request }) => {
    const body = await request.json() as any
    const { email, password, name } = body

    return HttpResponse.json({
      user: createMockUser({ email, name }),
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    })
  }),

  // Validate token
  http.get(`${API_BASE_URL}/auth/validate`, () => {
    return HttpResponse.json({
      user: createMockUser({ email: 'test@example.com', name: 'Test User' }),
    })
  }),

  // Refresh token
  http.post(`${API_BASE_URL}/auth/refresh`, () => {
    return HttpResponse.json({
      accessToken: 'new-mock-access-token',
      refreshToken: 'new-mock-refresh-token',
    })
  }),

  // Logout
  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json({ message: 'Logged out successfully' })
  }),
]

// Lists handlers
export const listsHandlers = [
  // Get all lists
  http.get(`${API_BASE_URL}/lists`, () => {
    const lists = [
      createMockList({ title: 'Personal Tasks', color: '#1890ff' }),
      createMockList({ title: 'Work Projects', color: '#52c41a' }),
      createMockList({ title: 'Shopping List', color: '#fa8c16' }),
    ]
    return HttpResponse.json(lists)
  }),

  // Get list by ID
  http.get(`${API_BASE_URL}/lists/:id`, ({ params }) => {
    const list = createMockList({ 
      id: params.id as string,
      title: 'Test List',
      tasks: [
        createMockTask({ title: 'Task 1', status: 'TODO' }),
        createMockTask({ title: 'Task 2', status: 'IN_PROGRESS' }),
        createMockTask({ title: 'Task 3', status: 'DONE' }),
      ]
    })
    return HttpResponse.json(list)
  }),

  // Create list
  http.post(`${API_BASE_URL}/lists`, async ({ request }) => {
    const body = await request.json() as any
    const newList = createMockList(body)
    return HttpResponse.json(newList, { status: 201 })
  }),

  // Update list
  http.patch(`${API_BASE_URL}/lists/:id`, async ({ params, request }) => {
    const body = await request.json() as any
    const updatedList = createMockList({ id: params.id as string, ...body })
    return HttpResponse.json(updatedList)
  }),

  // Delete list
  http.delete(`${API_BASE_URL}/lists/:id`, () => {
    return HttpResponse.json({ message: 'List deleted successfully' })
  }),
]

// Tasks handlers
export const tasksHandlers = [
  // Get tasks for a list
  http.get(`${API_BASE_URL}/lists/:listId/tasks`, () => {
    const tasks = [
      createMockTask({ title: 'Task 1', status: 'TODO' }),
      createMockTask({ title: 'Task 2', status: 'IN_PROGRESS' }),
      createMockTask({ title: 'Task 3', status: 'DONE' }),
    ]
    return HttpResponse.json(tasks)
  }),

  // Create task
  http.post(`${API_BASE_URL}/lists/:listId/tasks`, async ({ params, request }) => {
    const body = await request.json() as any
    const newTask = createMockTask({ listId: params.listId as string, ...body })
    return HttpResponse.json(newTask, { status: 201 })
  }),

  // Update task
  http.patch(`${API_BASE_URL}/tasks/:id`, async ({ params, request }) => {
    const body = await request.json() as any
    const updatedTask = createMockTask({ id: params.id as string, ...body })
    return HttpResponse.json(updatedTask)
  }),

  // Delete task
  http.delete(`${API_BASE_URL}/tasks/:id`, () => {
    return HttpResponse.json({ message: 'Task deleted successfully' })
  }),

  // Bulk update task status
  http.patch(`${API_BASE_URL}/tasks/bulk-status`, async ({ request }) => {
    const body = await request.json() as any
    const { taskIds, status } = body
    
    const updatedTasks = taskIds.map((id: string) => 
      createMockTask({ id, status })
    )
    
    return HttpResponse.json(updatedTasks)
  }),
]

// List shares handlers
export const listSharesHandlers = [
  // Get list shares
  http.get(`${API_BASE_URL}/lists/:listId/shares`, () => {
    const shares = [
      createMockListShare({ role: 'EDITOR' }),
      createMockListShare({ role: 'VIEWER' }),
    ]
    return HttpResponse.json(shares)
  }),

  // Create list share
  http.post(`${API_BASE_URL}/lists/:listId/shares`, async ({ params, request }) => {
    const body = await request.json() as any
    const newShare = createMockListShare({ listId: params.listId as string, ...body })
    return HttpResponse.json(newShare, { status: 201 })
  }),

  // Update list share
  http.patch(`${API_BASE_URL}/list-shares/:id`, async ({ params, request }) => {
    const body = await request.json() as any
    const updatedShare = createMockListShare({ id: params.id as string, ...body })
    return HttpResponse.json(updatedShare)
  }),

  // Delete list share
  http.delete(`${API_BASE_URL}/list-shares/:id`, () => {
    return HttpResponse.json({ message: 'Share removed successfully' })
  }),
]

// Users handlers
export const usersHandlers = [
  // Search users
  http.get(`${API_BASE_URL}/users/search`, ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q') || ''
    
    const users = [
      createMockUser({ email: 'john@example.com', name: 'John Doe' }),
      createMockUser({ email: 'jane@example.com', name: 'Jane Smith' }),
    ].filter(user => 
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase())
    )
    
    return HttpResponse.json(users)
  }),

  // Get user profile
  http.get(`${API_BASE_URL}/users/profile`, () => {
    return HttpResponse.json(createMockUser({ email: 'test@example.com', name: 'Test User' }))
  }),

  // Update user profile
  http.patch(`${API_BASE_URL}/users/profile`, async ({ request }) => {
    const body = await request.json() as any
    const updatedUser = createMockUser({ email: 'test@example.com', ...body })
    return HttpResponse.json(updatedUser)
  }),
]

// Invitations handlers
export const invitationsHandlers = [
  // Get invitations
  http.get(`${API_BASE_URL}/invitations`, () => {
    const invitations = [
      createMockInvitation({ status: 'PENDING' }),
      createMockInvitation({ status: 'ACCEPTED' }),
    ]
    return HttpResponse.json(invitations)
  }),

  // Create invitation
  http.post(`${API_BASE_URL}/invitations`, async ({ request }) => {
    const body = await request.json() as any
    const newInvitation = createMockInvitation(body)
    return HttpResponse.json(newInvitation, { status: 201 })
  }),

  // Accept invitation
  http.post(`${API_BASE_URL}/invitations/:token/accept`, ({ params }) => {
    const invitation = createMockInvitation({ 
      token: params.token as string, 
      status: 'ACCEPTED' 
    })
    return HttpResponse.json(invitation)
  }),

  // Decline invitation
  http.post(`${API_BASE_URL}/invitations/:token/decline`, ({ params }) => {
    const invitation = createMockInvitation({ 
      token: params.token as string, 
      status: 'DECLINED' 
    })
    return HttpResponse.json(invitation)
  }),
]

// Notifications handlers
export const notificationsHandlers = [
  // Get notifications
  http.get(`${API_BASE_URL}/notifications`, () => {
    const notifications = [
      createMockNotification({ type: 'TASK_ASSIGNED', read: false }),
      createMockNotification({ type: 'LIST_SHARED', read: true }),
      createMockNotification({ type: 'TASK_COMPLETED', read: false }),
    ]
    return HttpResponse.json(notifications)
  }),

  // Mark notification as read
  http.patch(`${API_BASE_URL}/notifications/:id/read`, ({ params }) => {
    const notification = createMockNotification({ 
      id: params.id as string, 
      read: true 
    })
    return HttpResponse.json(notification)
  }),

  // Mark all notifications as read
  http.patch(`${API_BASE_URL}/notifications/mark-all-read`, () => {
    return HttpResponse.json({ message: 'All notifications marked as read' })
  }),
]

// Combine all handlers
export const handlers = [
  ...authHandlers,
  ...listsHandlers,
  ...tasksHandlers,
  ...listSharesHandlers,
  ...usersHandlers,
  ...invitationsHandlers,
  ...notificationsHandlers,
]