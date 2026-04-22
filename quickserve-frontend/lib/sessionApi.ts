/**
 * Session API Client
 * Handles all session-related API calls
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface TableSession {
  id: number;
  table_id: number;
  table_number: number;
  session_id: string;
  access_code: string;
  customer_count: number;
  customer_name: string | null;
  status: 'active' | 'idle' | 'pausing' | 'paused' | 'ended' | 'abandoned';
  payment_status?: string;
  pending_orders_count?: number;
  session_end_scheduled_at?: string | null;
  paused_at?: string | null;
  ended_by?: string | null;
  end_reason?: string | null;
  grace_period_minutes?: number;
  started_at: string;
  last_activity_at: string;
  ended_at: string | null;
  metadata: Record<string, any>;
  is_active: boolean;
}

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

export interface CapacitySummary {
  total_tables: number;
  available_tables: number;
  occupied_tables: number;
  active_sessions: number;
  total_capacity: number;
  current_occupancy: number;
  occupancy_percent: number;
}

export interface TableStatus {
  table_id: number;
  table_number: number;
  location: string;
  capacity: number;
  status: string;
  is_occupied: boolean;
  available_seats: number;
  session: TableSession | null;
}

export interface CreateSessionRequest {
  table_number: number;
  access_code: string;
  customer_count?: number;
  customer_name?: string;
}

class SessionApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'SessionApiError';
  }
}

/**
 * Start a new session at a table
 */
export async function startSession(request: CreateSessionRequest): Promise<TableSession> {
  const response = await fetch(`${API_URL}/sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new SessionApiError(error.detail || 'Failed to start session', response.status);
  }

  return response.json();
}

/**
 * Get active session for a table
 */
export async function getActiveSession(tableId: number): Promise<TableSession> {
  const response = await fetch(`${API_URL}/sessions/active/${tableId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new SessionApiError('No active session found', 404);
    }
    throw new SessionApiError('Failed to get session', response.status);
  }

  return response.json();
}

/**
 * Get session by access code
 * Returns null if not found (instead of throwing error)
 */
export async function getSessionByAccessCode(accessCode: string): Promise<TableSession | null> {
  const url = `${API_URL}/sessions/access-code/${accessCode}`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new SessionApiError('Failed to get session', response.status);
  }

  const session = await response.json();
  return session;
}

/**
 * Get session by session ID (UUID)
 */
export async function getSessionBySessionId(sessionId: string): Promise<TableSession> {
  const response = await fetch(`${API_URL}/sessions/session-id/${sessionId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new SessionApiError('Session not found', 404);
    }
    throw new SessionApiError('Failed to get session', response.status);
  }

  return response.json();
}

/**
 * End a session
 */
export async function endSession(tableId: number): Promise<TableSession> {
  const response = await fetch(`${API_URL}/sessions/end/${tableId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new SessionApiError('Failed to end session', response.status);
  }

  return response.json();
}

/**
 * Update session activity (call this on user interactions)
 */
export async function updateSessionActivity(tableId: number): Promise<void> {
  await fetch(`${API_URL}/sessions/update-activity/${tableId}`, {
    method: 'POST',
  });
}

/**
 * Update session metadata (cart, preferences, etc.)
 */
export async function updateSessionMetadata(
  tableId: number,
  metadata: Record<string, any>
): Promise<void> {
  await fetch(`${API_URL}/sessions/metadata/${tableId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });
}

/**
 * Get all active sessions (admin)
 */
export async function getAllActiveSessions(): Promise<TableSession[]> {
  const response = await fetch(`${API_URL}/sessions/active/all`);
  if (!response.ok) {
    throw new SessionApiError('Failed to get sessions', response.status);
  }
  return response.json();
}

/**
 * Get capacity summary
 */
export async function getCapacitySummary(): Promise<CapacitySummary> {
  const response = await fetch(`${API_URL}/sessions/capacity/summary`);
  if (!response.ok) {
    throw new SessionApiError('Failed to get capacity', response.status);
  }
  return response.json();
}

/**
 * Get capacity by location
 */
export async function getCapacityByLocation(): Promise<Record<string, CapacitySummary>> {
  const response = await fetch(`${API_URL}/sessions/capacity/by-location`);
  if (!response.ok) {
    throw new SessionApiError('Failed to get capacity by location', response.status);
  }
  return response.json();
}

/**
 * Get available tables
 */
export async function getAvailableTables(
  location?: string,
  minCapacity?: number
): Promise<{ count: number; tables: Array<{ id: number; table_number: number; location: string; capacity: number }> }> {
  const params = new URLSearchParams();
  if (location) params.append('location', location);
  if (minCapacity) params.append('min_capacity', minCapacity.toString());

  const response = await fetch(`${API_URL}/sessions/capacity/available?${params}`);
  if (!response.ok) {
    throw new SessionApiError('Failed to get available tables', response.status);
  }
  return response.json();
}

/**
 * Get table status
 */
export async function getTableStatus(tableId: number): Promise<TableStatus> {
  const response = await fetch(`${API_URL}/sessions/capacity/table/${tableId}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new SessionApiError('Table not found', 404);
    }
    throw new SessionApiError('Failed to get table status', response.status);
  }
  return response.json();
}

/**
 * Check if can seat party
 */
export async function canSeatParty(
  partySize: number,
  location?: string
): Promise<{ can_seat: boolean; recommended_table: { id: number; table_number: number; location: string; capacity: number } | null }> {
  const params = new URLSearchParams();
  if (location) params.append('location', location);

  const response = await fetch(`${API_URL}/sessions/capacity/can-seat/${partySize}?${params}`);
  if (!response.ok) {
    throw new SessionApiError('Failed to check capacity', response.status);
  }
  return response.json();
}

