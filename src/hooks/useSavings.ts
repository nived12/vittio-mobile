import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showBackfillToast } from '../utils/backfillToast';
import {
  createSaving,
  deleteSaving,
  getSaving,
  getSavings,
  updateSaving,
  type CreateSavingBody,
  type UpdateSavingBody,
} from '../api/savings';

// ── Query keys ─────────────────────────────────────────────────────────────

export const savingKeys = {
  all: ['savings'] as const,
  list: () => [...savingKeys.all, 'list'] as const,
  detail: (id: number) => [...savingKeys.all, 'detail', id] as const,
};

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useSavings() {
  return useQuery({
    queryKey: savingKeys.list(),
    queryFn: () => getSavings(),
    staleTime: 60_000,
    gcTime: 300_000,
    networkMode: 'offlineFirst',
  });
}

export function useSaving(id: number) {
  return useQuery({
    queryKey: savingKeys.detail(id),
    queryFn: () => getSaving(id),
    staleTime: 60_000,
    networkMode: 'offlineFirst',
    enabled: id > 0,
  });
}

export function useCreateSaving() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSavingBody) => createSaving(body),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: savingKeys.list() });
      showBackfillToast('savings', created.backfill_summary);
    },
  });
}

export function useUpdateSaving(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSavingBody) => updateSaving(id, body),
    onSuccess: (updated) => {
      // backfill_summary describes this one write; it must not ride along into the
      // persisted cache, where it would outlive the toast it belongs to.
      const { backfill_summary: backfill, ...record } = updated;
      queryClient.setQueryData(savingKeys.detail(id), record);
      queryClient.invalidateQueries({ queryKey: savingKeys.list() });
      showBackfillToast('savings', backfill);
    },
  });
}

export function useDeleteSaving() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSaving(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: savingKeys.list() });
      queryClient.removeQueries({ queryKey: savingKeys.detail(id) });
    },
  });
}
