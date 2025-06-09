import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// User interaction helpers
export const user = userEvent.setup()

// Common test helpers
export const waitForLoadingToFinish = () => 
  waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

export const waitForElementToBeRemoved = (element: HTMLElement) =>
  waitFor(() => {
    expect(element).not.toBeInTheDocument()
  })

// Form helpers
export const fillForm = async (fields: Record<string, string>) => {
  for (const [label, value] of Object.entries(fields)) {
    const field = screen.getByLabelText(new RegExp(label, 'i'))
    await user.clear(field)
    await user.type(field, value)
  }
}

export const submitForm = async (buttonText = /submit|save|create|update/i) => {
  const submitButton = screen.getByRole('button', { name: buttonText })
  await user.click(submitButton)
}

// Modal helpers
export const openModal = async (triggerText: string | RegExp) => {
  const trigger = screen.getByRole('button', { name: triggerText })
  await user.click(trigger)
  
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
}

export const closeModal = async () => {
  const closeButton = screen.getByRole('button', { name: /close|cancel/i })
  await user.click(closeButton)
  
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
}

// Navigation helpers
export const navigateTo = async (linkText: string | RegExp) => {
  const link = screen.getByRole('link', { name: linkText })
  await user.click(link)
}

export const clickButton = async (buttonText: string | RegExp) => {
  const button = screen.getByRole('button', { name: buttonText })
  await user.click(button)
}

// Drag and drop helpers
export const dragAndDrop = async (
  dragElement: HTMLElement,
  dropTarget: HTMLElement
) => {
  await user.pointer([
    { target: dragElement, keys: '[MouseLeft>]' },
    { target: dropTarget },
    { keys: '[/MouseLeft]' },
  ])
}

// Assertion helpers
export const expectElementToBeVisible = (element: HTMLElement) => {
  expect(element).toBeInTheDocument()
  expect(element).toBeVisible()
}

export const expectElementToHaveText = (element: HTMLElement, text: string | RegExp) => {
  expect(element).toHaveTextContent(text)
}

export const expectFormFieldToHaveValue = (label: string | RegExp, value: string) => {
  const field = screen.getByLabelText(label)
  expect(field).toHaveValue(value)
}

export const expectFormFieldToHaveError = (label: string | RegExp, error?: string | RegExp) => {
  const field = screen.getByLabelText(label)
  expect(field).toBeInvalid()
  
  if (error) {
    const errorElement = screen.getByText(error)
    expect(errorElement).toBeInTheDocument()
  }
}

// API mocking helpers
export const mockApiResponse = <T>(data: T, delay = 0) => {
  return vi.fn().mockImplementation(() => 
    new Promise((resolve) => 
      setTimeout(() => resolve({ data }), delay)
    )
  )
}

export const mockApiError = (error: any, delay = 0) => {
  return vi.fn().mockImplementation(() => 
    new Promise((_, reject) => 
      setTimeout(() => reject(error), delay)
    )
  )
}

// Storage helpers
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length
    }
  }
}

// Date helpers
export const mockDate = (date: string | Date) => {
  const mockDate = new Date(date)
  vi.setSystemTime(mockDate)
  return mockDate
}

export const restoreDate = () => {
  vi.useRealTimers()
}

// Async testing helpers
export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

export const advanceTimers = async (ms: number) => {
  vi.advanceTimersByTime(ms)
  await flushPromises()
}

// Component testing helpers
export const renderWithin = (container: HTMLElement) => ({
  getByText: (text: string | RegExp) => within(container).getByText(text),
  getByRole: (role: string, options?: any) => within(container).getByRole(role, options),
  queryByText: (text: string | RegExp) => within(container).queryByText(text),
  queryByRole: (role: string, options?: any) => within(container).queryByRole(role, options),
})

// Custom matchers for better assertions
export const toBeInTheViewport = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect()
  const isInViewport = (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
  
  return {
    pass: isInViewport,
    message: () => 
      isInViewport 
        ? `Expected element not to be in viewport` 
        : `Expected element to be in viewport`
  }
}