/**
 * Get all tables status (admin)
 */
export async function getAllTablesStatus(): Promise<TableStatus[]> {
  const response = await fetch(`${API_URL}/sessions/capacity/all-tables`);
  if (!response.ok) {
    throw new SessionApiError('Failed to get tables status', response.status);
  }
  return response.json();
}

/**
 * Get session statistics
 */
export async function getSessionStatistics(
  startDate?: string,
  endDate?: string
): Promise<{
  total_sessions: number;
  active_sessions: number;
  ended_sessions: number;
  abandoned_sessions: number;
  total_customers: number;
  average_customers_per_session: number;
  period_start: string;
  period_end: string;
}> {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await fetch(`${API_URL}/sessions/statistics?${params}`);
  if (!response.ok) {
    throw new SessionApiError('Failed to get statistics', response.status);
  }
  return response.json();
}

// =========================
// Session Pooling API Functions
// =========================

export interface JoinSessionRequest {
  access_code: string;
  device_id: string;
  device_name?: string;
  customer_count?: number;
}

export interface JoinSessionResponse {
  session: TableSession;
  participant: SessionParticipant;
}

/**
 * Join an existing session with a device
 * Creates a new session if none exists for the access code
 */
export async function joinSession(request: JoinSessionRequest): Promise<JoinSessionResponse> {
  const response = await fetch(`${API_URL}/sessions/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new SessionApiError(error.detail || 'Failed to join session', response.status);
  }

  const data = await response.json();
  return data;
}

/**
 * Get participant and session by device_id
 */
export async function getParticipantByDevice(deviceId: string): Promise<{
  participant: SessionParticipant | null;
  session: TableSession | null;
}> {
  const response = await fetch(`${API_URL}/sessions/participant/device/${deviceId}`);

  if (!response.ok) {
    throw new SessionApiError('Failed to get participant', response.status);
  }

  const data = await response.json();
  return data;
}

/**
 * Get all participants for a session
 */
export async function getSessionParticipants(tableSessionId: number): Promise<SessionParticipant[]> {
  const response = await fetch(`${API_URL}/sessions/${tableSessionId}/participants`);

  if (!response.ok) {
    throw new SessionApiError('Failed to get session participants', response.status);
  }

  const data = await response.json();
  return data.participants;
}

// =========================
// Phase 2: Session Pause/Resume API Functions
// =========================

export interface PauseSessionRequest {
  reason?: string;
  preserve_cart?: boolean;
  grace_period_minutes?: number;
}

export interface PauseSessionResponse {
  success: boolean;
  session: {
    id: number;
    status: string;
  };
  cart_preserved: boolean;
  preserved_cart_id?: string;
  grace_period_end?: string;
  can_resume_until: string;
}

export interface ResumeSessionRequest {
  device_id: string;
  new_table_id?: number;
}

export interface ResumeSessionResponse {
  success: boolean;
  session: {
    id: number;
    status: string;
    table_id: number;
    table_number?: number;
    session_id: string;
    access_code: string;
  };
  cart_restored: boolean;
  cart_items_count: number;
  cart_total: number;
}

export interface KeepAliveResponse {
  success: boolean;
  session_status: string;
  extended_until: string;
}

export interface HeartbeatRequest {
  device_id: string;
  participant_id?: string;
  timestamp?: string;
}

export interface HeartbeatResponse {
  success: boolean;
  session_status: string;
  server_time: string;
  warnings: string[];
}

export interface CanEndSessionResponse {
  can_end: boolean;
  reason?: string;
  blocking_items?: {
    pending_orders?: number;
    unpaid_amount?: number;
    preparing_items?: number;
  };
}

export interface ResumableSession {
  session_id: number;
  session_uuid: string;
  table_id: number;
  table_number?: number;
  paused_at: string;
  can_resume_until: string;
  has_cart: boolean;
  cart_item_count: number;
  cart_total: number;
  participant_id: string;
}

export interface ResumableSessionsResponse {
  sessions: ResumableSession[];
}

/**
 * Pause a session with grace period
 */
export async function pauseSession(sessionId: number, request: PauseSessionRequest): Promise<PauseSessionResponse> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new SessionApiError(error.detail || 'Failed to pause session', response.status);
  }

  return response.json();
}

/**
 * Resume a paused session
 */
export async function resumeSession(sessionId: number, request: ResumeSessionRequest): Promise<ResumeSessionResponse> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new SessionApiError(error.detail || 'Failed to resume session', response.status);
  }

  return response.json();
}

/**
 * Extend grace period for a session in PAUSING state
 */
export async function keepSessionAlive(sessionId: number): Promise<KeepAliveResponse> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/keep-alive`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new SessionApiError(error.detail || 'Failed to extend grace period', response.status);
  }

  return response.json();
}

/**
 * Send heartbeat ping from client to server
 */
export async function sendHeartbeat(sessionId: number, request: HeartbeatRequest): Promise<HeartbeatResponse> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new SessionApiError(error.detail || 'Failed to send heartbeat', response.status);
  }

  return response.json();
}

/**
 * Check if a session can be ended safely
 */
export async function checkSessionCanEnd(sessionId: number): Promise<CanEndSessionResponse> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/can-end`);

  if (!response.ok) {
    throw new SessionApiError('Failed to check session', response.status);
  }

  return response.json();
}

/**
 * Get all resumable (paused) sessions for a device
 */
export async function getResumableSessions(deviceId: string): Promise<ResumableSessionsResponse> {
  const response = await fetch(`${API_URL}/sessions/device/${deviceId}/resumable`);

  if (!response.ok) {
    throw new SessionApiError('Failed to get resumable sessions', response.status);
  }

  return response.json();
}
