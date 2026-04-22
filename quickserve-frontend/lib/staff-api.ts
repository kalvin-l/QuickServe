/**
 * Staff Management API Client
 *
 * Functions for interacting with staff management endpoints.
 */

import { apiClient } from '@/lib/api/client';
import type {
  AdminUser,
  StaffSearchParams,
  StaffListResponse,
  StaffCreateRequest,
  StaffUpdateRequest,
} from '@/types/admin-auth.types';

// Re-export utility functions from staff-utils for backward compatibility
export {
  getStaffInitials,
  getAvatarColor,
  getStatusColor,
  getStatusLabel,
  canPerformAction,
} from '@/utils/staff-utils';

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get paginated list of staff with optional filtering.
 * @param params - Search and pagination parameters
 * @returns Paginated staff list response
 */
export async function getStaffList(
  params: StaffSearchParams = {}
): Promise<StaffListResponse> {
  const queryParams = new URLSearchParams();

  if (params.department) queryParams.append('department', params.department);
  if (params.status) queryParams.append('status', params.status);
  if (params.role) queryParams.append('role', params.role);
  if (params.search) queryParams.append('search', params.search);
  queryParams.append('page', String(params.page || 1));
  queryParams.append('page_size', String(params.page_size || 20));

  return apiClient.get<StaffListResponse>(
    `/staff?${queryParams.toString()}`
  );
}

/**
 * Get single staff member by ID.
 * @param id - Staff member ID
 * @returns Staff member data
 */
export async function getStaffById(id: number): Promise<AdminUser> {
  return apiClient.get<AdminUser>(`/staff/${id}`);
}

/**
 * Create new staff member.
 * @param data - Staff creation data
 * @returns Created staff member data
 */
export async function createStaff(data: StaffCreateRequest): Promise<AdminUser> {
  return apiClient.post<AdminUser>('/staff', data);
}

/**
 * Update staff member.
 * @param id - Staff member ID
 * @param data - Update data (all fields optional)
 * @returns Updated staff member data
 */
export async function updateStaff(
  id: number,
  data: StaffUpdateRequest
): Promise<AdminUser> {
  return apiClient.put<AdminUser>(`/staff/${id}`, data);
}

/**
 * Delete (deactivate) staff member.
 * @param id - Staff member ID
 * @returns Deactivated staff member data
 */
export async function deleteStaff(id: number): Promise<AdminUser> {
  return apiClient.delete<AdminUser>(`/staff/${id}`);
}

/**
 * Update staff status only (quick status toggle).
 * @param id - Staff member ID
 * @param status - New status value
 * @returns Updated staff member data
 */
export async function updateStaffStatus(
  id: number,
  status: 'active' | 'on_break' | 'off_duty' | 'on_leave'
): Promise<AdminUser> {
  return apiClient.patch<AdminUser>(`/staff/${id}/status`, { status });
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a user object has valid staff data.
 * @param user - Object to check
 * @returns True if object is a valid AdminUser
 */
export function isAdminUser(user: unknown): user is AdminUser {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    'email' in user &&
    'name' in user &&
    'role' in user
  );
}

/**
 * Check if a user is active.
 * @param user - Admin user object
 * @returns True if user is_active is true or undefined
 */
export function isUserActive(user: AdminUser): boolean {
  return user.is_active !== false;
}

/**
 * Check if a user is currently working (active or on break).
 * @param user - Admin user object
 * @returns True if status is active or on_break
 */
export function isUserWorking(user: AdminUser): boolean {
  return user.status === 'active' || user.status === 'on_break';
}
