import { useQuery } from '@tanstack/react-query';
import { getBanks } from '../api/banks';

export const bankKeys = {
  all: ['banks'] as const,
  list: () => [...bankKeys.all, 'list'] as const,
};

export function useBanks() {
  return useQuery({
    queryKey: bankKeys.list(),
    queryFn: () => getBanks(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours — banks rarely change
    gcTime: 48 * 60 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}
