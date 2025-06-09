import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSharesService, type CreateListShareDto, type UpdateListShareDto } from '../services/list-shares.service';
import { queryKeys } from '../services/queryClient';

export const useListShares = (listId: string) => {
  return useQuery({
    queryKey: queryKeys.lists.shares(listId),
    queryFn: () => listSharesService.getListShares(listId),
    enabled: !!listId,
  });
};

export const useShareList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, data }: { listId: string; data: CreateListShareDto }) =>
      listSharesService.shareList(listId, data),
    onSuccess: (_, { listId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.shares(listId) });
    },
  });
};

export const useUpdateListShare = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      listId, 
      userId, 
      data 
    }: { 
      listId: string; 
      userId: string; 
      data: UpdateListShareDto;
    }) => listSharesService.updateListShare(listId, userId, data),
    onSuccess: (_, { listId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.shares(listId) });
    },
  });
};

export const useRemoveListShare = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, userId }: { listId: string; userId: string }) =>
      listSharesService.removeListShare(listId, userId),
    onSuccess: (_, { listId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists.shares(listId) });
    },
  });
};

export const useSearchUsers = (query: string) => {
  return useQuery({
    queryKey: queryKeys.users.search(query),
    queryFn: () => listSharesService.searchUsers(query),
    enabled: query.length >= 2,
    staleTime: 30000,
  });
};