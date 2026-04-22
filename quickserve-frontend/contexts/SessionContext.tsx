/**
 * Session Context Provider
 * Manages session state globally across the app
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TableSession, startSession, getActiveSession, getSessionByAccessCode, updateSessionActivity } from '@/lib/sessionApi';
import { useTableWebSocket } from '@/hooks/useWebSocket';
import { invalidateGroupCart } from '@/lib/react-query/queryClient';
import { getGroup } from '@/lib/groupApi';
import { useGroupStore } from '@/features/groups/store/groupStore';

// Participant interface for session pooling
export interface SessionParticipant {
  id: number;
  participant_id: string;
  table_session_id: number;
  device_id: string;
  device_name: string | null;
  customer_count: number;
  role: string;
  is_active: boolean;
  joined_at: string;
  last_activity_at: string;
  left_at: string | null;
}

interface SessionContextType {
  session: TableSession | null;
  participant: SessionParticipant | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  startSession: (tableId: number, accessCode: string, customerCount?: number) => Promise<void>;
  joinSession: (accessCode: string, deviceId: string, deviceName?: string, customerCount?: number) => Promise<void>;
  loadSessionByAccessCode: (accessCode: string) => Promise<void>;
  loadSessionByDevice: (deviceId: string) => Promise<void>;
  loadActiveSession: (tableId: number) => Promise<void>;
  updateActivity: () => Promise<void>;
  clearSession: () => void;
  clearAllSessionData: () => void; // DEV: Clear all session data including localStorage
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  // Initialize session synchronously from localStorage to avoid race conditions on page load
  const getInitialSession = () => {
    if (typeof window === 'undefined') return null;
    try {
      const savedSession = localStorage.getItem('tableSession');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        // Only return if it's an active session
        return parsed.status === 'active' ? parsed : null;
      }
    } catch (e) {
      console.error('[SessionContext] Failed to parse session:', e);
      return null;
    }
    return null;
  };

  // Initialize participant from localStorage
  const getInitialParticipant = () => {
    if (typeof window === 'undefined') return null;
    try {
      const savedParticipant = localStorage.getItem('tableParticipant');
      if (savedParticipant) {
        const parsed = JSON.parse(savedParticipant);
        // Only return if active
        return parsed.is_active ? parsed : null;
      }
    } catch (e) {
      console.error('[SessionContext] Failed to parse participant:', e);
      return null;
    }
    return null;
  };

  const [session, setSession] = useState<TableSession | null>(getInitialSession);
  const [participant, setParticipant] = useState<SessionParticipant | null>(getInitialParticipant);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (session) {
      localStorage.setItem('tableSession', JSON.stringify(session));
    } else {
      localStorage.removeItem('tableSession');
    }
  }, [session]);

  // Save participant to localStorage whenever it changes
  useEffect(() => {
    if (participant) {
      localStorage.setItem('tableParticipant', JSON.stringify(participant));
    } else {
      localStorage.removeItem('tableParticipant');
    }
  }, [participant]);

  // Restore group from localStorage when session is loaded
  // This fixes the "blink" issue where cart items show then disappear on refresh
  useEffect(() => {
    if (!session?.session_id) return;

    const restoreGroup = async () => {
      try {
        // Check if user has selected individual ordering mode
        // If so, skip group restoration entirely
        const orderMode = localStorage.getItem(`order-mode-${session.session_id}`);

        if (orderMode === 'individual') {
          return;
        }

        // Check if there's a stored group ID for this session
        const storedGroupId = localStorage.getItem(`group-id-${session.session_id}`);

        if (storedGroupId) {
          const group = await getGroup(storedGroupId);

          // Set the group in the global store
          const { setCurrentGroup } = useGroupStore.getState();
          setCurrentGroup(group);

          // CRITICAL: Also store host_participant_id in localStorage for fallback permission checks
          // This ensures that even if currentGroup becomes null (race condition), the host check still works
          if (group?.host_participant_id) {
            localStorage.setItem(`group-host-${session.session_id}`, String(group.host_participant_id));
          }
        }
      } catch (error) {
        // DON'T remove group-id - the user might still want to view their closed group
        // Only remove it if the user explicitly switches to individual mode
        const { setCurrentGroup } = useGroupStore.getState();
        setCurrentGroup(null);
      }
    };

    restoreGroup();
  }, [session?.session_id]);

  // Clear session helper (defined before WebSocket to avoid closure issues)
  const clearSession = () => {
    setSession(null);
    setParticipant(null);
    setError(null);
    // Also clear localStorage to prevent stale session on page reload
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tableSession');
      localStorage.removeItem('tableParticipant');
    }
  };

  // Clear all session data including localStorage
  const clearAllSessionData = () => {
    // Clear ALL session-related localStorage keys
    localStorage.removeItem('tableSession');
    localStorage.removeItem('tableParticipant');
    localStorage.removeItem('quickserve-cart');
    localStorage.removeItem('qr_session');
    setSession(null);
    setParticipant(null);
    setError(null);
    // Force reload to reset all state
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // WebSocket connection for real-time updates
  // Only connect if we have a valid session with table_id > 0
  const shouldConnect = !!session &&
                        session.status === 'active' &&
                        typeof session.table_id === 'number' &&
                        session.table_id > 0;

  // Handle group cart updates by invalidating the cart query
  const handleGroupCartUpdated = useCallback((groupId: string) => {
    console.log('[SessionContext] Group cart updated - invalidating query cache for group:', groupId);
    // Immediately refetch group cart data from server for real-time updates
    invalidateGroupCart(groupId);
  }, []);

  const { isConnected } = useTableWebSocket(
    session?.table_id || 0,
    {
      enabled: shouldConnect,
      maxReconnectAttempts: 3,
      onSessionEnded: () => {
        clearSession();
        // Show notification to user and redirect
        if (typeof window !== 'undefined') {
          alert('Your session has been ended by the staff. You will be redirected to the home page.');
          window.location.href = '/';
        }
      },
      onGroupCartUpdated: handleGroupCartUpdated,
    }
  );

  // Periodic activity update (every 2 minutes)
  useEffect(() => {
    if (!session || session.status !== 'active') return;

    const interval = setInterval(async () => {
      try {
        await updateSessionActivity(session.table_id);
      } catch (error) {
        // Silent fail - activity updates are not critical
      }
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session]);

  const startSessionHandler = async (
    tableNumber: number,
    accessCode: string,
    customerCount: number = 1
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const newSession = await startSession({
        table_number: tableNumber,
        access_code: accessCode,
        customer_count: customerCount,
      });

      // Save to localStorage immediately (don't wait for React state update)
      localStorage.setItem('tableSession', JSON.stringify(newSession));

      // Update React state
      setSession(newSession);
    } catch (error: any) {
      console.error('[SessionContext] Failed to start session:', error);
      setError(error.message || 'Failed to start session');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionByAccessCode = async (accessCode: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const existingSession = await getSessionByAccessCode(accessCode);

      // If no session found or not active, return null (expected for new sessions)
      if (!existingSession || existingSession.status !== 'active') {
        return;
      }

      // Save to localStorage immediately (don't wait for React state update)
      localStorage.setItem('tableSession', JSON.stringify(existingSession));

      setSession(existingSession);
    } catch (error: any) {
      console.error('[SessionContext] Failed to load session by access code:', error);
      setError(error.message || 'Failed to load session');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveSession = async (tableId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const activeSession = await getActiveSession(tableId);

      if (activeSession.status !== 'active') {
        setError('This session is no longer active');
        return;
      }

      setSession(activeSession);
    } catch (error: any) {
      setError(error.message || 'No active session found');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateActivityHandler = async () => {
    if (!session) return;

    try {
      await updateSessionActivity(session.table_id);

      // Update local session with new activity timestamp
      setSession({
        ...session,
        last_activity_at: new Date().toISOString(),
      });
    } catch (error) {
      // Silent fail - activity updates are not critical
    }
  };

  const joinSessionHandler = async (
    accessCode: string,
    deviceId: string,
    deviceName?: string,
    customerCount: number = 1
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call the join session API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_code: accessCode,
          device_id: deviceId,
          device_name: deviceName,
          customer_count: customerCount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to join session');
      }

      const data = await response.json();

      // Save to localStorage immediately
      localStorage.setItem('tableSession', JSON.stringify(data.session));
      localStorage.setItem('tableParticipant', JSON.stringify(data.participant));

      // Update React state
      setSession(data.session);
      setParticipant(data.participant);
    } catch (error: any) {
      console.error('[SessionContext] Failed to join session:', error);
      setError(error.message || 'Failed to join session');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionByDeviceHandler = async (deviceId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/participant/device/${deviceId}`);

      if (!response.ok) {
        throw new Error('Failed to load session by device');
      }

      const data = await response.json();

      if (!data.session || !data.participant) {
        return;
      }

      // Save to localStorage immediately
      localStorage.setItem('tableSession', JSON.stringify(data.session));
      localStorage.setItem('tableParticipant', JSON.stringify(data.participant));

      // Update React state
      setSession(data.session);
      setParticipant(data.participant);
    } catch (error: any) {
      console.error('[SessionContext] Failed to load session by device:', error);
      setError(error.message || 'Failed to load session');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: SessionContextType = {
    session,
    participant,
    isLoading,
    error,
    isConnected,
    startSession: startSessionHandler,
    joinSession: joinSessionHandler,
    loadSessionByAccessCode,
    loadSessionByDevice: loadSessionByDeviceHandler,
    loadActiveSession,
    updateActivity: updateActivityHandler,
    clearSession,
    clearAllSessionData,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
