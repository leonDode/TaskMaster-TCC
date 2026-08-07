import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth-store';

function handleGlobalError(error: unknown) {
  if (error instanceof ApiError && error.statusCode === 401) {
    // Supabase already retries token refresh in the background; a 401 from
    // the API itself means the session is genuinely invalid.
    useAuthStore.getState().forceSignOut();
  }
}

function queryRetry(failureCount: number, error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  if (error.statusCode === 429) {
    return failureCount < 3;
  }
  if (error.statusCode >= 500) {
    return failureCount < 2;
  }
  return false;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleGlobalError }),
  mutationCache: new MutationCache({ onError: handleGlobalError }),
  defaultOptions: {
    queries: {
      retry: queryRetry,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),
    },
    mutations: {
      // Never retry mutations automatically — a duplicate POST could be
      // processed twice if the first request had already gone through
      // before the client timed out.
      retry: false,
    },
  },
});
