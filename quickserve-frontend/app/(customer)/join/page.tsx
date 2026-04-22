'use client';

/**
 * Join Table Page - Manual Access Code Entry
 *
 * Warm, human-centered design with offset shadows
 * and caramel accents. Responsive layout for desktop and mobile.
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/features/cart';
import { useSession } from '@/contexts/SessionContext';
import { getOrCreateDeviceId, getDeviceName } from '@/lib/utils';
import Link from 'next/link';
import { 
  ArrowLeft, KeyRound, ArrowRight, AlertCircle, 
  Loader2, QrCode, HelpCircle, Coffee
} from 'lucide-react';

export default function JoinTablePage() {
  const router = useRouter();
  const { setTableContext } = useCart();
  const { joinSession } = useSession();

  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!accessCode || accessCode.length !== 6) {
      setError('Please enter a valid 6-character access code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tables/validate-access-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: accessCode.toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setError('Invalid access code. Please check and try again.');
        setLoading(false);
        return;
      }

      const tableNumber = data.table.table_number;
      const accessCodeUpper = accessCode.toUpperCase();

      setTableContext(accessCodeUpper, tableNumber);
      const deviceId = getOrCreateDeviceId();
      const deviceName = getDeviceName();
      await joinSession(accessCodeUpper, deviceId, deviceName, 1);

      const savedSession = localStorage.getItem('tableSession');
      if (!savedSession) {
        setError('Session creation failed. Please try again.');
        setLoading(false);
        return;
      }

      router.push(`/table/${tableNumber}`);
    } catch (err: any) {
      console.error('[JoinPage] Error joining session:', err);
      setError(err?.message || 'Unable to join table. Please check your connection.');
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setAccessCode(value);
    setError('');
  };

  // Code input boxes
  const codeArray = accessCode.split('').concat(Array(6 - accessCode.length).fill(''));

  return (
    <div className="min-h-screen bg-[#faf9f7] flex flex-col">
      {/* Ambient Background Shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#d4a574]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#d4a574]/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-4 py-4">
        <div className="max-w-md mx-auto lg:max-w-6xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#8b8680] hover:text-[#2d2a26] transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md">
          
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#d4a574]/10 mb-4">
              <Coffee className="w-6 h-6 text-[#d4a574]" />
            </div>
            <h1 className="text-2xl font-semibold text-[#2d2a26] tracking-tight">
              Join Your Table
            </h1>
            <p className="text-[#8b8680] text-sm mt-1">
              Enter the code to start ordering
            </p>
          </div>

          {/* Main Card */}
          <div className="relative bg-white rounded-2xl p-6 md:p-8 border border-[#e8e4df]/60 shadow-sm">
            {/* Offset shadow decoration */}
            <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/10 rounded-2xl -z-10" />

            {/* Icon */}
            <div className="w-16 h-16 bg-[#faf9f7] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#e8e4df]/60">
              <KeyRound className="w-8 h-8 text-[#d4a574]" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Access Code Input - Visual Boxes */}
              <div className="relative">
                <label className="block text-xs font-bold text-[#2d2a26] tracking-[0.15em] uppercase mb-3 text-center">
                  Access Code
                </label>
                
                {/* Visual Code Boxes with Click Handler */}
                <div 
                  className="flex justify-center gap-2 mb-3 cursor-text"
                  onClick={() => document.getElementById('accessCode')?.focus()}
                >
                  {Array(6).fill(0).map((_, i) => (
                    <div
                      key={i}
                      className={`
                        w-10 h-12 md:w-12 md:h-14 rounded-xl border-2 flex items-center justify-center
                        text-xl md:text-2xl font-mono font-bold transition-all select-none
                        ${i < accessCode.length 
                          ? 'border-[#d4a574] bg-[#faf9f7] text-[#d4a574]' 
                          : 'border-[#e8e4df]/60 bg-white text-[#8b8680]'
                        }
                        ${i === accessCode.length ? 'ring-2 ring-[#d4a574]/30 border-[#d4a574]' : ''}
                      `}
                    >
                      {codeArray[i] || ''}
                    </div>
                  ))}
                </div>

                {/* Hidden Input for actual typing */}
                <input
                  id="accessCode"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  value={accessCode}
                  onChange={handleInputChange}
                  maxLength={6}
                  className="absolute opacity-0 top-0 left-0 w-full h-20 cursor-text"
                  autoFocus
                  disabled={loading}
                />

                <p className="text-xs text-[#8b8680] text-center">
                  Type the 6-character code from your table card
                </p>
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
                disabled={loading || accessCode.length !== 6}
                className="w-full bg-[#2d2a26] hover:bg-[#3d3a36] disabled:bg-[#e8e4df] disabled:text-[#8b8680] disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    Join Table
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e8e4df]/60" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-xs font-medium text-[#8b8680] uppercase tracking-wider">
                  Or
                </span>
              </div>
            </div>

            {/* QR Code Option */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#faf9f7] mb-3">
                <QrCode className="w-5 h-5 text-[#8b8680]" />
              </div>
              <p className="text-[#2d2a26] font-medium text-sm mb-1">Scan QR Code</p>
              <p className="text-xs text-[#8b8680]">
                Point your camera at the QR code on your table
              </p>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 text-[#8b8680] text-sm">
              <HelpCircle className="w-4 h-4" />
              <span>Need help? Ask our staff for assistance</span>
            </div>
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
