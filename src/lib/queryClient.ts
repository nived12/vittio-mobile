import { QueryClient } from '@tanstack/react-query';

// Single shared TanStack Query client for the whole app.
// Lives in src/ (not app/_layout.tsx) so non-React modules — notably the auth
// store — can import it to clear cached data on logout. Keeping the cache in one
// place is what prevents one account's data from bleeding into the next session.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});
