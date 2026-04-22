/**
 * Session hooks for React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllActiveSessions,
  getCapacitySummary,
  getAllTablesStatus,
  endSession,
  getSessionParticipants,
  type TableSession,
  type CapacitySummary,
  type TableStatus,
  type SessionParticipant,
} from '@/lib/sessionApi';

const SESSION_KEYS = {
  all: ['sessions'] as const,
  active: () => [...SESSION_KEYS.all, 'active'] as const,
  capacity: () => [...SESSION_KEYS.all, 'capacity'] as const,
  tables: () => [...SESSION_KEYS.all, 'tables'] as const,
  participants: (tableSessionId: number) => [...SESSION_KEYS.all, 'participants', tableSessionId] as const,
};

/**
 * Get all active sessions
 */
export function useActiveSessions() {
  return useQuery({
    queryKey: SESSION_KEYS.active(),
    queryFn: getAllActiveSessions,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

/**
 * Get capacity summary
 */
export function useCapacitySummary() {
  return useQuery({
    queryKey: SESSION_KEYS.capacity(),
    queryFn: getCapacitySummary,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

/**
 * Get all tables status with sessions
 */
export function useAllTablesStatus() {
  return useQuery({
    queryKey: SESSION_KEYS.tables(),
    queryFn: getAllTablesStatus,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

/**
 * Get participants for a session
 */
export function useSessionParticipants(tableSessionId: number | null) {
  return useQuery({
    queryKey: SESSION_KEYS.participants(tableSessionId || 0),
    queryFn: () => getSessionParticipants(tableSessionId!),
    enabled: tableSessionId !== null,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

/**
 * End session mutation
 */
export function useEndSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tableId }: { tableId: number }) => endSession(tableId),
    onSuccess: () => {
      // Invalidate and refetch sessions
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.active() });
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.capacity() });
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.tables() });
    },
  });
}

/**
 * Format session duration
 */
export function formatSessionDuration(startTime: string): string {
  const start = new Date(startTime);
  const now = new Date();
  const diff = now.getTime() - start.getTime();

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format last activity time
 */
export function formatLastActivity(lastActivity: string): string {
  const activity = new Date(lastActivity);
  const now = new Date();
  const diff = now.getTime() - activity.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ago`;
  }
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return 'Just now';
}
