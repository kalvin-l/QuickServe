/**
 * Group Types
 *
 * Type definitions for group ordering feature
 */

import type { PaymentType, GroupStatus, GroupMember, GroupSession, GroupDetail } from '@/lib/groupApi';

/**
 * Group Store State
 */
export interface GroupStore {
  // Current group the user is part of
  currentGroup: GroupDetail | null;

  // Loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  // Actions
  setCurrentGroup: (group: GroupDetail | null) => void;
  createGroup: (request: {
    table_id: number;
    session_id: string;
    participant_id?: number;
    host_name?: string;
    payment_type: PaymentType;
    auto_approve_joins?: boolean;
    max_members?: number;
  }) => Promise<GroupDetail>;
  fetchGroup: (groupId: string) => Promise<void>;
  fetchGroupByShareCode: (shareCode: string) => Promise<void>;
  fetchActiveGroupByTable: (tableId: number) => Promise<void>;
  closeGroup: (reason?: string) => Promise<void>;
  updateGroupSettings: (settings: {
    auto_approve_joins?: boolean;
    max_members?: number;
  }) => Promise<void>;
  clearGroup: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Group Creation Form State
 */
export interface GroupCreationForm {
  step: 'select-mode' | 'enter-name' | 'creating' | 'success';
  paymentType: PaymentType | null;
  hostName: string;
  autoApproveJoins: boolean;
  maxMembers: number;
}

/**
 * Group Member with Additional UI State
 */
export interface GroupMemberUI extends GroupMember {
  isHost: boolean;
  isCurrentUser: boolean;
}

/**
 * Group UI State
 */
export interface GroupUIState {
  showShareModal: boolean;
  showMemberList: boolean;
  showSettings: boolean;
}
