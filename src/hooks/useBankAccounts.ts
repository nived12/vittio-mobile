import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createBankAccount,
  deleteBankAccount,
  getBankAccount,
  getBankAccounts,
  updateBankAccount,
  type CreateBankAccountBody,
  type UpdateBankAccountBody,
} from '../api/bankAccounts';

// ── Query keys ─────────────────────────────────────────────────────────────

export const bankAccountKeys = {
  all: ['bank-accounts'] as const,
  list: () => [...bankAccountKeys.all, 'list'] as const,
  detail: (id: number) => [...bankAccountKeys.all, 'detail', id] as const,
};

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useBankAccounts() {
  return useQuery({
    queryKey: bankAccountKeys.list(),
    queryFn: getBankAccounts,
    staleTime: 120_000,   // 2 minutes
    gcTime: 600_000,
    networkMode: 'offlineFirst',
  });
}

export function useBankAccount(id: number) {
  return useQuery({
    queryKey: bankAccountKeys.detail(id),
    queryFn: () => getBankAccount(id),
    staleTime: 120_000,
    networkMode: 'offlineFirst',
    enabled: id > 0,
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBankAccountBody) => createBankAccount(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.list() });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateBankAccount(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBankAccountBody) => updateBankAccount(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(bankAccountKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.list() });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteBankAccount(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.list() });
      queryClient.removeQueries({ queryKey: bankAccountKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
