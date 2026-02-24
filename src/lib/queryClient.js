import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes — reference data rarely changes
      gcTime: 30 * 60 * 1000,          // 30 minutes — keep cached during typical session
      retry: 2,                         // Two retries for transient failures
      refetchOnWindowFocus: true,       // Refresh when app returns to foreground
      refetchOnReconnect: true,         // Refresh when network connectivity restored
    },
  },
});

export default queryClient;
