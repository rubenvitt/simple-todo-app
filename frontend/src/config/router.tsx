import { createBrowserRouter } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import { ProtectedRoute, AppLayout } from '../components';

// Lazy load components for code splitting
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const ListDetail = lazy(() => import('../pages/ListDetail'));
const Profile = lazy(() => import('../pages/Profile'));
const Settings = lazy(() => import('../pages/Settings'));

// Loading component with error boundary
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '200px' 
  }}>
    <Spin size="large" />
  </div>
);

// Error boundary for lazy loading failures
const ErrorFallback = () => (
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '200px',
    color: '#ff4d4f'
  }}>
    <p>Fehler beim Laden der Seite</p>
    <button onClick={() => window.location.reload()}>
      Seite neu laden
    </button>
  </div>
);

// Wrapper for lazy components with error boundary
const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingFallback />}>
    {children}
  </Suspense>
);

// Protected wrapper that includes layout
const ProtectedLayoutWrapper = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>
      {children}
    </AppLayout>
  </ProtectedRoute>
);

export const router = createBrowserRouter([
  // Public routes (no authentication required)
  {
    path: '/login',
    element: (
      <LazyWrapper>
        <Login />
      </LazyWrapper>
    ),
  },
  {
    path: '/register',
    element: (
      <LazyWrapper>
        <Register />
      </LazyWrapper>
    ),
  },
  // Protected routes (authentication required)
  {
    path: '/',
    element: (
      <ProtectedLayoutWrapper>
        <LazyWrapper>
          <Dashboard />
        </LazyWrapper>
      </ProtectedLayoutWrapper>
    ),
  },
  {
    path: '/lists/:id',
    element: (
      <ProtectedLayoutWrapper>
        <LazyWrapper>
          <ListDetail />
        </LazyWrapper>
      </ProtectedLayoutWrapper>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedLayoutWrapper>
        <LazyWrapper>
          <Profile />
        </LazyWrapper>
      </ProtectedLayoutWrapper>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedLayoutWrapper>
        <LazyWrapper>
          <Settings />
        </LazyWrapper>
      </ProtectedLayoutWrapper>
    ),
  },
]);