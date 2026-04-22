/**
 * Group Store using Zustand
 *
 * Centralized group ordering state management
 */

import { create } from 'zustand';
import type { GroupStore } from '../types/group.types';
import type { GroupDetail } from '@/lib/groupApi';
import {
  createGroup,
  getGroup,
  getGroupByShareCode,
  getActiveGroupByTable,
  closeGroup,
  updateGroupSettings,
} from '@/lib/groupApi';

/**
 * Group Store
 */
export const useGroupStore = create<GroupStore>()((set, get) => ({
  // Initial state
  currentGroup: null,
  isLoading: false,
  error: null,

  /**
   * Set the current group directly (from local storage, etc.)
   * Also persists host_participant_id to localStorage for fallback permission checks
   */
  setCurrentGroup: (group: GroupDetail | null) => {
    set({ currentGroup: group, error: null });

    // Store host_participant_id in localStorage for fallback permission checks
    // This fixes the bug where currentGroup is null during order placement but we still
    // need to know if the user is the host
    if (typeof window !== 'undefined') {
      try {
        // Get the session ID from localStorage
        const tableSessionStr = localStorage.getItem('tableSession');
        const qrSessionStr = localStorage.getItem('qr_session');

        console.log('[groupStore] setCurrentGroup called, group:', group, 'tableSessionStr exists:', !!tableSessionStr, 'qrSessionStr exists:', !!qrSessionStr);

        let sessionId: string | null = null;
        if (tableSessionStr) {
          const tableSession = JSON.parse(tableSessionStr);
          sessionId = tableSession.session_id;
          console.log('[groupStore] Using session_id from tableSession:', sessionId);
        } else if (qrSessionStr) {
          const qrSession = JSON.parse(qrSessionStr);
          sessionId = qrSession.sessionId;
          console.log('[groupStore] Using sessionId from qr_session:', sessionId);
        }

        console.log('[groupStore] Final sessionId:', sessionId, 'group?.host_participant_id:', group?.host_participant_id);

        if (sessionId) {
          if (group?.host_participant_id) {
            // Store the host_participant_id for this session
            localStorage.setItem(`group-host-${sessionId}`, String(group.host_participant_id));
            console.log('[groupStore] ✓ Stored host_participant_id:', group.host_participant_id, 'for session:', sessionId);
          } else {
            // Only clear the host_participant_id if user has switched to individual mode
            // This preserves the host_participant_id after checkout/group closure
            const orderMode = localStorage.getItem(`order-mode-${sessionId}`)
            if (orderMode === 'individual') {
              console.log('[groupStore] ✗ Removing host_participant_id for session:', sessionId, '(individual mode selected)');
              localStorage.removeItem(`group-host-${sessionId}`);
            } else {
              console.log('[groupStore] ✓ Preserving host_participant_id for session:', sessionId, '(group mode still active, using fallback)');
            }
          }
        } else {
          console.warn('[groupStore] ✗ No sessionId found, cannot store host_participant_id');
        }
      } catch (e) {
        console.error('[groupStore] Error storing host_participant_id:', e);
      }
    }
  },

  /**
   * Create a new group ordering session
   */
  createGroup: async (request) => {
    set({ isLoading: true, error: null });

    try {
      const group = await createGroup(request);

      // Fetch full group details with members
      const groupDetail = await getGroup(group.group_id);

      // Use setCurrentGroup to ensure host_participant_id is stored in localStorage
      get().setCurrentGroup(groupDetail);
      set({ isLoading: false });

      return groupDetail;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to create group',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Fetch group by ID
   */
  fetchGroup: async (groupId) => {
    set({ isLoading: true, error: null });

    try {
      const group = await getGroup(groupId);
      // Use setCurrentGroup to ensure host_participant_id is stored in localStorage
      get().setCurrentGroup(group);
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch group',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Fetch active group for a table
   */
  fetchActiveGroupByTable: async (tableId) => {
    set({ isLoading: true, error: null });

    const group = await getActiveGroupByTable(tableId);
    // Use setCurrentGroup to ensure host_participant_id is stored in localStorage
    get().setCurrentGroup(group);
    set({ isLoading: false });
  },

  /**
   * Fetch group by share code
   */
  fetchGroupByShareCode: async (shareCode: string) => {
    set({ isLoading: true, error: null });

    try {
      const group = await getGroupByShareCode(shareCode);
      // Use setCurrentGroup to ensure host_participant_id is stored in localStorage
      get().setCurrentGroup(group);
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch group',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Close the current group
   */
  closeGroup: async (reason?: string) => {
    const { currentGroup } = get();

    if (!currentGroup) {
      set({ error: 'No active group to close' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const updatedGroup = await closeGroup(currentGroup.group_id, { reason });
      // Use setCurrentGroup to ensure host_participant_id is stored in localStorage
      get().setCurrentGroup({ ...currentGroup, ...updatedGroup });
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to close group',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Update group settings
   */
  updateGroupSettings: async (settings) => {
    const { currentGroup } = get();

    if (!currentGroup) {
      set({ error: 'No active group' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const updatedGroup = await updateGroupSettings(currentGroup.group_id, settings);
      // Use setCurrentGroup to ensure host_participant_id is stored in localStorage
      get().setCurrentGroup({ ...currentGroup, ...updatedGroup });
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update group settings',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Clear the current group
   * Also clears the persisted host_participant_id from localStorage
   */
  clearGroup: () => {
    // Get session ID before clearing state
    const sessionId = (() => {
      if (typeof window === 'undefined') return null
      try {
        const tableSessionStr = localStorage.getItem('tableSession');
        const qrSessionStr = localStorage.getItem('qr_session');

        let id: string | null = null;
        if (tableSessionStr) {
          const tableSession = JSON.parse(tableSessionStr);
          id = tableSession.session_id;
        } else if (qrSessionStr) {
          const qrSession = JSON.parse(qrSessionStr);
          id = qrSession.sessionId;
        }
        return id;
      } catch (e) {
        return null;
      }
    })();

    // Clear state
    set({ currentGroup: null, error: null });

    // Clear the host_participant_id from localStorage
    if (sessionId) {
      localStorage.removeItem(`group-host-${sessionId}`);
    }
  },

  /**
   * Set loading state
   */
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  /**
   * Set error state
   */
  setError: (error: string | null) => {
    set({ error });
  },
}));

/**
 * Selectors for derived state
 */
export const selectCurrentGroup = (state: GroupStore) => state.currentGroup;
export const selectGroupMembers = (state: GroupStore) => state.currentGroup?.members || [];
export const selectGroupLoading = (state: GroupStore) => state.isLoading;
export const selectGroupError = (state: GroupStore) => state.error;
// CORRECT: Compare participant ID (unique per device) not session ID (shared by all devices at table)
export const selectIsGroupHost = (state: GroupStore, participantId: number) =>
  state.currentGroup?.host_participant_id === participantId;
