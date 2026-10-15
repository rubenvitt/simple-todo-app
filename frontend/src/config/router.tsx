import { createBrowserRouter } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ProtectedLayout, ErrorBoundary } from '../components';
import { LoadingSpinner } from '../components/ui';

// Lazy load all page components for code splitting
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const Lists = lazy(() => import('../pages/Lists'));
const ListDetail = lazy(() => import('../pages/ListDetail'));
const Profile = lazy(() => import('../pages/Profile'));
const Settings = lazy(() => import('../pages/Settings'));

// Wrapper for lazy components with enhanced loading state and error boundary
const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingSpinner tip="Loading page..." />}>
      {children}
    </Suspense>
  </ErrorBoundary>
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
  // Protected routes with layout
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      {
        index: true,
        element: (
          <LazyWrapper>
            <Dashboard />
          </LazyWrapper>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <LazyWrapper>
            <Dashboard />
          </LazyWrapper>
        ),
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