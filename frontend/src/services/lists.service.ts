import { apiClient } from './api';
import type { List, ListWithStats } from '@simple-todo-app/shared';

export interface CreateListDto {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateListDto {
  name?: string;
  description?: string;
  color?: string;
}

export const listsService = {
  async getLists(): Promise<ListWithStats[]> {
    console.log('🔍 Fetching lists from API...');
    try {
      const response = await apiClient.get<{
        lists: ListWithStats[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>('/lists');
      console.log('✅ API Response:', response.data);
      return response.data.lists;
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  },

  async getList(id: string): Promise<ListWithStats> {
    const response = await apiClient.get<ListWithStats>(`/lists/${id}`);
    return response.data;
  },

  async createList(data: CreateListDto): Promise<List> {
    const response = await apiClient.post<List>('/lists', data);
    return response.data;
  },

  async updateList(id: string, data: UpdateListDto): Promise<List> {
    const response = await apiClient.patch<List>(`/lists/${id}`, data);
    return response.data;
  },

  async deleteList(id: string): Promise<void> {
    await apiClient.delete(`/lists/${id}`);
  },
};