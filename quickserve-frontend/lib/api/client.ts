/**
 * API Client Configuration
 * Handles all HTTP requests to the backend
 */

// API Configuration
const API_CONFIG = {
  // FastAPI Backend URL
  // Update .env.local to change the API URL
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  TIMEOUT: 10000,
} as const;

// Token key for localStorage
const ADMIN_TOKEN_KEY = 'admin_auth_token';

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch (e) {
    console.error('[ApiClient] Failed to get token:', e);
    return null;
  }
}

/**
 * Get default headers including authentication
 */
function getDefaultHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * HTTP Client for making API requests
 */
class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = API_CONFIG.BASE_URL, timeout: number = API_CONFIG.TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Handle fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = this.timeout
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Merge default headers with provided headers
      const headers = {
        ...getDefaultHeaders(),
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      // Enhance error with URL information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch: ${url} - ${errorMessage}`);
    }
  }

  /**
   * Parse response based on content type
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || error.message || `HTTP ${response.status}`);
    }

    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return response.text() as unknown as T;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.fetchWithTimeout(url, { ...options, method: 'GET' });
    return this.parseResponse<T>(response);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.fetchWithTimeout(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return this.parseResponse<T>(response);
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.fetchWithTimeout(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return this.parseResponse<T>(response);
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.fetchWithTimeout(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return this.parseResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.fetchWithTimeout(url, { ...options, method: 'DELETE' });
    return this.parseResponse<T>(response);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

/**
 * Helper function to create typed API endpoints
 */
export function createApiEndpoint<T>(baseEndpoint: string) {
  return {
    getAll: () => apiClient.get<T[]>(baseEndpoint),
    getById: (id: string | number) => apiClient.get<T>(`${baseEndpoint}/${id}`),
    create: (data: Partial<T>) => apiClient.post<T>(baseEndpoint, data),
    update: (id: string | number, data: Partial<T>) => apiClient.put<T>(`${baseEndpoint}/${id}`, data),
    delete: (id: string | number) => apiClient.delete<void>(`${baseEndpoint}/${id}`),
  };
}
