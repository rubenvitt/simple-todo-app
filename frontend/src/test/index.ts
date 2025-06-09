// Re-export everything from test utilities
export * from './test-utils'
export * from './factories'
export * from './helpers'
export * from './setup'

// Re-export common testing library functions
export {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
  renderHook,
} from '@testing-library/react'

export { default as userEvent } from '@testing-library/user-event'

// Re-export vitest functions
export {
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  describe,
  it,
  test,
  expect,
  vi,
  Mock,
  MockedFunction,
  SpyInstance,
} from 'vitest'