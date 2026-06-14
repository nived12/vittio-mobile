import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  archiveBankAccount,
  createBankAccount,
  deleteBankAccount,
  getBankAccount,
  getBankAccounts,
  unarchiveBankAccount,
  updateBankAccount,
  type BankAccount,
  type CreateBankAccountBody,
  type UpdateBankAccountBody,
} from '../api/bankAccounts';

// ── Query keys ─────────────────────────────────────────────────────────────

export const bankAccountKeys = {
  all: ['bank-accounts'] as const,
  list: () => [...bankAccountKeys.all, 'list'] as const,
  archived: () => [...bankAccountKeys.all, 'archived'] as const,
  detail: (id: number) => [...bankAccountKeys.all, 'detail', id] as const,
};

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useBankAccounts() {
  return useQuery({
    queryKey: bankAccountKeys.list(),
    queryFn: () => getBankAccounts(),
    staleTime: 300_000,   // 5 minutes
    gcTime: 600_000,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });
}

export function useArchivedBankAccounts(enabled = true) {
  return useQuery({
    queryKey: bankAccountKeys.archived(),
    queryFn: () => getBankAccounts({ archived: true }),
    staleTime: 600_000,  // archived list changes rarely — refetch every 10 min
    gcTime: 900_000,
    networkMode: 'offlineFirst',
    enabled,
  });
}

export function useBankAccount(id: number) {
  return useQuery({
    queryKey: bankAccountKeys.detail(id),
    queryFn: () => getBankAccount(id),
    staleTime: 300_000,
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

function onArchiveSuccess(queryClient: QueryClient) {
  return (updated: BankAccount) => {
    queryClient.setQueryData(bankAccountKeys.detail(updated.id), updated);
    queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useArchiveBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => archiveBankAccount(id),
    onSuccess: onArchiveSuccess(queryClient),
  });
}

export function useUnarchiveBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unarchiveBankAccount(id),
    onSuccess: onArchiveSuccess(queryClient),
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteBankAccount(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
      queryClient.removeQueries({ queryKey: bankAccountKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
