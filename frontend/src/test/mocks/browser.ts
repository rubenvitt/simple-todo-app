import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// This configures a Service Worker with the given request handlers.
export const worker = setupWorker(...handlers)

// Start the worker in development mode
export const startMockingInBrowser = async () => {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true') {
    await worker.start({
      onUnhandledRequest: 'warn',
    })
    console.log('🔶 MSW: Mocking enabled in browser')
  }
}

// For manual testing/debugging
if (import.meta.env.DEV) {
  (window as any).msw = {
    worker,
    handlers,
  }
}