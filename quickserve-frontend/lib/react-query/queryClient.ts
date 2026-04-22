/**
 * Query Client Utility
 *
 * Provides global access to the React Query client instance.
 * This allows query invalidation from outside React components,
 * such as WebSocket event handlers.
 */

import { QueryClient } from '@tanstack/react-query';

// Global query client instance reference
let queryClientInstance: QueryClient | null = null;

/**
 * Register the QueryClient globally for WebSocket access
 * Call this in your Providers component when QueryClient is created
 */
export function setQueryClient(client: QueryClient) {
  queryClientInstance = client;
}

/**
 * Get the registered QueryClient instance
 * @throws Error if QueryClient is not initialized
 */
export function getQueryClient(): QueryClient {
  if (!queryClientInstance) {
    throw new Error('QueryClient not initialized. Make sure QueryClientProvider is mounted and setQueryClient has been called.');
  }
  return queryClientInstance;
}

/**
 * Utility to invalidate group cart queries from anywhere
 * (e.g., from WebSocket event handlers in SessionContext)
 *
 * @param groupId - The group ID whose cart should be invalidated
 */
export function invalidateGroupCart(groupId: string) {
  const client = getQueryClient();
  client.invalidateQueries({
    queryKey: ['groupCart', groupId]
  });
}

/**
 * Utility to invalidate all group cart queries
 * Useful when switching between groups or clearing session
 */
export function invalidateAllGroupCarts() {
  const client = getQueryClient();
  client.invalidateQueries({
    queryKey: ['groupCart']
  });
}
