import { useQuery } from '@tanstack/react-query';
import { fetchRecurring } from '../api/recurring';
import { recurringKeys } from './useRecurring';

/**
 * Lightweight read of the recurring summary (active_count + detected_count).
 * Shares the same query key as useRecurring() so the Profile sheet badge and
 * the Transactions header chip reuse the main /recurring screen fetch.
 */
export function useRecurringSummary() {
  const { data } = useQuery({
    queryKey: recurringKeys.list(),
    queryFn: () => fetchRecurring(),
    staleTime: 60_000,
  });

  return {
    activeCount: data?.summary.active_count ?? 0,
    detectedCount: data?.summary.detected_count ?? 0,
  };
}
