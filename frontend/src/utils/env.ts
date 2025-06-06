export const env = {
  apiUrl: import.meta.env.VITE_API_URL,
  wsUrl: import.meta.env.VITE_WS_URL,
  appName: import.meta.env.VITE_APP_NAME,
  appVersion: import.meta.env.VITE_APP_VERSION,
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableMockApi: import.meta.env.VITE_ENABLE_MOCK_API === 'true',
  debug: import.meta.env.VITE_DEBUG === 'true',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const

// Validation function to ensure all required env vars are set
export function validateEnv() {
  const required = ['apiUrl', 'wsUrl', 'appName', 'appVersion'] as const
  
  const missing = required.filter((key) => !env[key])
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing
        .map((key) => `VITE_${key.toUpperCase().replace(/([A-Z])/g, '_$1')}`)
        .join(', ')}`,
    )
  }
}