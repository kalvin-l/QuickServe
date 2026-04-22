/**
 * Admin Authentication Context Provider
 * Manages admin authentication state globally across the app
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminUser, AdminAuthContextType, AdminAuthResponse } from '@/types/admin-auth.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ADMIN_TOKEN_KEY = 'admin_auth_token';
const ADMIN_USER_KEY = 'admin_user_data';

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

interface AdminAuthProviderProps {
  children: React.ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const router = useRouter();

  // Initialize user synchronously from localStorage
  const getInitialUser = (): AdminUser | null => {
    if (typeof window === 'undefined') return null;
    try {
      const savedUser = localStorage.getItem(ADMIN_USER_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error('[AdminAuthContext] Failed to parse user:', e);
      return null;
    }
  };

  // Initialize token synchronously from localStorage
  const getInitialToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY);
    } catch (e) {
      console.error('[AdminAuthContext] Failed to get token:', e);
      return null;
    }
  };

  const [user, setUser] = useState<AdminUser | null>(getInitialUser);
  const [token, setToken] = useState<string | null>(getInitialToken);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(ADMIN_USER_KEY);
    }
  }, [user]);

  // Save token to localStorage whenever it changes
  useEffect(() => {
    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  }, [token]);

  // Computed property for authentication state
  const isAuthenticated = !!user && !!token;

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<AdminUser> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data: AdminAuthResponse = await response.json();

      // Update state
      setUser(data.user);
      setToken(data.access_token);

      // Store in cookies for middleware access
      if (typeof document !== 'undefined') {
        document.cookie = `admin_auth_token=${data.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
      }

      return data.user;
    } catch (err: any) {
      console.error('[AdminAuthContext] Login failed:', err);
      const errorMessage = err?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setError(null);

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
    }

    // Clear cookie
    if (typeof document !== 'undefined') {
      document.cookie = 'admin_auth_token=; path=/; max-age=0';
    }

    // Redirect to login page
    router.push('/admin/login');
  }, [router]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AdminAuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
