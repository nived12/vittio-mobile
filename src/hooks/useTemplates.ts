import { useQuery } from '@tanstack/react-query';
import { getTemplates } from '../api/templates';

export const templateKeys = {
  all: ['templates'] as const,
};

/** Read-only catalog of starter savings/debt templates. */
export function useTemplates() {
  return useQuery({
    queryKey: templateKeys.all,
    queryFn: () => getTemplates(),
    staleTime: 24 * 60 * 60 * 1000, // catalog is static — cache aggressively
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}
