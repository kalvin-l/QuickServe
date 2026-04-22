/**
 * useRouteGuard Hook
 *
 * Client-side route protection for admin pages.
 * Redirects unauthorized users to appropriate pages based on their role and department.
 *
 * This hook works in conjunction with the server-side middleware to provide
 * defense-in-depth for route protection.
 */

'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { canUserAccessRoute, getRedirectPathForUser } from '@/lib/utils/auth';

export interface RouteGuardState {
  /** Whether the user can access the current route */
  canAccess: boolean;
  /** Whether the access check is still loading */
  isLoading: boolean;
  /** The user object (for convenience) */
  user: ReturnType<typeof useAdminAuth>['user'];
}

/**
 * Hook to protect routes based on user role and department.
 * Automatically redirects unauthorized users to their appropriate page.
 *
 * @returns RouteGuardState with access information
 *
 * @example
 * function MyComponent() {
 *   const { canAccess, isLoading } = useRouteGuard();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!canAccess) return null; // Redirect happens automatically
 *
 *   return <ProtectedContent />;
 * }
 */
export function useRouteGuard(): RouteGuardState {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAdminAuth();

  // Track redirects to prevent loops
  const hasRedirectedRef = useRef(false);
  const lastRedirectPathRef = useRef<string | null>(null);

  // Memoize access check to avoid unnecessary re-renders
  const canAccess = useMemo(() => {
    if (!user) return false;
    return canUserAccessRoute(user, pathname);
  }, [user, pathname]);

  useEffect(() => {
    // Don't redirect while loading or on login page
    if (isLoading || pathname === '/admin/login') {
      return;
    }

    // Reset redirect flag when pathname changes
    if (lastRedirectPathRef.current !== pathname) {
      hasRedirectedRef.current = false;
      lastRedirectPathRef.current = pathname;
    }

    // Prevent redirect loops
    if (hasRedirectedRef.current) {
      return;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
      hasRedirectedRef.current = true;
      router.replace('/admin/login');
      return;
    }

    // Check if user can access current route
    if (!canUserAccessRoute(user, pathname)) {
      hasRedirectedRef.current = true;
      const redirectPath = getRedirectPathForUser(user, pathname);
      router.replace(redirectPath);
    }
  }, [user, isAuthenticated, isLoading, pathname, router]);

  // Reset redirect state when auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      hasRedirectedRef.current = false;
      lastRedirectPathRef.current = null;
    }
  }, [isAuthenticated]);

  return {
    canAccess,
    isLoading,
    user,
  };
}

/**
 * Higher-order component wrapper for protecting admin pages.
 * Automatically handles loading states and redirects.
 *
 * @param Component - The component to wrap with route protection
 * @returns A new component with route protection
 *
 * @example
 * export default withRouteGuard(MyProtectedPage);
 */
export function withRouteGuard<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function GuardedComponent(props: P) {
    const { canAccess, isLoading } = useRouteGuard();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4a574] mx-auto mb-4" />
            <p className="text-sm text-[#8b8680]">Loading...</p>
          </div>
        </div>
      );
    }

    if (!canAccess) {
      return null; // Redirect happens in useRouteGuard
    }

    return <Component {...props} />;
  };
}
