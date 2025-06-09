import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// This configures a request mocking server with the given request handlers.
export const server = setupServer(...handlers)

// Additional utilities for test-specific mocking
export const resetHandlers = () => server.resetHandlers(...handlers)

export const useHandler = (handler: any) => {
  server.use(handler)
}

export const restoreHandlers = () => {
  server.restoreHandlers()
}