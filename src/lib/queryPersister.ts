import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

// Disk persister for the TanStack Query cache — this is what enables read-only
// offline: previously-synced data is restored on cold start so screens render
// last-known values instead of loading/error states when there's no network.
//
// Plain AsyncStorage (not encrypted): the cached data is a stale local copy,
// already protected at rest by OS full-disk encryption + app sandboxing + the
// app's biometric lock. See src/lib/queryClient.ts for the gcTime/maxAge pairing
// that keeps restored entries alive, and authStore._clearAuth for the
// removeClient() call that purges this on logout (prevents cross-account bleed).
export const RQ_CACHE_KEY = 'VITTIO_RQ_CACHE';

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: RQ_CACHE_KEY,
  throttleTime: 1000,
});
