import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { I18nProvider } from './contexts/I18nContext'
import { MobileTestWidget } from './components/testing/MobileTestWidget'
import { PerformanceOverlay, MobileErrorBoundary } from './components'
import { queryClient } from './services/queryClient'
import { router } from './config/router'
import { initializeCriticalResources } from './utils'
import { initializeAnimationSystems } from './utils/animation-performance.tsx'
import { performanceMonitoring, performanceBudget } from './services'
import './config/i18n'
import './index.css'

// Initialize critical resource preloading
initializeCriticalResources();

// Initialize animation systems
initializeAnimationSystems();

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Performance monitoring is automatically initialized in the service constructors
  
  // Request notification permission for budget alerts
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider>
          <ThemeProvider>
            <MobileErrorBoundary>
              <RouterProvider router={router} />
              {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
              {import.meta.env.DEV && <MobileTestWidget />}
              {/* Performance Overlay - disabled by default, enable with localStorage.setItem('showPerformanceOverlay', 'true') */}
              {import.meta.env.DEV && localStorage.getItem('showPerformanceOverlay') === 'true' && <PerformanceOverlay />}
            </MobileErrorBoundary>
          </ThemeProvider>
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
