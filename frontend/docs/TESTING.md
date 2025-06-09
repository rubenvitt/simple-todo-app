# Frontend Testing Guide

This document provides comprehensive guidance for testing the frontend application.

## Testing Stack

- **Test Runner**: Vitest
- **Testing Library**: React Testing Library
- **Mocking**: MSW (Mock Service Worker)
- **Coverage**: v8 provider
- **Assertion Library**: Vitest built-in assertions

## Project Structure

```
frontend/src/
├── test/                           # Test configuration and utilities
│   ├── __mocks__/                 # Global mocks
│   ├── mocks/                     # MSW handlers and setup
│   ├── factories.ts               # Test data factories
│   ├── helpers.ts                 # Test helper functions
│   ├── test-utils.tsx             # Custom render with providers
│   ├── setup.ts                   # Global test setup
│   └── index.ts                   # Re-exports for easy importing
├── components/                    # Component tests alongside source
│   └── **/__tests__/
├── pages/                         # Page/integration tests
│   └── **/__tests__/
├── hooks/                         # Hook tests
│   └── **/__tests__/
├── services/                      # Service/API tests
│   └── **/__tests__/
└── types/                         # Type/validation tests
    └── **/__tests__/
```

## Test Types

### Unit Tests
Test individual components, hooks, and utility functions in isolation.

```tsx
// Component unit test example
import { render, screen } from '../../test'
import { LoginForm } from '../LoginForm'

describe('LoginForm', () => {
  it('should render login fields', () => {
    render(<LoginForm onSubmit={vi.fn()} />)
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })
})
```

### Integration Tests
Test complete user workflows and component interactions.

```tsx
// Integration test example
import { render, screen, waitFor } from '../../test'
import { AuthPage } from '../AuthPage'
import { user, fillForm, submitForm } from '../../test/helpers'

describe('AuthPage Integration', () => {
  it('should complete login flow', async () => {
    render(<AuthPage />)
    
    await fillForm({
      email: 'test@example.com',
      password: 'password'
    })
    
    await submitForm(/sign in/i)
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })
})
```

## Test Utilities

### Custom Render
Use the custom render function to wrap components with providers:

```tsx
import { render } from '../test'

// Render with default providers
render(<Component />)

// Render with custom auth state
render(<Component />, {
  isAuthenticated: true,
  user: mockUser
})

// Render with custom theme
render(<Component />, {
  theme: 'dark'
})
```

### Test Factories
Use factories to create consistent test data:

```tsx
import { createMockUser, createMockList, createMockTask } from '../test/factories'

const user = createMockUser({ email: 'test@example.com' })
const list = createMockList({ title: 'Test List', ownerId: user.id })
const task = createMockTask({ listId: list.id, status: 'TODO' })
```

### Test Helpers
Use helper functions for common interactions:

```tsx
import { user, fillForm, submitForm, openModal, closeModal } from '../test/helpers'

// Fill form fields
await fillForm({
  email: 'test@example.com',
  password: 'password'
})

// Submit form
await submitForm(/submit|save/i)

// Open modal
await openModal(/create list/i)

// Close modal
await closeModal()
```

## API Mocking with MSW

### Default Handlers
MSW handlers are set up for all API endpoints with realistic responses:

```tsx
// Handlers are automatically loaded in test setup
// Override specific handlers in tests:
import { useHandler } from '../test/mocks'

useHandler(
  http.post('*/auth/login', () => {
    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    )
  })
)
```

### Testing Error States
```tsx
// Test network errors
useHandler(
  http.get('*/lists', () => {
    return HttpResponse.error()
  })
)

// Test validation errors
useHandler(
  http.post('*/lists', () => {
    return HttpResponse.json(
      { 
        message: 'Validation failed',
        errors: { title: 'Title is required' }
      },
      { status: 400 }
    )
  })
)
```

## Running Tests

### Commands
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests once with coverage
pnpm test:coverage

# Run specific test file
pnpm test LoginForm.test.tsx

