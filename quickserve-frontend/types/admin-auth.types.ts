/**
 * Admin Authentication System Types
 * Types for admin authentication, user management, and authorization
 */

// ============== Enums ==============

export type AdminRole = 'admin' | 'manager' | 'staff';
export type AdminStatus = 'active' | 'on_break' | 'off_duty' | 'on_leave';
export type AdminDepartment = 'kitchen' | 'barista' | 'service' | 'management';

// ============== User Types ==============

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  status?: AdminStatus;
  department?: AdminDepartment;  // @deprecated: Use departments instead
  departments?: AdminDepartment[];  // Multiple departments support
  avatar_url?: string;
  hourly_rate?: number;
  hire_date?: string;
  is_active?: boolean;
  phone?: string;
  created_at: string;
  updated_at?: string;
}

// ============== Staff API Types ==============

export interface StaffSearchParams {
  department?: AdminDepartment;
  status?: AdminStatus;
  role?: AdminRole;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface StaffListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface StaffCreateRequest {
  email: string;
  name: string;
  password: string;
  role?: AdminRole;
  department?: AdminDepartment;  // @deprecated: Use departments instead
  departments?: AdminDepartment[];  // Multiple departments support
  status?: AdminStatus;
  hire_date?: string;
  hourly_rate?: number;
  phone?: string;
  avatar_url?: string;
}

export interface StaffUpdateRequest {
  name?: string;
  email?: string;
  role?: AdminRole;
  is_active?: boolean;
  department?: AdminDepartment;  // @deprecated: Use departments instead
  departments?: AdminDepartment[];  // Multiple departments support
  status?: AdminStatus;
  hire_date?: string;
  hourly_rate?: number;
  phone?: string;
  avatar_url?: string;
  password?: string;
}

export interface StaffStatusUpdateRequest {
  status: AdminStatus;
}

// ============== Auth Types ==============

export interface AdminAuthResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  user: AdminUser;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminAuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============== Context Types ==============

export interface AdminAuthContextType {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AdminUser>;
  logout: () => void;
  clearError: () => void;
}

// ============== API Error Types ==============

export interface AdminAuthError {
  detail: string;
  code?: string;
}
