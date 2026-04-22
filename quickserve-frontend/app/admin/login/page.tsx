'use client';

/**
 * Admin Login Page
 *
 * Secure authentication for admin users
 * Warm, responsive design matching the QuickServe design system
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Shield, Lock, Mail, AlertCircle, Loader2, Coffee, User } from 'lucide-react';
import { getRedirectPathForUser } from '@/lib/utils/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, user } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const loggedInUser = await login(email, password);
      // After successful login, redirect based on user role
      // Use the returned user data directly to avoid stale state issues
      const redirectPath = getRedirectPathForUser(loggedInUser, '/admin/dashboard');
      router.replace(redirectPath);
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Please try again.');
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: 'email' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (field === 'email') {
      setEmail(e.target.value);
    } else {
      setPassword(e.target.value);
    }
    // Clear error on input change
    if (error) setError('');
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] flex flex-col">
      {/* Ambient Background Shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#d4a574]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#d4a574]/5 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md">

          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#d4a574]/10 mb-4">
              <Shield className="w-6 h-6 text-[#d4a574]" />
            </div>
            <h1 className="text-xl font-semibold text-[#2d2a26] tracking-tight">
              Admin Portal
            </h1>
            <p className="text-[#8b8680] text-sm mt-1">
              Secure login for QuickServe staff
            </p>
          </div>

          {/* Login Card */}
          <div className="relative bg-white rounded-2xl p-6 md:p-8 border border-[#e8e4df]/60 shadow-sm">
            {/* Offset shadow decoration */}
            <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/10 rounded-2xl -z-10" />

            {/* Icon */}
            <div className="w-14 h-14 bg-[#faf9f7] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#e8e4df]/60">
              <User className="w-6 h-6 text-[#d4a574]" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold text-[#2d2a26] tracking-[0.15em] uppercase mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b8680]" />
                  <input
                    type="email"
                    placeholder="admin@quickserve.com"
                    value={email}
                    onChange={handleInputChange('email')}
                    disabled={isLoading}
                    autoComplete="email"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#e8e4df]/60 focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed bg-white text-[#2d2a26] placeholder:text-[#8b8680]/60"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-[#2d2a26] tracking-[0.15em] uppercase mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b8680]" />
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={handleInputChange('password')}
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#e8e4df]/60 focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed bg-white text-[#2d2a26] placeholder:text-[#8b8680]/60"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full bg-[#2d2a26] hover:bg-[#3d3a36] disabled:bg-[#e8e4df] disabled:text-[#8b8680] disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t border-[#e8e4df]/60">
              <div className="flex items-center justify-center gap-2 text-[#8b8680] text-sm">
                <Coffee className="w-4 h-4" />
                <span>QuickServe Admin Portal</span>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 text-center">
            <p className="text-xs text-[#8b8680]">
              Contact your system administrator if you need access
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-4 py-6 text-center">
        <p className="text-xs text-[#8b8680]">
          QuickServe • Order without the wait
        </p>
      </footer>
    </div>
  );
}
