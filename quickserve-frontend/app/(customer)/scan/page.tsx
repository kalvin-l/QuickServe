'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart } from '@/features/cart';
import { useSession } from '@/contexts/SessionContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner/LoadingSpinner';

/**
 * Scan Page - Handles QR Code Token Validation
 *
 * This page validates JWT tokens from QR code scans and creates a session,
 * then redirects to the appropriate table page. Customers cannot forge or modify
 * tokens since they are cryptographically signed.
 */
export default function ScanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setTableContext } = useCart();
  const { startSession, session } = useSession();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setErrorMessage('No QR code token found. Please scan a valid QR code.');
        return;
      }

      try {
        // Validate the token with the backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tables/validate-qr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok || !data.valid) {
          setStatus('error');
          setErrorMessage(data.detail || 'Invalid QR code. Please try again or ask staff for assistance.');
          return;
        }

        // Token is valid - set up the session
        const { table_number, table_id, access_code } = data;

        // Set table context for cart
        setTableContext(access_code, table_number);

        // Start session via SessionContext
        await startSession(access_code);

        // Show success state briefly before redirect
        setStatus('success');

        // Store session data for compatibility with existing flow
        const sessionData = {
          tableNumber: table_number,
          tableId: table_id,
          sessionId: data.session_id || `session_${table_number}_${Date.now()}`,
          qrCode: access_code,
          timestamp: Date.now(),
        };
        localStorage.setItem('qr_session', JSON.stringify(sessionData));

        // Redirect to the table page
        setTimeout(() => {
          router.push(`/table/${table_number}`);
        }, 1000);

      } catch (error) {
        console.error('QR validation error:', error);
        setStatus('error');
        setErrorMessage('Unable to validate QR code. Please check your connection and try again.');
      }
    };

    validateToken();
  }, [searchParams, router, setTableContext, startSession]);

  return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Background Shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#d4a574]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#d4a574]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#e8e4df]/60 p-8 text-center">
        {/* Offset shadow decoration */}
        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/10 rounded-2xl -z-10" />

        {/* Logo/Icon */}
        <div className="mb-6 flex justify-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
            status === 'loading' ? 'bg-[#faf9f7] border border-[#e8e4df]/60' :
            status === 'success' ? 'bg-green-50 border border-green-100' :
            'bg-red-50 border border-red-100'
          }`}>
            {status === 'loading' && (
              <LoadingSpinner type="branded" size="lg" />
            )}
            {status === 'success' && (
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === 'error' && (
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        </div>

        {/* Status Text */}
        <h1 className="text-2xl font-bold text-[#2d2a26] mb-3">
          {status === 'loading' && 'Validating QR Code...'}
          {status === 'success' && 'QR Code Valid!'}
          {status === 'error' && 'QR Code Invalid'}
        </h1>

        <p className="text-[#8b8680] mb-8">
          {status === 'loading' && 'Please wait while we verify your table and start your session...'}
          {status === 'success' && session ? `Welcome to Table ${session.table_id}! Redirecting...` : 'Redirecting you to your table...'}
          {status === 'error' && errorMessage}
        </p>

        {/* Error Actions */}
        {status === 'error' && (
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-[#2d2a26] hover:bg-[#3d3a36] text-white font-semibold py-3 px-6 rounded-xl transition-all"
            >
              Go to Menu
            </button>
            <button
              onClick={() => router.back()}
              className="w-full bg-[#f5f0eb] hover:bg-[#ebe5de] text-[#5c5752] font-semibold py-3 px-6 rounded-xl transition-all border border-[#e8e4df]/60"
            >
              Go Back
            </button>
          </div>
        )}

        {/* Loading Dots */}
        {status === 'loading' && (
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-[#d4a574] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 bg-[#d4a574] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-[#d4a574] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        )}
      </div>
    </div>
  );
}
