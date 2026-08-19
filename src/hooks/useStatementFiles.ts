import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  deleteStatementFile,
  getStatementFile,
  listStatementFiles,
  retryStatementFile,
} from '../api/statementFiles';

export const statementFileKeys = {
  all: ['statementFiles'] as const,
  lists: () => [...statementFileKeys.all, 'list'] as const,
  detail: (id: number) => [...statementFileKeys.all, 'detail', id] as const,
};

/** One statement file. Polls itself while the job is still running. */
export function useStatementFile(id: number) {
  return useQuery({
    queryKey: statementFileKeys.detail(id),
    queryFn: () => getStatementFile(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'pending' || status === 'processing' ? 3_000 : false;
    },
    networkMode: 'offlineFirst',
  });
}

/** Infinite-scroll query for the statement files list. */
export function useStatementFiles() {
  return useInfiniteQuery({
    queryKey: statementFileKeys.lists(),
    queryFn: ({ pageParam = 1 }) => listStatementFiles(pageParam as number),
    getNextPageParam: (lastPage) => lastPage.meta.pagination.next_page ?? undefined,
    initialPageParam: 1,
    // Rows in pending/processing change without user action, so this list goes
    // stale the moment an upload is in flight.
    staleTime: 10_000,
    gcTime: 600_000,
    networkMode: 'offlineFirst',
  });
}

export function useDeleteStatementFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteStatementFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statementFileKeys.all });
      // Deleting a statement also deletes the transactions it imported.
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRetryStatementFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password?: string }) =>
      retryStatementFile(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statementFileKeys.all });
    },
  });
}
