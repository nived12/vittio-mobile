import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: debtKeys.list() });
    },
  });
}

export function useUpdateDebt(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateDebtBody) => updateDebt(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(debtKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: debtKeys.list() });
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
