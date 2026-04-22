import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Admin Authentication Middleware
 *
 * Simple middleware that only:
 * 1. Checks if user is authenticated (has valid token)
 * 2. Redirects unauthenticated users to login
 * 3. Lets authenticated users through (client-side handles role-based redirects)
 */

/**
 * Parse JWT token and extract payload without external dependencies.
 * Returns null if token is invalid.
 */
function parseJwt(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if the token has expired.
 */
function isTokenExpired(exp: number | undefined): boolean {
  if (!exp) return false;
  return Date.now() >= exp * 1000; // Convert to milliseconds
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public access to login page
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Check if path starts with /admin (but not login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // Check for auth token
    const token = request.cookies.get('admin_auth_token');

    if (!token || !token.value) {
      // No token, redirect to login
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      return NextResponse.redirect(loginUrl);
    }

    // Check if token is valid
    const decoded = parseJwt(token.value);
    if (!decoded || isTokenExpired(decoded.exp)) {
      // Invalid or expired token, redirect to login
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      return NextResponse.redirect(loginUrl);
    }

    // Token is valid, let them through
    // Client-side will handle role-based redirects
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
