import { useQuery } from '@tanstack/react-query';
import { getCategories } from '../api/categories';

export const categoriesQueryKey = ['categories'] as const;

/**
 * Fetch all categories. staleTime: 1hr — categories change rarely.
 */
export function useCategories() {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: getCategories,
    staleTime: 3_600_000,   // 1 hour
    gcTime: 7_200_000,      // 2 hours
    networkMode: 'offlineFirst',
  });
}
