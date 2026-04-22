/**
 * Staff Management Constants
 *
 * Centralized constants for staff-related enums, labels, and options.
 */

// ============================================================================
// Enums
// ============================================================================

export type AdminRole = 'admin' | 'manager' | 'staff';
export type AdminStatus = 'active' | 'on_break' | 'off_duty' | 'on_leave';
export type AdminDepartment = 'kitchen' | 'barista' | 'service' | 'management';

// ============================================================================
// Role Constants
// ============================================================================

export const ADMIN_ROLES: { value: AdminRole; label: string; level: number }[] = [
  { value: 'admin', label: 'Administrator', level: 3 },
  { value: 'manager', label: 'Manager', level: 2 },
  { value: 'staff', label: 'Staff', level: 1 },
];

export const getRoleLabel = (role: AdminRole): string => {
  return ADMIN_ROLES.find(r => r.value === role)?.label || role;
};

export const getRoleLevel = (role: AdminRole): number => {
  return ADMIN_ROLES.find(r => r.value === role)?.level || 0;
};

// ============================================================================
// Department Constants
// ============================================================================

export const DEPARTMENTS: { value: AdminDepartment; label: string; icon: string }[] = [
  { value: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { value: 'barista', label: 'Barista', icon: '☕' },
  { value: 'service', label: 'Service', icon: '🍽️' },
  { value: 'management', label: 'Management', icon: '👔' },
];

export const getDepartmentLabel = (dept: AdminDepartment): string => {
  return DEPARTMENTS.find(d => d.value === dept)?.label || dept;
};

// ============================================================================
// Status Constants
// ============================================================================

export const STAFF_STATUS: {
  value: AdminStatus;
  label: string;
  description: string;
  color: StatusColorConfig;
}[] = [
  {
    value: 'active',
    label: 'Active',
    description: 'Currently working and available',
    color: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      dot: 'bg-green-500',
    }
  },
  {
    value: 'on_break',
    label: 'On Break',
    description: 'Temporary break (lunch, rest)',
    color: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    }
  },
  {
    value: 'off_duty',
    label: 'Off Duty',
    description: 'Not working (shift ended, day off)',
    color: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-500',
    }
  },
  {
    value: 'on_leave',
    label: 'On Leave',
    description: 'Extended leave (vacation, sick leave)',
    color: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
      dot: 'bg-gray-400',
    }
  },
];

export const getStatusLabel = (status: AdminStatus): string => {
  return STAFF_STATUS.find(s => s.value === status)?.label || 'Unknown';
};

export const getStatusDescription = (status: AdminStatus): string => {
  return STAFF_STATUS.find(s => s.value === status)?.description || '';
};

// ============================================================================
// Types
// ============================================================================

export interface StatusColorConfig {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

// ============================================================================
// Permission Constants
// ============================================================================

export const ROLE_PERMISSIONS: Record<AdminRole, {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageAdmins: boolean;
  canManageManagers: boolean;
}> = {
  admin: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canManageAdmins: true,
    canManageManagers: true,
  },
  manager: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canManageAdmins: false,
    canManageManagers: false,
  },
  staff: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canManageAdmins: false,
    canManageManagers: false,
  },
};

// ============================================================================
// Department-Based Access Control
// ============================================================================

/**
 * Allowed routes for each department.
 * STAFF role users can only access routes assigned to their department.
 * ADMIN and MANAGER roles have full access to all routes.
 */
export const STAFF_ACCESS_ROUTES: Record<AdminDepartment, string[]> = {
  kitchen: ['/admin/kitchen'],
  barista: ['/admin/barista'],
  service: ['/admin/service'],
  management: [], // Management role users have full access via role check
};

/**
 * Check if a staff user can access a specific route.
 * @param department - User's department
 * @param pathname - Route path to check
 * @returns true if user can access this route
 */
export const canStaffAccessRoute = (
  department: AdminDepartment | undefined,
  pathname: string
): boolean => {
  if (!department) return false;
  const allowedRoutes = STAFF_ACCESS_ROUTES[department] || [];
  return allowedRoutes.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );
};

/**
 * Get the default redirect path for a staff user based on department.
 * @param department - User's department
 * @returns Default route for this department
 */
export const getStaffDefaultRoute = (
  department: AdminDepartment | undefined
): string => {
  if (!department) return '/admin/login';
  return STAFF_ACCESS_ROUTES[department]?.[0] || '/admin/login';
};

/**
 * Check if user has full admin access (can access all admin routes).
 * @param role - User's role
 * @returns true if user is admin or manager
 */
export const hasFullAdminAccess = (role: AdminRole | undefined): boolean => {
  return role === 'admin' || role === 'manager';
};

/**
 * Check if user is a restricted staff user (not admin/manager).
 * @param role - User's role
 * @returns true if user is staff role
 */
export const isRestrictedStaff = (role: AdminRole | undefined): boolean => {
  return role === 'staff';
};

// ============================================================================
// Status Cycle (for toggle button)
// ============================================================================

export const STATUS_CYCLE: Record<AdminStatus, AdminStatus> = {
  active: 'on_break',
  on_break: 'off_duty',
  off_duty: 'active',
  on_leave: 'active',
};

// ============================================================================
// Validation Constants
// ============================================================================

export const STAFF_VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 100,
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 255,
  PHONE_MAX_LENGTH: 20,
  AVATAR_URL_MAX_LENGTH: 500,
  HOURLY_RATE_MIN: 0,
  PAGE_SIZE_MIN: 1,
  PAGE_SIZE_MAX: 100,
  DEFAULT_PAGE_SIZE: 20,
} as const;

// ============================================================================
// Pagination Constants
// ============================================================================

export const STAFF_PAGINATION = {
  ITEMS_PER_PAGE: 6,
  MAX_ITEMS_PER_PAGE: 100,
} as const;
