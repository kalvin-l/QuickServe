/**
 * Group API Client
 * Handles all group ordering related API calls
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export type PaymentType = 'host_pays_all' | 'individual' | 'hybrid';
export type GroupStatus = 'active' | 'closed' | 'paid' | 'cancelled';

export interface GroupMember {
  id: number;
  member_id: string;
  session_id: string;
  participant_id: number; // Linked SessionParticipant ID
  name: string | null;
  has_joined: boolean;
  has_paid: boolean;
  order_subtotal: number; // in cents
  payment_method: string | null;
  joined_at: string | null;
  paid_at: string | null;
  is_active: boolean;
}

export interface GroupSession {
  id: number;
  group_id: string;
  table_id: number;
  host_session_id: string;
  host_participant_id: number | null;
  host_name: string | null;
  payment_type: PaymentType;
  auto_approve_joins: boolean;
  max_members: number;
  status: GroupStatus;
  member_count: number;
  share_code: string;
  share_link: string | null;
  created_at: string;
  closed_at: string | null;
  paid_at: string | null;
  metadata: Record<string, any>;
  is_active: boolean;
}

export interface GroupDetail extends GroupSession {
  members: GroupMember[];
}

export interface CreateGroupRequest {
  table_id: number;
  session_id: string;
  participant_id?: number;
  host_name?: string;
  payment_type: PaymentType;
  auto_approve_joins?: boolean;
  max_members?: number;
}

export interface UpdateGroupRequest {
  auto_approve_joins?: boolean;
  max_members?: number;
}

export interface CloseGroupRequest {
  reason?: string;
}

export interface UpdateGroupStatusRequest {
  status: GroupStatus;
}

export interface GroupStats {
  total_groups: number;
  active_groups: number;
  closed_groups: number;
  paid_groups: number;
  total_members: number;
  average_members_per_group: number;
  by_payment_type: Record<string, number>;
}

class GroupApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'GroupApiError';
  }
}

/**
 * Create a new group ordering session
 */
export async function createGroup(request: CreateGroupRequest): Promise<GroupSession> {
  const response = await fetch(`${API_URL}/groups/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 409) {
      throw new GroupApiError('Table already has an active group', 409);
    }
    throw new GroupApiError(error.detail || 'Failed to create group', response.status);
  }

  return response.json();
}

/**
 * Get group details by group ID
 */
export async function getGroup(groupId: string): Promise<GroupDetail> {
  const response = await fetch(`${API_URL}/groups/${groupId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new GroupApiError('Group not found', 404);
    }
    throw new GroupApiError('Failed to get group', response.status);
  }

  return response.json();
}

/**
 * Get group by share code
 */
export async function getGroupByShareCode(shareCode: string): Promise<GroupDetail> {
  const response = await fetch(`${API_URL}/groups/share-code/${shareCode}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new GroupApiError('Group not found', 404);
    }
    throw new GroupApiError('Failed to get group', response.status);
  }

  return response.json();
}

/**
 * Get active group for a table
 * Returns null if no active group exists (instead of throwing 404 error)
 */
export async function getActiveGroupByTable(tableId: number): Promise<GroupDetail | null> {
  const response = await fetch(`${API_URL}/groups/table/${tableId}/active`);

  if (!response.ok) {
    throw new GroupApiError('Failed to get group', response.status);
  }

  const data = await response.json();

  // Response format: {"group": null | GroupDetail}
  return data.group;
}

/**
 * Update group settings
 */
export async function updateGroupSettings(
  groupId: string,
  request: UpdateGroupRequest
): Promise<GroupSession> {
  const response = await fetch(`${API_URL}/groups/${groupId}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new GroupApiError('Failed to update group settings', response.status);
  }

  return response.json();
}

/**
 * Close group (no new members)
 */
export async function closeGroup(
  groupId: string,
  request?: CloseGroupRequest
): Promise<GroupSession> {
  const response = await fetch(`${API_URL}/groups/${groupId}/close`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request || {}),
  });

  if (!response.ok) {
    throw new GroupApiError('Failed to close group', response.status);
  }

  return response.json();
}

/**
 * Update group status
 */
export async function updateGroupStatus(
  groupId: string,
  request: UpdateGroupStatusRequest
): Promise<GroupSession> {
  const response = await fetch(`${API_URL}/groups/${groupId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new GroupApiError('Failed to update group status', response.status);
  }

  return response.json();
}

/**
 * Get all active groups (admin)
 */
export async function getAllActiveGroups(): Promise<GroupDetail[]> {
  const response = await fetch(`${API_URL}/groups/active/all`);

  if (!response.ok) {
    throw new GroupApiError('Failed to get active groups', response.status);
  }

  return response.json();
}

/**
 * Get group statistics
 */
export async function getGroupStatistics(
  startDate?: string,
  endDate?: string
): Promise<GroupStats> {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await fetch(`${API_URL}/groups/statistics/summary?${params}`);

  if (!response.ok) {
    throw new GroupApiError('Failed to get statistics', response.status);
  }

  return response.json();
}
