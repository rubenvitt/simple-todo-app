import { createBrowserRouter } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import { ProtectedLayout } from '../components';

// Import Dashboard directly to avoid lazy loading issues
import Dashboard from '../pages/Dashboard';

// Lazy load other components
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const Lists = lazy(() => import('../pages/Lists'));
const ListDetail = lazy(() => import('../pages/ListDetail'));
const Profile = lazy(() => import('../pages/Profile'));
const Settings = lazy(() => import('../pages/Settings'));

// Loading component for lazy components
const LoadingFallback = () => {
  console.log('⏳ LoadingFallback shown - lazy component loading...');
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '200px' 
    }}>
      <Spin size="large" />
    </div>
  );
};

// Wrapper for lazy components with error boundary
const LazyWrapper = ({ children }: { children: React.ReactNode }) => {
  console.log('🔄 LazyWrapper rendering...');
  return (
    <Suspense fallback={<LoadingFallback />}>
      {children}
    </Suspense>
  );
};

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
  // Protected routes with layout
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'lists',
        element: (
          <LazyWrapper>
            <Lists />
          </LazyWrapper>
        ),
      },
      {
        path: 'lists/:id',
        element: (
          <LazyWrapper>
            <ListDetail />
          </LazyWrapper>
        ),
      },
      {
        path: 'profile',
        element: (
          <LazyWrapper>
            <Profile />
          </LazyWrapper>
        ),
      },
      {
        path: 'settings',
        element: (
          <LazyWrapper>
            <Settings />
          </LazyWrapper>
        ),
      },
    ],
  },
]);