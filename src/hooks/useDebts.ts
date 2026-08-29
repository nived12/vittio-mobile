import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showBackfillToast } from '../utils/backfillToast';
import {
  createDebt,
  deleteDebt,
  getDebt,
  getDebts,
  updateDebt,
  type CreateDebtBody,
  type UpdateDebtBody,
} from '../api/debts';

// ── Query keys ─────────────────────────────────────────────────────────────

export const debtKeys = {
  all: ['debts'] as const,
  list: () => [...debtKeys.all, 'list'] as const,
  detail: (id: number) => [...debtKeys.all, 'detail', id] as const,
};

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useDebts() {
  return useQuery({
    queryKey: debtKeys.list(),
    queryFn: () => getDebts(),
    staleTime: 60_000,
    gcTime: 300_000,
    networkMode: 'offlineFirst',
  });
}

export function useDebt(id: number) {
  return useQuery({
    queryKey: debtKeys.detail(id),
    queryFn: () => getDebt(id),
    staleTime: 60_000,
    networkMode: 'offlineFirst',
    enabled: id > 0,
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDebtBody) => createDebt(body),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: debtKeys.list() });
      showBackfillToast('debts', created.backfill_summary);
    },
  });
}

export function useUpdateDebt(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateDebtBody) => updateDebt(id, body),
    onSuccess: (updated) => {
      // backfill_summary describes this one write; it must not ride along into the
      // persisted cache, where it would outlive the toast it belongs to.
      const { backfill_summary: backfill, ...record } = updated;
      queryClient.setQueryData(debtKeys.detail(id), record);
      queryClient.invalidateQueries({ queryKey: debtKeys.list() });
      showBackfillToast('debts', backfill);
    },
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDebt(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: debtKeys.list() });
      queryClient.removeQueries({ queryKey: debtKeys.detail(id) });
    },
  });
}
