import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listsService, type CreateListDto, type UpdateListDto } from '../services/lists.service';
import { queryKeys } from '../services/queryClient';

export const useLists = () => {
  const query = useQuery({
    queryKey: queryKeys.lists.all,
    queryFn: listsService.getLists,
  });
  
  console.log('🏠 useLists query status:', {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    status: query.status,
    fetchStatus: query.fetchStatus,
  });
  
  return query;
};

export const useList = (id: string) => {
  return useQuery({
    queryKey: queryKeys.lists.list(id),
    queryFn: () => listsService.getList(id),
    enabled: !!id,
  });
};

export const useCreateList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateListDto) => listsService.createList(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
    },
  });
};

export const useUpdateList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateListDto }) =>
      listsService.updateList(id, data),
    onSuccess: (updatedList) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.list(updatedList.id) });
    },
  });
};

export const useDeleteList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => listsService.deleteList(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
    },
  });
};