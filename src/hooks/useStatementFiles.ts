import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  deleteStatementFile,
  listStatementFiles,
  retryStatementFile,
} from '../api/statementFiles';

export const statementFileKeys = {
  all: ['statementFiles'] as const,
  lists: () => [...statementFileKeys.all, 'list'] as const,
};

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
