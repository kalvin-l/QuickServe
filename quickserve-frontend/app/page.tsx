'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QrCode, Keyboard, ArrowRight, Coffee } from 'lucide-react';
import { getSessionBySessionId } from '@/lib/sessionApi';
import { LoadingPage } from '@/components/ui/loading-spinner/LoadingSpinner';

/**
 * Welcome/Landing Page - Human-centered design with editorial typography
 *
 * Validates sessions with backend before redirecting to prevent stale
 * session data from redirecting users to wrong tables.
 */
export default function WelcomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const validateAndRedirect = async () => {
      // Priority 1: Check tableSession (SessionContext - most current)
      let sessionStr = localStorage.getItem('tableSession');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          if (session.status === 'active' && session.table_number && session.session_id) {
            // Validate session with backend before redirecting
            try {
              const validatedSession = await getSessionBySessionId(session.session_id);
              if (validatedSession.status === 'active' && validatedSession.is_active) {
                router.push(`/table/${session.table_number}`);
                return;
              }
            } catch {
              // Session invalid, clear it and continue to next priority
            }
          }
          // Session not active, clear it
          localStorage.removeItem('tableSession');
        } catch (e) {
          localStorage.removeItem('tableSession');
        }
      }

      // Priority 2: Check customer_session (useCustomerSession)
      sessionStr = localStorage.getItem('customer_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          if (session.tableNumber && session.sessionId) {
            // Validate session with backend before redirecting
            try {
              const validatedSession = await getSessionBySessionId(session.sessionId);
              if (validatedSession.status === 'active' && validatedSession.is_active) {
                router.push(`/table/${session.tableNumber}`);
                return;
              }
            } catch {
              // Session invalid, clear it and continue to next priority
            }
          }
          // Session not active, clear it
          localStorage.removeItem('customer_session');
        } catch (e) {
          localStorage.removeItem('customer_session');
        }
      }

      // Priority 3: Check qr_session (legacy)
      sessionStr = localStorage.getItem('qr_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          if (session.tableNumber && session.sessionId) {
            // Validate session with backend before redirecting
            try {
              const validatedSession = await getSessionBySessionId(session.sessionId);
              if (validatedSession.status === 'active' && validatedSession.is_active) {
                router.push(`/table/${session.tableNumber}`);
                return;
              }
            } catch {
              // Session invalid, clear it
            }
          }
          // Session not active, clear it
          localStorage.removeItem('qr_session');
        } catch (e) {
          localStorage.removeItem('qr_session');
        }
      }

      setIsLoading(false);
    };

    validateAndRedirect();
  }, [router]);

  // Subtle parallax effect on mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (isLoading) {
    return <LoadingPage text="Preparing your table..." />;
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#2d2a26] overflow-hidden">
      {/* Ambient background shapes */}
      <div className="fixed inset-0 pointer-events-none">
        <div 
          className="absolute top-20 right-10 w-96 h-96 bg-[#f5e6d3] rounded-full blur-3xl opacity-40"
          style={{ transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)` }}
        />
        <div 
          className="absolute bottom-20 left-10 w-80 h-80 bg-[#e8ddd4] rounded-full blur-3xl opacity-30"
          style={{ transform: `translate(${-mousePosition.x * 0.3}px, ${-mousePosition.y * 0.3}px)` }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 lg:px-12">
        
        {/* Navigation */}
        <nav className="py-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2d2a26] rounded-xl flex items-center justify-center">
              <Coffee className="w-5 h-5 text-[#faf9f7]" />
            </div>
            <span className="text-sm font-medium tracking-tight">QuickServe</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-[#8b8680] font-medium">Open now</span>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="py-12 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            {/* Left: Typography */}
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-xs font-medium text-[#8b8680] tracking-[0.15em] uppercase">
                  Tableside Ordering
                </p>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[0.95]">
                  Order without the wait.
                </h1>
                <p className="text-lg text-[#5c5752] leading-relaxed max-w-md font-light">
                  Scan the QR code at your table, browse our menu, and your order comes straight to you. 
                  No apps, no queues.
                </p>
              </div>

              {/* Quick stats */}
              <div className="flex gap-8 pt-4">
                <div>
                  <p className="text-3xl font-semibold text-[#d4a574]">2min</p>
                  <p className="text-xs text-[#8b8680] mt-1">Average order time</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-[#d4a574]">50+</p>
                  <p className="text-xs text-[#8b8680] mt-1">Menu items</p>
                </div>
              </div>
            </div>

            {/* Right: Cards */}
            <div className="space-y-4">
              
              {/* Scan QR Card */}
              <div className="group relative">
                <div className="absolute inset-0 bg-[#d4a574]/20 rounded-2xl translate-x-0.5 translate-y-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                <div className="relative bg-white rounded-2xl p-6 border border-[#e8e4df]/60 transition-all duration-300 group-hover:border-[#d4a574]/30 group-hover:shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#faf9f7] rounded-xl flex items-center justify-center text-[#d4a574]">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold mb-1">Scan QR Code</h2>
                      <p className="text-sm text-[#8b8680] leading-relaxed">
                        Point your camera at the code on your table to start ordering instantly.
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#d4a574] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>

              {/* Enter Code Card */}
              <Link href="/join" className="group block relative">
                <div className="absolute inset-0 bg-[#2d2a26]/20 rounded-2xl translate-x-0.5 translate-y-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                <div className="relative bg-[#faf9f7] rounded-2xl p-6 border border-[#2d2a26]/60 transition-all duration-300 group-hover:border-[#2d2a26] group-hover:shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#2d2a26] rounded-xl flex items-center justify-center text-white">
                      <Keyboard className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold mb-1">Enter Code</h2>
                      <p className="text-sm text-[#8b8680] leading-relaxed">
                        Type the 6-character code from your table card instead.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-[#e8e4df]">
                        <span className="text-xs font-mono text-[#5c5752] tracking-widest">ABC123</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#2d2a26] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>

            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-[#e8e4df]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-[#8b8680]">
              Need help? Ask our staff for assistance
            </p>
            <div className="flex items-center gap-4 text-xs text-[#8b8680]">
              <span>7AM — 10PM</span>
              <span className="w-1 h-1 bg-[#d4a574] rounded-full" />
              <span>Downtown</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
