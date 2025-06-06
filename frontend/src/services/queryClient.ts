import { QueryClient } from '@tanstack/react-query';
import type { DefaultOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';

const queryConfig: DefaultOptions = {
  queries: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
    retry: (failureCount, error) => {
      const axiosError = error as AxiosError;
      
      if (axiosError.response?.status === 401) {
        return false;
      }
      
      if (axiosError.response?.status === 403) {
        return false;
      }
      
      if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500) {
        return false;
      }
      
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  mutations: {
    retry: false,
  },
};

export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

export const queryKeys = {
  auth: {
    user: ['auth', 'user'] as const,
    profile: ['auth', 'profile'] as const,
  },
  lists: {
    all: ['lists'] as const,
    list: (id: string) => ['lists', id] as const,
    shared: ['lists', 'shared'] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (listId: string) => ['tasks', 'list', listId] as const,
    task: (id: string) => ['tasks', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unread: ['notifications', 'unread'] as const,
  },
  users: {
    all: ['users'] as const,
    search: (query: string) => ['users', 'search', query] as const,
  },
} as const;