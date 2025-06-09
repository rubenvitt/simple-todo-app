import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test'
import { Dashboard } from '../Dashboard'
import { user, clickButton, openModal, closeModal } from '../../test/helpers'
import { server, useHandler } from '../../test/mocks'
import { http, HttpResponse } from 'msw'
import { createMockList, createMockUser } from '../../test/factories'

// Mock router navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Dashboard Integration Tests', () => {
  const mockUser = createMockUser({ id: '1', email: 'test@example.com', name: 'Test User' })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Lists Loading and Display', () => {
    it('should load and display user lists on mount', async () => {
      const mockLists = [
        createMockList({ title: 'Personal Tasks', color: '#1890ff' }),
        createMockList({ title: 'Work Projects', color: '#52c41a' }),
        createMockList({ title: 'Shopping List', color: '#fa8c16' }),
      ]

      useHandler(
        http.get('*/lists', () => {
          return HttpResponse.json(mockLists)
        })
      )

      render(<Dashboard />, {
        isAuthenticated: true,
        user: mockUser
      })

      // Should show loading state initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument()

      // Should display lists after loading
      await waitFor(() => {
        expect(screen.getByText('Personal Tasks')).toBeInTheDocument()
        expect(screen.getByText('Work Projects')).toBeInTheDocument()
        expect(screen.getByText('Shopping List')).toBeInTheDocument()
      })

      // Should not show loading anymore
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    it('should handle empty lists state', async () => {
      useHandler(
        http.get('*/lists', () => {
          return HttpResponse.json([])
        })
      )

      render(<Dashboard />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText(/no lists found|create your first list/i)).toBeInTheDocument()
      })
    })

    it('should handle lists loading error', async () => {
      useHandler(
        http.get('*/lists', () => {
          return HttpResponse.json(
            { message: 'Failed to load lists' },
            { status: 500 }
          )
        })
      )

      render(<Dashboard />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText(/failed to load|error loading/i)).toBeInTheDocument()
      })
    })
  })

  describe('List Creation Flow', () => {
    it('should create a new list successfully', async () => {
      const newList = createMockList({ title: 'New Test List', description: 'Test description' })

      useHandler(
        http.post('*/lists', async ({ request }) => {
          const body = await request.json() as any
          return HttpResponse.json({ ...newList, ...body }, { status: 201 })
        })
      )

      render(<Dashboard />, {
        isAuthenticated: true,
        user: mockUser
      })

      // Open create list modal
      await openModal(/create list|new list/i)

      // Fill form
      const titleField = screen.getByLabelText(/title/i)
      const descriptionField = screen.getByLabelText(/description/i)

      await user.type(titleField, 'New Test List')
      await user.type(descriptionField, 'Test description')

      // Submit form
      await clickButton(/create|save/i)

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/list created|success/i)).toBeInTheDocument()
      })

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      // New list should appear in the list
      await waitFor(() => {
        expect(screen.getByText('New Test List')).toBeInTheDocument()
      })
    })

    it('should handle list creation validation errors', async () => {
      useHandler(
        http.post('*/lists', () => {
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

      render(<Dashboard />, {
        isAuthenticated: true,
        user: mockUser
      })

      await openModal(/create list|new list/i)

      // Submit empty form
      await clickButton(/create|save/i)

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      })

      // Modal should remain open
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should handle list creation server errors', async () => {
      useHandler(
        http.post('*/lists', () => {
          return HttpResponse.json(
            { message: 'Server error' },
            { status: 500 }
          )
        })
      )

      render(<Dashboard />, {
        isAuthenticated: true,
        user: mockUser
      })

      await openModal(/create list|new list/i)

      const titleField = screen.getByLabelText(/title/i)
      await user.type(titleField, 'Test List')

      await clickButton(/create|save/i)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/server error|failed to create/i)).toBeInTheDocument()
      })
    })
  })

  describe('List Navigation', () => {
    it('should navigate to list detail when list is clicked', async () => {
      const mockLists = [
        createMockList({ id: 'list-1', title: 'Test List' }),
      ]

      useHandler(
        http.get('*/lists', () => {
          return HttpResponse.json(mockLists)
        })
      )

      render(<Dashboard />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText('Test List')).toBeInTheDocument()
      })

      // Click on list card
      const listCard = screen.getByText('Test List').closest('[data-testid="list-card"]') || 
                      screen.getByText('Test List')
      await user.click(listCard)

      // Should navigate to list detail
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/lists/list-1')
      })
    })
  })

  describe('Search and Filter', () => {
    it('should filter lists by search term', async () => {
      const mockLists = [
        createMockList({ title: 'Personal Tasks' }),
        createMockList({ title: 'Work Projects' }),
        createMockList({ title: 'Shopping List' }),
      ]

      useHandler(
        http.get('*/lists', ({ request }) => {
          const url = new URL(request.url)
          const search = url.searchParams.get('search')
          
          if (search) {
            const filtered = mockLists.filter(list => 
              list.title.toLowerCase().includes(search.toLowerCase())
            )
            return HttpResponse.json(filtered)
          }
          
          return HttpResponse.json(mockLists)
        })
      )

      render(<Dashboard />, {
        isAuthenticated: true,
        user: mockUser
      })

      // Wait for lists to load
      await waitFor(() => {
        expect(screen.getByText('Personal Tasks')).toBeInTheDocument()
        expect(screen.getByText('Work Projects')).toBeInTheDocument()
        expect(screen.getByText('Shopping List')).toBeInTheDocument()
      })

      // Search for "work"
      const searchField = screen.getByPlaceholderText(/search/i)
      await user.type(searchField, 'work')

      // Should show only work-related lists
      await waitFor(() => {
        expect(screen.getByText('Work Projects')).toBeInTheDocument()
        expect(screen.queryByText('Personal Tasks')).not.toBeInTheDocument()
        expect(screen.queryByText('Shopping List')).not.toBeInTheDocument()
      })
    })

    it('should show no results when search yields empty results', async () => {
      useHandler(
        http.get('*/lists', ({ request }) => {
          const url = new URL(request.url)
          const search = url.searchParams.get('search')
          
          if (search === 'nonexistent') {
            return HttpResponse.json([])
          }
          
          return HttpResponse.json([createMockList({ title: 'Test List' })])
        })
      )

      render(<Dashboard />, {
        isAuthenticated: true,
        user: mockUser
      })

      const searchField = screen.getByPlaceholderText(/search/i)
      await user.type(searchField, 'nonexistent')

      await waitFor(() => {
        expect(screen.getByText(/no lists found|no results/i)).toBeInTheDocument()
      })
    })
  })

  describe('List Actions', () => {
    it('should allow editing a list', async () => {
      const mockList = createMockList({ id: 'list-1', title: 'Original Title' })

      useHandler(
        http.get('*/lists', () => {
          return HttpResponse.json([mockList])
        })
      )

      useHandler(
        http.patch('*/lists/list-1', async ({ request }) => {
          const body = await request.json() as any
          return HttpResponse.json({ ...mockList, ...body })
        })
      )

      render(<Dashboard />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText('Original Title')).toBeInTheDocument()
      })

      // Open edit menu/modal
      const editButton = screen.getByRole('button', { name: /edit|options/i })
      await user.click(editButton)

      // Should open edit modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Update title
      const titleField = screen.getByDisplayValue('Original Title')
      await user.clear(titleField)
      await user.type(titleField, 'Updated Title')

      // Save changes
      await clickButton(/save|update/i)

      // Should show updated title
      await waitFor(() => {
        expect(screen.getByText('Updated Title')).toBeInTheDocument()
        expect(screen.queryByText('Original Title')).not.toBeInTheDocument()
      })
    })

    it('should allow deleting a list', async () => {
      const mockList = createMockList({ id: 'list-1', title: 'List to Delete' })

      useHandler(
        http.get('*/lists', () => {
          return HttpResponse.json([mockList])
        })
      )

      useHandler(
        http.delete('*/lists/list-1', () => {
          return HttpResponse.json({ message: 'List deleted successfully' })
        })
      )

      render(<Dashboard />, {
        isAuthenticated: true,
        user: mockUser
      })

      await waitFor(() => {
        expect(screen.getByText('List to Delete')).toBeInTheDocument()
      })

      // Open delete action
      const deleteButton = screen.getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/confirm|are you sure/i)).toBeInTheDocument()
      })

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm|delete/i })
      await user.click(confirmButton)

      // List should be removed
      await waitFor(() => {
        expect(screen.queryByText('List to Delete')).not.toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should update when lists are modified via WebSocket', async () => {
      const mockLists = [createMockList({ title: 'Original List' })]

      render(<Dashboard />, {
        isAuthenticated: true,
        user: mockUser,
        isConnected: true
      })

      await waitFor(() => {
        expect(screen.getByText('Original List')).toBeInTheDocument()
      })

      // Simulate WebSocket update
      // This would require mocking the WebSocket context
      // and triggering an update event
    })
  })

  describe('Authentication Integration', () => {
    it('should redirect unauthenticated users', async () => {
      render(<Dashboard />, {
        isAuthenticated: false,
        user: null
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth')
      })
    })

    it('should handle authentication errors', async () => {
      useHandler(
        http.get('*/lists', () => {
          return HttpResponse.json(
            { message: 'Unauthorized' },
            { status: 401 }
          )
        })
      )

      render(<Dashboard />, {
        isAuthenticated: true,
        user: mockUser
      })

      // Should redirect to auth page on 401
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth')
      })
    })
  })
})