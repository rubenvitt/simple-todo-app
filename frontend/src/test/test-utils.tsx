import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { vi } from 'vitest'
// Create mock contexts for testing
const AuthContext = React.createContext<any>({})
const WebSocketContext = React.createContext<any>({})
const I18nContext = React.createContext<any>({})
const ThemeContext = React.createContext<any>({})
import type { User } from '@simple-todo-app/shared'

export interface TestUser {
  id: string
  email: string
  name: string
  avatar?: string
}

export interface AuthContextValue {
  user: TestUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<TestUser>) => Promise<void>
}

export interface WebSocketContextValue {
  socket: any
  isConnected: boolean
  connect: () => void
  disconnect: () => void
  subscribe: (event: string, callback: (data: any) => void) => () => void
  emit: (event: string, data?: any) => void
}

export interface I18nContextValue {
  language: string
  setLanguage: (lang: string) => void
  t: (key: string, options?: any) => string
}

export interface ThemeContextValue {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Auth provider options
  user?: TestUser | null
  isAuthenticated?: boolean
  isLoading?: boolean
  
  // WebSocket provider options
  isConnected?: boolean
  
  // Router options
  initialEntries?: string[]
  
  // Theme options
  theme?: 'light' | 'dark'
  
  // Language options
  language?: string
  
  // Query client options
  queryClient?: QueryClient
}

// Default mock auth context
const createMockAuthContext = (options: CustomRenderOptions): AuthContextValue => ({
  user: options.user ?? null,
  isAuthenticated: options.isAuthenticated ?? false,
  isLoading: options.isLoading ?? false,
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  updateProfile: vi.fn().mockResolvedValue(undefined),
})

// Default mock WebSocket context
const createMockWebSocketContext = (options: CustomRenderOptions): WebSocketContextValue => ({
  socket: null,
  isConnected: options.isConnected ?? false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  subscribe: vi.fn().mockReturnValue(() => {}),
  emit: vi.fn(),
})

// Default mock i18n context
const createMockI18nContext = (options: CustomRenderOptions): I18nContextValue => ({
  language: options.language ?? 'en',
  setLanguage: vi.fn(),
  t: vi.fn().mockImplementation((key: string) => key),
})

// Default mock theme context
const createMockThemeContext = (options: CustomRenderOptions): ThemeContextValue => ({
  theme: options.theme ?? 'light',
  setTheme: vi.fn(),
})

function AllTheProviders({ children, ...options }: { children: React.ReactNode } & CustomRenderOptions) {
  const queryClient = options.queryClient ?? new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  const authContextValue = createMockAuthContext(options)
  const webSocketContextValue = createMockWebSocketContext(options)
  const i18nContextValue = createMockI18nContext(options)
  const themeContextValue = createMockThemeContext(options)

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthContext.Provider value={authContextValue}>
          <WebSocketContext.Provider value={webSocketContextValue}>
            <I18nContext.Provider value={i18nContextValue}>
              <ThemeContext.Provider value={themeContextValue}>
                <ConfigProvider theme={{ algorithm: options.theme === 'dark' ? 'dark' : 'default' as any }}>
                  {children}
                </ConfigProvider>
              </ThemeContext.Provider>
            </I18nContext.Provider>
          </WebSocketContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient, ...renderOptions } = options
  
  return render(ui, {
    wrapper: ({ children }) => <AllTheProviders {...options}>{children}</AllTheProviders>,
    ...renderOptions,
  })
}

export * from '@testing-library/react'
export { customRender as render }