# Run tests matching pattern
pnpm test --grep "authentication"
```

### Coverage Reports
Coverage reports are generated in multiple formats:
- **Text**: Console output during test runs
- **HTML**: `coverage/index.html` - Interactive browsable report
- **LCOV**: `coverage/lcov.info` - For CI/CD and external tools
- **JSON**: `coverage/coverage-final.json` - Machine-readable format

### Coverage Thresholds
- **Global**: 80% for all metrics (statements, branches, functions, lines)
- **Components**: 85% for all metrics
- **Hooks**: 90% for all metrics
- **Services**: 85% for all metrics

## Testing Patterns

### Testing Async Operations
```tsx
it('should handle async operations', async () => {
  render(<AsyncComponent />)
  
  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })
  
  // Assert final state
  expect(screen.getByText('Data loaded')).toBeInTheDocument()
})
```

### Testing User Interactions
```tsx
it('should handle user interactions', async () => {
  render(<InteractiveComponent />)
  
  const button = screen.getByRole('button', { name: /click me/i })
  await user.click(button)
  
  expect(screen.getByText('Button clicked')).toBeInTheDocument()
})
```

### Testing Forms
```tsx
it('should validate form submission', async () => {
  const mockSubmit = vi.fn()
  render(<Form onSubmit={mockSubmit} />)
  
  await fillForm({
    email: 'invalid-email',
    password: 'short'
  })
  
  await submitForm()
  
  // Should show validation errors
  expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
  expect(screen.getByText(/password too short/i)).toBeInTheDocument()
  
  // Should not call submit handler
  expect(mockSubmit).not.toHaveBeenCalled()
})
```

### Testing Navigation
```tsx
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}))

it('should navigate on success', async () => {
  render(<ComponentWithNavigation />)
  
  await user.click(screen.getByRole('button', { name: /continue/i }))
  
  expect(mockNavigate).toHaveBeenCalledWith('/next-page')
})
```

### Testing Context Providers
```tsx
it('should provide context values', () => {
  const TestComponent = () => {
    const { user } = useAuth()
    return <div>{user?.name || 'No user'}</div>
  }
  
  render(<TestComponent />, {
    user: createMockUser({ name: 'Test User' })
  })
  
  expect(screen.getByText('Test User')).toBeInTheDocument()
})
```

## Debugging Tests

### VS Code Integration
Add to `.vscode/launch.json`:

```json
{
  "name": "Debug Vitest Tests",
  "type": "node",
  "request": "launch",
  "cwd": "${workspaceFolder}/frontend",
  "program": "${workspaceFolder}/frontend/node_modules/vitest/vitest.mjs",
  "args": ["--reporter=verbose"],
  "console": "integratedTerminal",
  "skipFiles": ["<node_internals>/**"]
}
```

### Debug Individual Tests
```bash
# Run single test file with debugging
pnpm test --reporter=verbose LoginForm.test.tsx

# Run with UI for interactive debugging
pnpm test:ui
```

### Common Debugging Techniques
```tsx
// Debug rendered component
import { screen } from '../test'

render(<Component />)
screen.debug() // Prints current DOM state

// Debug specific element
const element = screen.getByRole('button')
screen.debug(element)

// Use logRoles to see available roles
import { logRoles } from '@testing-library/react'
logRoles(screen.getByTestId('container'))
```

## Best Practices

### Writing Tests
1. **Use descriptive test names** that explain the behavior being tested
2. **Follow the AAA pattern**: Arrange, Act, Assert
3. **Test behavior, not implementation details**
4. **Use accessible queries** (getByRole, getByLabelText) over brittle selectors
5. **Mock at the network boundary** using MSW instead of mocking modules
6. **Write integration tests** for critical user workflows

### Test Organization
1. **Group related tests** in describe blocks
2. **Use beforeEach/afterEach** for common setup/cleanup
3. **Keep tests focused** - one behavior per test
4. **Use factories** for consistent test data
5. **Share common logic** through helper functions

### Performance
1. **Avoid unnecessary renders** by using proper cleanup
2. **Mock expensive operations** that aren't under test
3. **Use appropriate timeouts** for async operations
4. **Run tests in parallel** (default in Vitest)

### Accessibility
1. **Test with screen readers** in mind
2. **Verify keyboard navigation** works correctly
3. **Check color contrast** and visual indicators
4. **Test with different viewport sizes**

## CI/CD Integration

Tests run automatically on:
- Every push to main/develop branches
- Every pull request
- Coverage reports are generated and uploaded
- Build fails if coverage falls below thresholds

See `.github/workflows/frontend-ci.yml` for complete CI configuration.

## Troubleshooting

### Common Issues

**Tests failing due to missing mocks**
```bash
# Mock missing modules
vi.mock('module-name', () => ({
  default: vi.fn(),
  namedExport: vi.fn()
}))
```

**Async tests timing out**
```tsx
// Increase timeout for slow operations
await waitFor(() => {
  expect(element).toBeInTheDocument()
}, { timeout: 5000 })
```

**MSW handlers not working**
```tsx
// Ensure handlers are properly configured
import { server } from '../test/mocks'

beforeEach(() => {
  server.resetHandlers() // Reset to default handlers
})
```

**Coverage thresholds failing**
```bash
# Check which files are below threshold
pnpm test:coverage --reporter=verbose

# View detailed HTML report
open frontend/coverage/index.html
```

For more detailed information, see:
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/docs/)