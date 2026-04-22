/**
 * Staff Utility Functions
 *
 * Helper functions for staff display, formatting, and calculations.
 */

import type { AdminUser, AdminRole, AdminStatus } from '@/types/admin-auth.types';
import { STAFF_STATUS, getRoleLabel, getRoleLevel } from '@/constants/staff';

// ============================================================================
// Avatar Utilities
// ============================================================================

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-teal-500',
] as const;

/**
 * Get initials from a name for avatar display.
 * @param name - Full name of the staff member
 * @returns Up to 2 initials (first letters of first two names)
 */
export function getStaffInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get a consistent avatar color based on the staff member's name.
 * Uses a simple hash algorithm to ensure the same name always gets the same color.
 * @param name - Full name of the staff member
 * @returns Tailwind CSS color class
 */
export function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ============================================================================
// Status Utilities
// ============================================================================

/**
 * Get color configuration for a staff status.
 * @param status - The staff status
 * @returns Object with Tailwind CSS classes for styling
 */
export function getStatusColor(status: AdminStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const statusConfig = STAFF_STATUS.find(s => s.value === status);
  return statusConfig?.color || STAFF_STATUS[2].color; // Default to off_duty
}

/**
 * Get human-readable label for a status.
 * @param status - The staff status
 * @returns Display label for the status
 */
export function getStatusLabel(status: AdminStatus): string {
  return STAFF_STATUS.find(s => s.value === status)?.label || 'Unknown';
}

/**
 * Check if a status indicates the staff member is currently working.
 * @param status - The staff status
 * @returns True if status is active or on_break
 */
export function isWorkingStatus(status: AdminStatus): boolean {
  return status === 'active' || status === 'on_break';
}

// ============================================================================
// Permission Utilities
// ============================================================================

/**
 * Check if a user with actorRole can perform an action.
 * @param actorRole - The role of the user attempting the action
 * @param action - The action being attempted
 * @param targetRole - The role of the target user (optional)
 * @returns True if the action is allowed
 */
export function canPerformAction(
  userRole: AdminRole,
  action: 'create' | 'edit' | 'delete' | 'view',
  targetRole?: AdminRole
): boolean {
  if (userRole === 'admin') return true;
  if (userRole === 'manager') {
    if (action === 'delete') return false;
    if (targetRole === 'admin') return false;
    return true;
  }
  // Staff can only view
  return action === 'view';
}

/**
 * Check if a user can modify another user based on roles.
 * @param actorRole - The role of the user attempting the modification
 * @param targetRole - The role of the user being modified
 * @returns True if modification is allowed
 */
export function canModifyUser(actorRole: AdminRole, targetRole: AdminRole): boolean {
  const actorLevel = getRoleLevel(actorRole);
  const targetLevel = getRoleLevel(targetRole);
  return actorLevel > targetLevel;
}

/**
 * Check if a user can promote someone to a specific role.
 * @param actorRole - The role of the user attempting the promotion
 * @param targetRole - The role being assigned
 * @returns True if promotion is allowed
 */
export function canPromoteToRole(actorRole: AdminRole, targetRole: AdminRole): boolean {
  const actorLevel = getRoleLevel(actorRole);
  const targetLevel = getRoleLevel(targetRole);

  // Only admins can promote to admin or manager
  if (targetLevel >= 2) {
    return actorRole === 'admin';
  }

  // Managers and admins can promote to staff
  return actorLevel >= 2;
}

// ============================================================================
// Display Utilities
// ============================================================================

/**
 * Format hourly rate for display.
 * @param rate - The hourly rate as a number or string
 * @returns Formatted string with peso sign and 2 decimal places
 */
export function formatHourlyRate(rate: number | string | undefined): string {
  if (rate === undefined || rate === null) return 'Not set';
  const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
  return `₱${numRate.toFixed(2)}/hr`;
}

/**
 * Format hire date for display.
 * @param dateStr - ISO date string
 * @returns Formatted date string or 'Not set'
 */
export function formatHireDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Not set';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format creation date for display.
 * @param dateStr - ISO date string
 * @returns Formatted date string
 */
export function formatCreatedDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Unknown';
  }
}

/**
 * Get display name for a staff member.
 * @param staff - The staff user object
 * @returns Display name with role
 */
export function getStaffDisplayName(staff: AdminUser): string {
  return `${staff.name} (${getRoleLabel(staff.role)})`;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate email format.
 * @param email - Email string to validate
 * @returns True if email is valid
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate password meets minimum requirements.
 * @param password - Password string to validate
 * @param minLength - Minimum length (default 6)
 * @returns True if password is valid
 */
export function isValidPassword(password: string, minLength: number = 6): boolean {
  return password.length >= minLength;
}

/**
 * Validate staff form data.
 * @param data - Form data to validate
 * @returns Object with isValid flag and errorMessage if invalid
 */
export interface StaffValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateStaffData(
  data: { name?: string; email?: string; password?: string; hourly_rate?: number }
): StaffValidationResult {
  if (!data.name?.trim()) {
    return { isValid: false, error: 'Name is required' };
  }

  if (!data.email?.trim()) {
    return { isValid: false, error: 'Email is required' };
  }

  if (!isValidEmail(data.email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  if (data.password !== undefined && data.password.length > 0) {
    if (!isValidPassword(data.password)) {
      return { isValid: false, error: 'Password must be at least 6 characters' };
    }
  }

  if (data.hourly_rate !== undefined && data.hourly_rate < 0) {
    return { isValid: false, error: 'Hourly rate must be a positive number' };
  }

  return { isValid: true };
}
