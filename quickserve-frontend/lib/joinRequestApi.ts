/**
 * Join Request API Client
 * Handles all join request related API calls
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export type JoinRequestStatus = 'pending' | 'approved' | 'declined' | 'timeout';

export interface JoinRequest {
  id: number;
  request_id: string;
  group_session_id: number;
  participant_id: number | null;
  requester_session_id: string;
  requester_name: string | null;
  message: string | null;
  status: JoinRequestStatus;
  created_at: string;
  responded_at: string | null;
  timeout_at: string | null;
  response_reason: string | null;
  is_active: boolean;
}

export interface CreateJoinRequestParams {
  group_id: string;
  session_id: string;
  participant_id?: number | null;
  name?: string;
  message?: string;
}

class JoinRequestApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'JoinRequestApiError';
  }
}

/**
 * Create a join request to join a group
 */
export async function createJoinRequest(
  params: CreateJoinRequestParams
): Promise<JoinRequest> {
  const response = await fetch(`${API_URL}/join-requests/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new JoinRequestApiError(error.detail || 'Failed to create join request', response.status);
  }

  return response.json();
}

/**
 * Get pending join requests for a group (host use)
 */
export async function getPendingRequests(groupId: string): Promise<JoinRequest[]> {
  const response = await fetch(`${API_URL}/join-requests/group/${groupId}/pending`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new JoinRequestApiError('Group not found', 404);
    }
    throw new JoinRequestApiError('Failed to get pending requests', response.status);
  }

  return response.json();
}

/**
 * Approve a join request
 * Requires session_id for host permission verification
 */
export async function approveJoinRequest(
  requestId: string,
  sessionId: string
): Promise<JoinRequest> {
  const response = await fetch(
    `${API_URL}/join-requests/${requestId}/approve?session_id=${encodeURIComponent(sessionId)}`,
    {
      method: 'PATCH',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new JoinRequestApiError(error.detail || 'Failed to approve request', response.status);
  }

  return response.json();
}

/**
 * Decline a join request
 * Requires session_id for host permission verification
 */
export async function declineJoinRequest(
  requestId: string,
  sessionId: string,
  reason?: string
): Promise<JoinRequest> {
  const url = new URL(`${API_URL}/join-requests/${requestId}/decline`);
  url.searchParams.append('session_id', sessionId);

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new JoinRequestApiError(error.detail || 'Failed to decline request', response.status);
  }

  return response.json();
}

/**
 * Get current user's join request status
 */
export async function getMyJoinRequest(sessionId: string): Promise<JoinRequest | null> {
  const response = await fetch(`${API_URL}/join-requests/my/${sessionId}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new JoinRequestApiError('Failed to get join request', response.status);
  }

  return response.json();
}

/**
 * Get a join request by its ID
 */
export async function getJoinRequest(requestId: string): Promise<JoinRequest> {
  const response = await fetch(`${API_URL}/join-requests/${requestId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new JoinRequestApiError('Request not found', 404);
    }
    throw new JoinRequestApiError('Failed to get request', response.status);
  }

  return response.json();
}
