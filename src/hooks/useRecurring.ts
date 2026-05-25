import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRecurring,
  deleteRecurring,
  fetchRecurring,
  fetchRecurringSeries,
  processDue,
  scanRecurring,
  updateRecurring,
  type CreateRecurringBody,
  type UpdateRecurringBody,
} from '../api/recurring';

export const recurringKeys = {
  all: ['recurring'] as const,
  list: () => [...recurringKeys.all, 'list'] as const,
  detail: (id: number) => [...recurringKeys.all, 'detail', id] as const,
};

export function useRecurring() {
  return useQuery({
    queryKey: recurringKeys.list(),
    queryFn: () => fetchRecurring(),
    staleTime: 30_000,
    gcTime: 300_000,
    networkMode: 'offlineFirst',
  });
}

export function useRecurringSeries(id: number) {
  return useQuery({
    queryKey: recurringKeys.detail(id),
    queryFn: () => fetchRecurringSeries(id),
    staleTime: 30_000,
    networkMode: 'offlineFirst',
    enabled: id > 0,
  });
}

export function useCreateRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRecurringBody) => createRecurring(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.all });
    },
  });
}

export function useUpdateRecurring(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateRecurringBody) => updateRecurring(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(recurringKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: recurringKeys.list() });
    },
  });
}

/** Update a series by id provided at call time — for list-row actions where the id varies. */
export function useUpdateRecurringRow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateRecurringBody }) => updateRecurring(id, body),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData(recurringKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: recurringKeys.list() });
    },
  });
}

export function useDeleteRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteRecurring(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.list() });
      queryClient.removeQueries({ queryKey: recurringKeys.detail(id) });
    },
  });
}

export function useProcessDue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'confirm' | 'skip' }) => processDue(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.all });
    },
  });
}

export function useScanRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => scanRecurring(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recurringKeys.list() });
    },
  });
}
