/**
 * Authorization Utilities
 *
 * Helper functions for checking user permissions and access control
 * based on role and department.
 */

import type { AdminUser, AdminRole } from '@/types/admin-auth.types';
import type { AdminDepartment } from '@/types/admin-auth.types';
import {
  hasFullAdminAccess,
  canStaffAccessRoute,
  getStaffDefaultRoute,
  STAFF_ACCESS_ROUTES,
} from '@/constants/staff';

/**
 * Check if user has a restricted staff role (not admin or manager).
 */
export function isRestrictedStaff(role: AdminRole | undefined): boolean {
  return role === 'staff';
}

/**
 * Navigation item configuration for dynamic menu rendering
 */
export interface NavigationItem {
  name: string;
  icon: string;
  href: string;
  badge?: number;
}

/**
 * Get user's departments list (supports both old and new format).
 *
 * @param user - User object from AdminAuthContext
 * @returns Array of departments the user belongs to
 */
export function getUserDepartments(user: AdminUser): AdminDepartment[] {
  // New format: departments array
  if (user.departments && user.departments.length > 0) {
    return user.departments;
  }
  // Old format: single department
  if (user.department) {
    return [user.department];
  }
  return [];
}

/**
 * Check if user can access a specific route.
 *
 * @param user - User object from AdminAuthContext
 * @param pathname - Route path to check
 * @returns true if user can access this route
 *
 * @example
 * canUserAccessRoute(user, '/admin/barista') // true for barista staff
 * canUserAccessRoute(user, '/admin/dashboard') // false for barista staff
 * canUserAccessRoute(user, '/admin/kitchen') // true if user has kitchen department
 */
export function canUserAccessRoute(
  user: AdminUser | null | undefined,
  pathname: string
): boolean {
  if (!user) return false;

  // Admin and Manager have full access
  if (hasFullAdminAccess(user.role)) {
    return true;
  }

  // Staff role: check department-based access (supports multiple departments)
  if (isRestrictedStaff(user.role)) {
    const departments = getUserDepartments(user);
    // Check if ANY of user's departments allows access to this route
    return departments.some(dept => canStaffAccessRoute(dept, pathname));
  }

  return false;
}

/**
 * Get the appropriate redirect path for a user trying to access a restricted route.
 *
 * @param user - User object from AdminAuthContext
 * @param attemptedPathname - The path the user tried to access
 * @returns The path to redirect to
 *
 * @example
 * getRedirectPathForUser(baristaUser, '/admin/dashboard') // '/admin/barista'
 * getRedirectPathForUser(baristaUser, '/admin/barista') // '/admin/barista'
 * getRedirectPathForUser(multiDeptUser, '/admin/dashboard') // '/admin/barista' (first dept)
 */
export function getRedirectPathForUser(
  user: AdminUser | null | undefined,
  attemptedPathname: string
): string {
  if (!user) return '/admin/login';

  // If user is staff and trying to access unauthorized route
  if (isRestrictedStaff(user.role)) {
    const departments = getUserDepartments(user);

    // Check if user has access to attempted route via ANY department
    if (departments.some(dept => canStaffAccessRoute(dept, attemptedPathname))) {
      return attemptedPathname;
    }

    // Otherwise, redirect to first department's default page
    if (departments.length > 0) {
      return getStaffDefaultRoute(departments[0]);
    }
  }

  // Admin/Manager: let them through or go to dashboard
  return attemptedPathname || '/admin/dashboard';
}

/**
 * Get navigation items for a user based on their role and departments.
 *
 * @param user - User object from AdminAuthContext
 * @returns Array of navigation items the user can see
 *
 * @example
 * getNavigationForUser(adminUser) // Returns all navigation items
 * getNavigationForUser(baristaUser) // Returns ['Barista Queue']
 * getNavigationForUser(multiDeptUser) // Returns ['Barista Queue', 'Kitchen KDS']
 */
export function getNavigationForUser(
  user: AdminUser | null | undefined
): NavigationItem[] {
  if (!user) return [];

  // Full access for admin/manager
  if (hasFullAdminAccess(user.role)) {
    return [
      { name: 'Dashboard', icon: 'LayoutDashboard', href: '/admin/dashboard' },
      { name: 'Orders', icon: 'List', href: '/admin/orders', badge: 5 },
      { name: 'Menu', icon: 'ShoppingBag', href: '/admin/menu' },
      { name: 'Inventory', icon: 'Package', href: '/admin/inventory' },
      { name: 'Analytics', icon: 'BarChart3', href: '/admin/analytics' },
      { name: 'Staff', icon: 'Users', href: '/admin/staff' },
      { name: 'Tables & QR', icon: 'QrCode', href: '/admin/tables' },
      { name: 'Barista Queue', icon: 'Coffee', href: '/admin/barista' },
    ];
  }

  // Staff: show navigation for ALL their departments
  if (isRestrictedStaff(user.role)) {
    const departments = getUserDepartments(user);
    const navItems: NavigationItem[] = [];

    // Map departments to their navigation items
    for (const dept of departments) {
      switch (dept) {
        case 'barista':
          navItems.push({ name: 'Barista Queue', icon: 'Coffee', href: '/admin/barista' });
          break;
        case 'kitchen':
          navItems.push({ name: 'Kitchen KDS', icon: 'Coffee', href: '/admin/kitchen' });
          break;
        case 'service':
          navItems.push({ name: 'Service Queue', icon: 'Coffee', href: '/admin/service' });
          break;
        // Management department staff don't get special navigation
        case 'management':
          break;
      }
    }

    return navItems;
  }

  return [];
}

/**
 * Check if user should see the Settings page.
 *
 * @param user - User object from AdminAuthContext
 * @returns true if user can access settings
 *
 * @example
 * canUserAccessSettings(adminUser) // true
 * canUserAccessSettings(baristaUser) // false
 */
export function canUserAccessSettings(
  user: AdminUser | null | undefined
): boolean {
  if (!user) return false;
  return hasFullAdminAccess(user.role);
}

/**
 * Check if user is a staff user (for UI rendering decisions).
 *
 * @param user - User object from AdminAuthContext
 * @returns true if user has staff role
 */
export function isStaffUser(user: AdminUser | null | undefined): boolean {
  return user?.role === 'staff';
}

/**
 * Format user's departments for display (e.g., "BARISTA", "BARISTA • KITCHEN").
 *
 * @param user - User object from AdminAuthContext
 * @returns Formatted department string
 */
export function formatUserDepartments(user: AdminUser | null | undefined): string {
  if (!user) return '';
  const departments = getUserDepartments(user);
  if (departments.length === 0) return '';
  return departments.map(d => d.toUpperCase()).join(' • ');
}
