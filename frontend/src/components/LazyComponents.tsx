/**
 * Lazy Components
 * Heavy components wrapped with React.lazy for performance optimization
 */

import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './ui';

// Lazy load heavy modals
export const LazyShareModal = lazy(() => import('./ShareModal').then(module => ({ default: module.ShareModal })));
export const LazyTaskModal = lazy(() => import('./TaskModal').then(module => ({ default: module.TaskModal })));

// Lazy load heavy kanban boards
export const LazyVirtualizedPermissionAwareKanbanBoard = lazy(() => 
  import('./kanban/VirtualizedPermissionAwareKanbanBoard').then(module => ({
    default: module.VirtualizedPermissionAwareKanbanBoard
  }))
);

export const LazyMobileKanbanBoard = lazy(() => 
  import('./kanban/MobileKanbanBoard').then(module => ({
    default: module.MobileKanbanBoard
  }))
);

// Lazy load heavy bottom sheets
export const LazyTaskBottomSheet = lazy(() => 
  import('./ui/TaskBottomSheet').then(module => ({
    default: module.TaskBottomSheet
  }))
);

export const LazyListBottomSheet = lazy(() => 
  import('./ui/ListBottomSheet').then(module => ({
    default: module.ListBottomSheet
  }))
);

// Lazy load notification components
export const LazyNotificationDrawer = lazy(() => 
  import('./notifications/NotificationDrawer').then(module => ({
    default: module.NotificationDrawer
  }))
);

// Lazy load complex forms
export const LazyFormField = lazy(() => 
  import('./forms/FormField').then(module => ({
    default: module.FormField
  }))
);

// Lazy load settings components
export const LazyNotificationPreferences = lazy(() =>
  import('./settings/NotificationPreferences').then(module => ({
    default: module.NotificationPreferences
  }))
);

// Lazy load demo components (only in development)
export const LazyBottomSheetDemo = lazy(() => import('./demo/BottomSheetDemo').then(module => ({ default: module.BottomSheetDemo })));
export const LazyPullToRefreshDemo = lazy(() => import('./demo/PullToRefreshDemo').then(module => ({ default: module.PullToRefreshDemo })));
export const LazySwipeGestureDemo = lazy(() => import('./demo/SwipeGestureDemo').then(module => ({ default: module.SwipeGestureDemo })));

/**
 * Wrapper components with suspense boundaries
 */
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  tip?: string;
}

const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback, 
  tip = "Loading component..." 
}) => (
  <Suspense fallback={fallback || <LoadingSpinner size="default" tip={tip} />}>
    {children}
  </Suspense>
);

// Wrapped components ready to use
export const ShareModalLazy: React.FC<React.ComponentProps<typeof LazyShareModal>> = (props) => (
  <LazyWrapper tip="Loading share options...">
    <LazyShareModal {...props} />
  </LazyWrapper>
);

export const TaskModalLazy: React.FC<React.ComponentProps<typeof LazyTaskModal>> = (props) => (
  <LazyWrapper tip="Loading task editor...">
    <LazyTaskModal {...props} />
  </LazyWrapper>
);

export const VirtualizedKanbanBoardLazy: React.FC<React.ComponentProps<typeof LazyVirtualizedPermissionAwareKanbanBoard>> = (props) => (
  <LazyWrapper tip="Loading kanban board...">
    <LazyVirtualizedPermissionAwareKanbanBoard {...props} />
  </LazyWrapper>
);

export const MobileKanbanBoardLazy: React.FC<React.ComponentProps<typeof LazyMobileKanbanBoard>> = (props) => (
  <LazyWrapper tip="Loading mobile kanban...">
    <LazyMobileKanbanBoard {...props} />
  </LazyWrapper>
);

export const TaskBottomSheetLazy: React.FC<React.ComponentProps<typeof LazyTaskBottomSheet>> = (props) => (
  <LazyWrapper tip="Loading task details...">
    <LazyTaskBottomSheet {...props} />
  </LazyWrapper>
);

export const ListBottomSheetLazy: React.FC<React.ComponentProps<typeof LazyListBottomSheet>> = (props) => (
  <LazyWrapper tip="Loading list details...">
    <LazyListBottomSheet {...props} />
  </LazyWrapper>
);

export const NotificationDrawerLazy: React.FC<React.ComponentProps<typeof LazyNotificationDrawer>> = (props) => (
  <LazyWrapper tip="Loading notifications...">
    <LazyNotificationDrawer {...props} />
  </LazyWrapper>
);

export const NotificationPreferencesLazy: React.FC<React.ComponentProps<typeof LazyNotificationPreferences>> = (props) => (
  <LazyWrapper tip="Loading preferences...">
    <LazyNotificationPreferences {...props} />
  </LazyWrapper>
);

export default {
  ShareModal: ShareModalLazy,
  TaskModal: TaskModalLazy,
  VirtualizedKanbanBoard: VirtualizedKanbanBoardLazy,
  MobileKanbanBoard: MobileKanbanBoardLazy,
  TaskBottomSheet: TaskBottomSheetLazy,
  ListBottomSheet: ListBottomSheetLazy,
  NotificationDrawer: NotificationDrawerLazy,
  NotificationPreferences: NotificationPreferencesLazy,
};