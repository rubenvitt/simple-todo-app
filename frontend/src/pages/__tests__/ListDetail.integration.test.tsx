import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test'
import { ListDetail } from '../ListDetail'
import { user, clickButton, dragAndDrop } from '../../test/helpers'
import { server, useHandler } from '../../test/mocks'
import { http, HttpResponse } from 'msw'
import { createMockList, createMockTask, createMockUser } from '../../test/factories'

// Mock router
const mockParams = { id: 'list-1' }
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
  }
})

describe('ListDetail Integration Tests', () => {
  const mockUser = createMockUser({ id: '1', email: 'test@example.com', name: 'Test User' })
  const mockList = createMockList({ 
    id: 'list-1', 
    title: 'Test List',
    tasks: [
      createMockTask({ id: 'task-1', title: 'Todo Task', status: 'TODO' }),
      createMockTask({ id: 'task-2', title: 'In Progress Task', status: 'IN_PROGRESS' }),
      createMockTask({ id: 'task-3', title: 'Done Task', status: 'DONE' }),
    ]
  })

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default handlers
    useHandler(
      http.get('*/lists/list-1', () => {
        return HttpResponse.json(mockList)
      })
    )
  })

  describe('List and Tasks Loading', () => {
    it('should load and display list with tasks in kanban columns', async () => {
      render(<ListDetail />, {
        isAuthenticated: true,
        user: mockUser
      })

      // Should show loading initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument()

      // Should display list title
      await waitFor(() => {
        expect(screen.getByText('Test List')).toBeInTheDocument()
      })

      // Should display kanban columns
      expect(screen.getByText(/todo|backlog/i)).toBeInTheDocument()
      expect(screen.getByText(/in progress|doing/i)).toBeInTheDocument()
      expect(screen.getByText(/done|completed/i)).toBeInTheDocument()

      // Should display tasks in correct columns
      expect(screen.getByText('Todo Task')).toBeInTheDocument()
      expect(screen.getByText('In Progress Task')).toBeInTheDocument()
      expect(screen.getByText('Done Task')).toBeInTheDocument()

      // Should not show loading anymore
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    it('should handle list not found error', async () => {
      useHandler(
        http.get('*/lists/list-1', () => {
          return HttpResponse.json(
            { message: 'List not found' },
            { status: 404 }
          )
        })
      )

      render(<ListDetail />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText(/list not found|404/i)).toBeInTheDocument()
      })
    })

    it('should handle unauthorized access', async () => {
      useHandler(
        http.get('*/lists/list-1', () => {
          return HttpResponse.json(
            { message: 'Unauthorized' },
            { status: 403 }
          )
        })
      )

      render(<ListDetail />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText(/unauthorized|access denied/i)).toBeInTheDocument()
      })
    })
  })

  describe('Task Creation', () => {
    it('should create a new task successfully', async () => {
      const newTask = createMockTask({ 
        id: 'task-4', 
        title: 'New Task', 
        status: 'TODO',
        listId: 'list-1'
      })

      useHandler(
        http.post('*/lists/list-1/tasks', async ({ request }) => {
          const body = await request.json() as any
          return HttpResponse.json({ ...newTask, ...body }, { status: 201 })
        })
      )

      render(<ListDetail />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText('Test List')).toBeInTheDocument()
      })

      // Click add task button
      const addTaskButton = screen.getByRole('button', { name: /add task|new task/i })
      await user.click(addTaskButton)

      // Should open task creation modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Fill task form
      const titleField = screen.getByLabelText(/title/i)
      await user.type(titleField, 'New Task')

      // Submit task
      await clickButton(/create|save/i)

      // Should close modal
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      // Should display new task
      await waitFor(() => {
        expect(screen.getByText('New Task')).toBeInTheDocument()
      })
    })

    it('should handle task creation validation errors', async () => {
      useHandler(
        http.post('*/lists/list-1/tasks', () => {
          return HttpResponse.json(
            { 
              message: 'Validation failed',
              errors: {
                title: 'Title is required'
              }
            },
            { status: 400 }
          )
        })
      )

      render(<ListDetail />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText('Test List')).toBeInTheDocument()
      })

      const addTaskButton = screen.getByRole('button', { name: /add task|new task/i })
      await user.click(addTaskButton)

      // Submit empty form
      await clickButton(/create|save/i)

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      })

      // Modal should remain open
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('Drag and Drop', () => {
    it('should move task between columns via drag and drop', async () => {
      const updatedTask = { ...mockList.tasks![0], status: 'IN_PROGRESS' }

      useHandler(
        http.patch('*/tasks/task-1', async ({ request }) => {
          const body = await request.json() as any
          return HttpResponse.json({ ...updatedTask, ...body })
        })
      )

      render(<ListDetail />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })

      // Find task and target column
      const taskElement = screen.getByText('Todo Task').closest('[draggable="true"]')!
      const inProgressColumn = screen.getByText(/in progress/i).closest('[data-droppable="true"]')!

      // Perform drag and drop
      await dragAndDrop(taskElement, inProgressColumn)

      // Should optimistically update UI
      await waitFor(() => {
        const inProgressSection = screen.getByText(/in progress/i).closest('.kanban-column')
        expect(inProgressSection).toContainElement(screen.getByText('Todo Task'))
      })
    })

    it('should handle drag and drop errors gracefully', async () => {
      useHandler(
        http.patch('*/tasks/task-1', () => {
          return HttpResponse.json(
            { message: 'Failed to update task' },
            { status: 500 }
          )
        })
      )

      render(<ListDetail />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })

      const taskElement = screen.getByText('Todo Task').closest('[draggable="true"]')!
      const inProgressColumn = screen.getByText(/in progress/i).closest('[data-droppable="true"]')!

      await dragAndDrop(taskElement, inProgressColumn)

      // Should revert on error and show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to update|error/i)).toBeInTheDocument()
      })

      // Task should revert to original position
      const todoSection = screen.getByText(/todo/i).closest('.kanban-column')
      expect(todoSection).toContainElement(screen.getByText('Todo Task'))
    })
  })

  describe('Task Editing', () => {
    it('should edit task details', async () => {
      const updatedTask = { ...mockList.tasks![0], title: 'Updated Task Title' }

      useHandler(
        http.patch('*/tasks/task-1', async ({ request }) => {
          const body = await request.json() as any
          return HttpResponse.json({ ...updatedTask, ...body })
        })
      )

      render(<ListDetail />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })

      // Click on task to open edit modal
      const taskCard = screen.getByText('Todo Task')
      await user.click(taskCard)

      // Should open task edit modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Update title
      const titleField = screen.getByDisplayValue('Todo Task')
      await user.clear(titleField)
      await user.type(titleField, 'Updated Task Title')

      // Save changes
      await clickButton(/save|update/i)

      // Should close modal and show updated task
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(screen.getByText('Updated Task Title')).toBeInTheDocument()
        expect(screen.queryByText('Todo Task')).not.toBeInTheDocument()
      })
    })
  })

  describe('Task Deletion', () => {
    it('should delete task successfully', async () => {
      useHandler(
        http.delete('*/tasks/task-1', () => {
          return HttpResponse.json({ message: 'Task deleted successfully' })
        })
      )

      render(<ListDetail />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })

      // Open task options menu
      const taskCard = screen.getByText('Todo Task').closest('.task-card')
      const optionsButton = taskCard?.querySelector('[aria-label="more options"]') || 
                           screen.getByRole('button', { name: /options|menu/i })
      await user.click(optionsButton)

      // Click delete option
      const deleteButton = screen.getByRole('menuitem', { name: /delete/i }) || 
                          screen.getByRole('button', { name: /delete/i })
      await user.click(deleteButton)

      // Confirm deletion
      await waitFor(() => {
        expect(screen.getByText(/confirm|are you sure/i)).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /confirm|delete/i })
      await user.click(confirmButton)

      // Task should be removed
      await waitFor(() => {
        expect(screen.queryByText('Todo Task')).not.toBeInTheDocument()
      })
    })
  })

  describe('Search and Filter', () => {
    it('should filter tasks by search term', async () => {
      render(<ListDetail />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
        expect(screen.getByText('In Progress Task')).toBeInTheDocument()
        expect(screen.getByText('Done Task')).toBeInTheDocument()
      })

      // Search for "todo"
      const searchField = screen.getByPlaceholderText(/search tasks/i)
      await user.type(searchField, 'todo')

      // Should show only matching tasks
      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
        expect(screen.queryByText('In Progress Task')).not.toBeInTheDocument()
        expect(screen.queryByText('Done Task')).not.toBeInTheDocument()
      })
    })

    it('should filter tasks by status', async () => {
      render(<ListDetail />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })

      // Open filter dropdown
      const filterButton = screen.getByRole('button', { name: /filter/i })
      await user.click(filterButton)

      // Select "Done" filter
      const doneFilter = screen.getByRole('option', { name: /done|completed/i })
      await user.click(doneFilter)

      // Should show only done tasks
      await waitFor(() => {
        expect(screen.getByText('Done Task')).toBeInTheDocument()
        expect(screen.queryByText('Todo Task')).not.toBeInTheDocument()
        expect(screen.queryByText('In Progress Task')).not.toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should update tasks when changes are received via WebSocket', async () => {
      render(<ListDetail />, {
        isAuthenticated: true,
        user: mockUser,
        isConnected: true
      })

      await waitFor(() => {
        expect(screen.getByText('Todo Task')).toBeInTheDocument()
      })

      // Simulate WebSocket update
      // This would require mocking the WebSocket context
      // and triggering task update events
    })
  })

  describe('Permissions and Access Control', () => {
    it('should hide edit/delete actions for viewers', async () => {
      const viewerList = { 
        ...mockList, 
        userRole: 'VIEWER' as const
      }

      useHandler(
        http.get('*/lists/list-1', () => {
          return HttpResponse.json(viewerList)
        })
      )

      render(<ListDetail />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText('Test List')).toBeInTheDocument()
      })

      // Should not show add task button for viewers
      expect(screen.queryByRole('button', { name: /add task/i })).not.toBeInTheDocument()

      // Tasks should not be editable
      const taskCard = screen.getByText('Todo Task')
      expect(taskCard.closest('[draggable="true"]')).toBeNull()
    })

    it('should show all actions for editors and owners', async () => {
      const editorList = { 
        ...mockList, 
        userRole: 'EDITOR' as const
      }

      useHandler(
        http.get('*/lists/list-1', () => {
          return HttpResponse.json(editorList)
        })
      )

      render(<ListDetail />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText('Test List')).toBeInTheDocument()
      })

      // Should show add task button for editors
      expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()

      // Tasks should be draggable
      const taskCard = screen.getByText('Todo Task')
      expect(taskCard.closest('[draggable="true"]')).toBeInTheDocument()
    })
  })
})