import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchTransferCandidates,
  resolveTransferCandidates,
  type ResolveTransferCandidatesBody,
} from '../api/transferCandidates';
import { transactionKeys } from './useTransactions';

export const transferCandidateKeys = {
  all: ['transferCandidates'] as const,
  list: () => [...transferCandidateKeys.all, 'list'] as const,
};

export function useTransferCandidates() {
  return useQuery({
    queryKey: transferCandidateKeys.list(),
    queryFn: () => fetchTransferCandidates(),
    staleTime: 30_000,
    gcTime: 300_000,
    networkMode: 'offlineFirst',
  });
}

export function useResolveTransferCandidates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ResolveTransferCandidatesBody) => resolveTransferCandidates(body),
    onSuccess: () => {
      // Linking a pair retypes both rows as transfers, which removes them from income
      // and expense totals and changes account balances — so the transaction lists and
      // the dashboard are both stale, not just this list.
      queryClient.invalidateQueries({ queryKey: transferCandidateKeys.all });
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
