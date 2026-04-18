import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDashboard } from '../api/dashboard';

export const dashboardQueryKey = (month?: string) =>
  ['dashboard', month ?? 'current'] as const;

/**
 * Fetch dashboard data for the given month (YYYY-MM).
 * staleTime: 30s — dashboard is high-frequency
 */
export function useDashboard(month?: string) {
  return useQuery({
    queryKey: dashboardQueryKey(month),
    queryFn: () => getDashboard(month),
    staleTime: 30_000,        // 30 seconds
    gcTime: 600_000,          // 10 minutes
    retry: 2,
    networkMode: 'offlineFirst',
  });
}

/** Call to imperatively refetch dashboard (e.g. pull-to-refresh) */
export function useRefreshDashboard(month?: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: dashboardQueryKey(month) });
}
