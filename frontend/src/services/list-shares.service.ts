import { apiClient } from './api';
import type { PermissionLevel } from '@simple-todo-app/shared';

export interface CreateListShareDto {
  userEmail: string;
  permissionLevel: PermissionLevel;
}

export interface UpdateListShareDto {
  permissionLevel: PermissionLevel;
}

export interface ListShareResponse {
  id: string;
  listId: string;
  userId: string;
  permissionLevel: PermissionLevel;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  list?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
  };
}

export interface SearchUsersResponse {
  id: string;
  email: string;
  name: string;
}

export const listSharesService = {
  async shareList(listId: string, data: CreateListShareDto): Promise<ListShareResponse> {
    const response = await apiClient.post<ListShareResponse>(`/lists/${listId}/shares`, data);
    return response.data;
  },

  async getListShares(listId: string): Promise<ListShareResponse[]> {
    const response = await apiClient.get<ListShareResponse[]>(`/lists/${listId}/shares`);
    return response.data;
  },

  async updateListShare(
    listId: string, 
    userId: string, 
    data: UpdateListShareDto
  ): Promise<ListShareResponse> {
    const response = await apiClient.put<ListShareResponse>(
      `/lists/${listId}/shares/${userId}`, 
      data
    );
    return response.data;
  },

  async removeListShare(listId: string, userId: string): Promise<void> {
    await apiClient.delete(`/lists/${listId}/shares/${userId}`);
  },

  async searchUsers(query: string): Promise<SearchUsersResponse[]> {
    const response = await apiClient.get<SearchUsersResponse[]>(
      `/users/search?q=${encodeURIComponent(query)}`
    );
    return response.data;
  },
};