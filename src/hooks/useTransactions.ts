import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  getTransactions,
  getTransactionsSummary,
  updateTransaction,
  type CreateTransactionBody,
  type TransactionFilters,
  type UpdateTransactionBody,
} from '../api/transactions';

// ── Query keys ─────────────────────────────────────────────────────────────

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: TransactionFilters) =>
    [...transactionKeys.lists(), filters] as const,
  summary: (filters: Omit<TransactionFilters, 'page' | 'page_size' | 'sort' | 'direction'>) =>
    [...transactionKeys.all, 'summary', filters] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: number) => [...transactionKeys.details(), id] as const,
};

// ── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Infinite-scroll query for the transactions list.
 * Pages are fetched when `fetchNextPage()` is called (typically on-end-reached).
 */
export function useTransactions(filters: TransactionFilters = {}) {
  const filtersWithoutPage = { ...filters };
  delete (filtersWithoutPage as TransactionFilters).page;

  return useInfiniteQuery({
    queryKey: transactionKeys.list(filtersWithoutPage),
    queryFn: ({ pageParam = 1 }) =>
      getTransactions({ ...filters, page: pageParam as number, page_size: 20 }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.pagination.next_page ?? undefined,
    initialPageParam: 1,
    staleTime: 60_000,
    gcTime: 600_000,
    networkMode: 'offlineFirst',
  });
}

/** Summary stats (income / expenses) for the same filter set */
export function useTransactionsSummary(
  filters: Omit<TransactionFilters, 'page' | 'page_size' | 'sort' | 'direction'> = {},
) {
  return useQuery({
    queryKey: transactionKeys.summary(filters),
    queryFn: () => getTransactionsSummary(filters),
    staleTime: 60_000,
    networkMode: 'offlineFirst',
  });
}

/** Single transaction detail */
export function useTransaction(id: number) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => getTransaction(id),
    staleTime: 120_000,
    networkMode: 'offlineFirst',
    enabled: id > 0,
  });
}

/** Delete mutation — invalidates list + dashboard on success */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Create mutation — invalidates list + dashboard on success */
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTransactionBody) => createTransaction(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Update (categorize / edit) mutation */
export function useUpdateTransaction(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTransactionBody) => updateTransaction(id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(transactionKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
}
