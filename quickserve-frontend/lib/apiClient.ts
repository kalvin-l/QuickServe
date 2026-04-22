/**
 * Session-Aware API Client
 *
 * Wraps fetch calls to automatically include QR session token
 * for table-specific operations.
 */

const QR_SESSION_KEY = 'qr_session';

interface QRSession {
  token: string;
  tableNumber: number;
  sessionId: string;
  tableId: number;
}

/**
 * Get QR session from localStorage
 */
function getQRSession(): QRSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(QR_SESSION_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Enhanced fetch options type
 */
export interface SessionFetchOptions extends RequestInit {
  requireSession?: boolean;
  skipAuth?: boolean;
}

/**
 * Session-aware fetch wrapper
 *
 * Automatically includes QR session token if available.
 * Use requireSession: true to ensure request has valid session.
 */
export async function sessionFetch(
  url: string,
  options: SessionFetchOptions = {}
): Promise<Response> {
  const { requireSession = false, skipAuth = false, ...fetchOptions } = options;

  // Get session from localStorage
  const session = getQRSession();

  // Check if session is required
  if (requireSession && !session) {
    throw new Error('No active session. Please scan a QR code first.');
  }

  // Build headers
  const headers = new Headers(fetchOptions.headers);

  // Add content-type if not present
  if (!headers.has('Content-Type') && fetchOptions.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  // Add session token to headers if available
  if (session && session.token && !skipAuth) {
    headers.set('X-Session-Token', session.token);
    headers.set('X-Table-Number', session.tableNumber.toString());
    headers.set('X-Session-Id', session.sessionId);
  }

  // Make request
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Handle session expired errors
  if (response.status === 401 && session) {
    // Clear expired session
    localStorage.removeItem(QR_SESSION_KEY);

    // Redirect to home page
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  return response;
}

/**
 * Helper for GET requests
 */
export async function get<T = any>(
  url: string,
  options: SessionFetchOptions = {}
): Promise<T> {
  const response = await sessionFetch(url, { ...options, method: 'GET' });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Helper for POST requests
 */
export async function post<T = any>(
  url: string,
  data?: any,
  options: SessionFetchOptions = {}
): Promise<T> {
  const response = await sessionFetch(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Helper for PUT requests
 */
export async function put_<T = any>(
  url: string,
  data?: any,
  options: SessionFetchOptions = {}
): Promise<T> {
  const response = await sessionFetch(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Helper for PATCH requests
 */
export async function patch<T = any>(
  url: string,
  data?: any,
  options: SessionFetchOptions = {}
): Promise<T> {
  const response = await sessionFetch(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Helper for DELETE requests
 */
export async function del<T = any>(
  url: string,
  options: SessionFetchOptions = {}
): Promise<T> {
  const response = await sessionFetch(url, { ...options, method: 'DELETE' });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Check if user has active QR session
 */
export function hasActiveSession(): boolean {
  const session = getQRSession();
  return session !== null;
}

/**
 * Get current session data
 */
export function getCurrentSession() {
  return getQRSession();
}
