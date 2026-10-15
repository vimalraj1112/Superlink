import { QueryClient } from '@tanstack/react-query';

/**
 * Single shared React Query client.
 *
 * It lives in its own module (instead of inside App.tsx) so the axios layer can
 * reach it and refresh caches after every write request.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Invalidate every cached query.
 *
 * Called after any successful write request (POST/PUT/PATCH/DELETE) so that all
 * views reflect the change immediately: the list you are on, related lists and
 * detail pages, filter dropdowns, and the dashboard counters.
 *
 * Without this, caches that use a different query key (for example the
 * dashboard's `dashboard-*` queries) keep serving stale data until a manual
 * page refresh, which is exactly why a deleted ticket lingered on the
 * dashboard.
 */
export function refreshAllQueries() {
  queryClient.invalidateQueries();
}
