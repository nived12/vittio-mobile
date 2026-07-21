import { QueryClient } from '@tanstack/react-query';

// Single shared TanStack Query client for the whole app.
// Lives in src/ (not app/_layout.tsx) so non-React modules — notably the auth
// store — can import it to clear cached data on logout. Keeping the cache in one
// place is what prevents one account's data from bleeding into the next session.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — data refetches promptly when back online
      // gcTime must be >= the persister's maxAge (24h) or restored entries would
      // be evicted from memory before the disk cache can rehydrate them on cold
      // start. See src/lib/queryPersister.ts and PERSIST_MAX_AGE below.
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: 2,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// Max age of the persisted (on-disk) cache. Entries older than this are dropped
// on restore rather than shown as stale-forever data. Kept in sync with gcTime.
export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
