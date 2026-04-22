'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/features/cart';
import { useCategoryStore } from '@/features/categories/store/categoryStore';
import { useFeaturedProducts, usePopularProducts, useCustomerCategories } from '@/lib/api/queries/useCustomerMenu';
import { useSession } from '@/contexts/SessionContext';
import { getSessionBySessionId } from '@/lib/sessionApi';
import { getOrCreateDeviceId, getDeviceName } from '@/lib/utils';
import CustomerLayout from '@/components/customer/layout/CustomerLayout';
import WelcomeBanner from '@/components/customer/home/WelcomeBanner';
import FeaturedPicks from '@/components/customer/home/FeaturedPicks';
import PopularProducts from '@/components/customer/home/PopularProducts';
import ProductDetailModal from '@/components/customer/product/ProductDetailModal';
import CustomProductModal from '@/components/customer/product/ProductDetailModal';
import { LoadingPage, SkeletonGrid } from '@/components/ui/loading-spinner/LoadingSpinner';
import OrderingModeSelection from '@/components/customer/group/OrderingModeSelection';
import type { Product, CartItem } from '@/types';

export default function TablePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableNumber = parseInt(params.tableNumber as string);
  const qrTokenParam = searchParams.get('token'); // Get QR token from URL (20-char secret)
  const { addToCart, setTableContext } = useCart();
  const { categories, activeCategoryId, setActiveCategory, setCategories } = useCategoryStore();
  const { session, participant, joinSession, isLoading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderMode, setOrderMode] = useState<'individual' | 'group' | null>(null);
  const [showOrderingModeModal, setShowOrderingModeModal] = useState(false);

  // Modal states (must be before any conditional returns)
  const [detailModalProduct, setDetailModalProduct] = useState<Product | null>(null);
  const [customModalProduct, setCustomModalProduct] = useState<Product | null>(null);

  // Fetch data from API
  const { data: featuredProducts = [], isLoading: featuredLoading, error: featuredError } = useFeaturedProducts(6);
  const { data: popularProducts = [] } = usePopularProducts(8);
  const { data: categoriesFromApi = [], isLoading: categoriesLoading } = useCustomerCategories();

  // Initialize categories from API
  useEffect(() => {
    if (categoriesFromApi.length > 0) {
      setCategories(categoriesFromApi);
    }
  }, [categoriesFromApi, setCategories]);

  // Check if user already selected an ordering mode
  useEffect(() => {
    if (session && session.session_id) {
      const savedMode = localStorage.getItem(`order-mode-${session.session_id}`);
      if (savedMode) {
        setOrderMode(savedMode as 'individual' | 'group');
      } else {
        // Show modal on first visit
        setShowOrderingModeModal(true);
      }
    }
  }, [session]);

  // Verify session using SessionContext and backend validation
  useEffect(() => {
    const validateSession = async () => {
      // Wait for SessionContext to finish loading
      if (sessionLoading) {
        return;
      }

      // Check if session exists
      if (!session) {
        // No session found - need QR token to create one (from QR scan)
        if (!qrTokenParam) {
          // No QR token in URL - user must have manually changed the URL or accessed directly
          setError('Invalid access. Please scan a QR code or enter an access code.');
          setLoading(false);
          setTimeout(() => {
            router.push('/join');
          }, 2000);
          return;
        }

        // QR token provided - validate and create session
        try {
          // Validate QR token with backend
          const validateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tables/validate-qr-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qr_token: qrTokenParam }),
          });

          if (!validateResponse.ok) {
            setError('Invalid QR code. Please scan the QR code for your table.');
            setLoading(false);
            setTimeout(() => {
              router.push('/join');
            }, 2000);
            return;
          }

          const validateData = await validateResponse.json();

          if (!validateData.valid || !validateData.table) {
            setError(validateData.error || 'Invalid QR code. Please scan the QR code for your table.');
            setLoading(false);
            setTimeout(() => {
              router.push('/join');
            }, 2000);
            return;
          }

          // SECURITY: Verify the table number matches the URL
          // This prevents URL manipulation even with a valid token from another table
          if (validateData.table.table_number !== tableNumber) {
            setError('Invalid QR code for this table. Please scan the QR code for your table.');
            setLoading(false);
            setTimeout(() => {
              router.push('/join');
            }, 2000);
            return;
          }

          // QR token is valid - create session using the access_code
          const deviceId = getOrCreateDeviceId();
          const deviceName = getDeviceName();

          await joinSession(validateData.access_code, deviceId, deviceName, 1);

          // Set table context for cart
          setTableContext(validateData.access_code, tableNumber);

          setLoading(false);
        } catch (err) {
          console.error('Failed to create session:', err);
          setError('Failed to start session. Please enter an access code.');
          setLoading(false);
          setTimeout(() => {
            router.push('/join');
          }, 2000);
        }
        return;
      }

      // Verify session matches this table
      if (session.table_number !== tableNumber) {
        setError(`Invalid session. This session is for Table ${session.table_number}. Please access your correct table.`);
        setLoading(false);
        return;
      }

      // Validate session with backend to ensure it's still active
      try {
        const validatedSession = await getSessionBySessionId(session.session_id);

        // Check if session is still active
        if (validatedSession.status !== 'active' || !validatedSession.is_active) {
          setError('This session has been ended. Please enter a new access code.');
          setLoading(false);
          localStorage.removeItem('tableSession');
          setTimeout(() => {
            router.push('/join');
          }, 2000);
          return;
        }

        // Session is valid and active
        setLoading(false);
      } catch (err) {
        setError('Invalid session. Please enter an access code.');
        setLoading(false);
        localStorage.removeItem('tableSession');
        setTimeout(() => {
          router.push('/join');
        }, 2000);
      }
    };

    validateSession();
  }, [session, sessionLoading, tableNumber, router, joinSession, setTableContext, qrTokenParam]);

  // Event Handlers
  const handleCategorySelect = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
  }, [setActiveCategory]);

  const handleAddToCart = useCallback((product: Product) => {
    setDetailModalProduct(product);
  }, []);

  const handleViewDetails = useCallback((product: Product) => {
    setDetailModalProduct(product);
  }, []);

  const handleCustomize = useCallback((product: Product) => {
    setCustomModalProduct(product);
  }, []);

  const handleAddToCartFromDetail = useCallback(async (item: CartItem) => {
    const product: Product = {
      id: item.productId,
      name: item.name,
      description: item.description || '',
      price: item.price,
      price_formatted: item.price,
      image: item.image,
      category: '',
      rating: 4.5,
      reviewCount: 0,
      tags: [],
    };

    await addToCart(product, item.quantity, item.customizations);
    setDetailModalProduct(null);
  }, [addToCart]);

  const handleAddToCartFromCustom = useCallback(async (item: CartItem) => {
    const product: Product = {
      id: item.productId,
      name: item.name,
      description: item.description || '',
      price: item.price,
      price_formatted: item.price,
      image: item.image,
      category: '',
      rating: 4.5,
      reviewCount: 0,
      tags: [],
    };

    await addToCart(product, item.quantity, item.customizations);
    setCustomModalProduct(null);
  }, [addToCart]);

  // Loading state
  if (loading || categoriesLoading || featuredLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex flex-col">
        {/* Ambient Background Shapes */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#d4a574]/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#d4a574]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative z-10">
          <div className="text-center mb-8">
            <div className="relative">
              {/* Steam animations */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-1">
                <div className="w-1 h-3 bg-[#d4a574]/60 rounded-full animate-pulse origin-bottom" style={{ animation: 'steam-rise 1.5s ease-in-out infinite' }} />
                <div className="w-1 h-3 bg-[#d4a574]/40 rounded-full animate-pulse origin-bottom" style={{ animation: 'steam-rise 1.5s ease-in-out infinite 0.3s' }} />
                <div className="w-1 h-3 bg-[#d4a574]/50 rounded-full animate-pulse origin-bottom" style={{ animation: 'steam-rise 1.5s ease-in-out infinite 0.6s' }} />
              </div>
              {/* Coffee cup */}
              <div className="w-16 h-20 relative animate-bounce" style={{ animation: 'gentle-bounce 2s ease-in-out infinite' }}>
                <svg viewBox="0 0 40 48" fill="none" className="w-full h-full">
                  <path d="M4 8h24v20c0 4.418-3.582 8-8 8h-8c-4.418 0-8-3.582-8-8V8z" className="fill-[#d4a574]/20 stroke-[#d4a574]" strokeWidth="2" />
                  <ellipse cx="16" cy="10" rx="10" ry="3" className="fill-[#d4a574]/60" />
                  <path d="M28 14h4c2.209 0 4 1.791 4 4v6c0 2.209-1.791 4-4 4h-4" className="stroke-[#d4a574]" strokeWidth="2" fill="none" />
                </svg>
              </div>
            </div>
            <p className="mt-6 text-[#8b8680] text-sm tracking-wide">Brewing your menu...</p>
          </div>

          {/* Skeleton Cards */}
          <div className="w-full max-w-6xl px-4">
            <div className="h-8 bg-[#f5f0eb] rounded-lg w-48 mb-6 animate-pulse" />
            <SkeletonGrid count={4} columns={4} />
          </div>

          <style jsx>{`
            @keyframes steam-rise {
              0%, 100% { transform: translateY(0) scaleY(1); opacity: 0.6; }
              50% { transform: translateY(-8px) scaleY(1.2); opacity: 0.3; }
            }
            @keyframes gentle-bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-4px); }
            }
          `}</style>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
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
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 text-[#8b8680] hover:text-[#2d2a26] transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Home</span>
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
          <div className="w-full max-w-md">
            {/* Logo / Brand */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#d4a574]/10 mb-4">
                <svg className="w-6 h-6 text-[#d4a574]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-[#2d2a26] tracking-tight">
                Session Expired
              </h1>
              <p className="text-[#8b8680] text-sm mt-1">
                Let&apos;s get you back to ordering
              </p>
            </div>

            {/* Main Card */}
            <div className="relative bg-white rounded-2xl p-6 md:p-8 border border-[#e8e4df]/60 shadow-sm">
              {/* Offset shadow decoration */}
              <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/10 rounded-2xl -z-10" />

              {/* Icon */}
              <div className="w-16 h-16 bg-[#faf9f7] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#e8e4df]/60">
                <svg className="w-8 h-8 text-[#d4a574]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              {/* Error Message */}
              <div className="text-center mb-8">
                <h2 className="text-lg font-semibold text-[#2d2a26] mb-2">
                  Access Denied
                </h2>
                <p className="text-[#8b8680] text-sm leading-relaxed">
                  {error}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/join')}
                  className="w-full bg-[#2d2a26] hover:bg-[#3d3a36] text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <span>Enter Access Code</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>

                <button
                  onClick={() => router.push('/')}
                  className="w-full bg-transparent hover:bg-[#faf9f7] text-[#8b8680] font-medium py-3 px-6 rounded-xl transition-all border border-[#e8e4df]/60"
                >
                  Return to Home
                </button>
              </div>
            </div>

            {/* Help Section */}
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 text-[#8b8680] text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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

  if (featuredError) {
    return (
      <CustomerLayout categories={[]} activeCategory="all" onCategorySelect={handleCategorySelect}>
        <div className="text-center py-12">
          <p className="text-red-600">Failed to load menu. Please try again.</p>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout
      categories={categories}
      activeCategory={activeCategoryId}
      onCategorySelect={handleCategorySelect}
    >
      {/* Ordering Mode Selection - shown on first visit */}
      <OrderingModeSelection
        show={showOrderingModeModal}
        onClose={() => setShowOrderingModeModal(false)}
        tableNumber={tableNumber}
        sessionId={session?.session_id || ''}
        tableId={session?.table_id || 0}
        participantId={participant?.id || null}
        onModeSelected={(mode) => {
          setOrderMode(mode);
        }}
      />

      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Featured Picks */}
      <FeaturedPicks
        products={featuredProducts}
        onAddToCart={handleAddToCart}
        onViewDetails={handleViewDetails}
        onCustomize={handleCustomize}
      />

      {/* Popular Products */}
      <PopularProducts
        products={popularProducts}
        onAddToCart={handleAddToCart}
        onViewDetails={handleViewDetails}
        onCustomize={handleCustomize}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        show={detailModalProduct !== null}
        product={detailModalProduct}
        onClose={() => setDetailModalProduct(null)}
        onAddToCart={handleAddToCartFromDetail}
      />

      {/* Custom Product Modal */}
      <CustomProductModal
        show={customModalProduct !== null}
        product={customModalProduct}
        onClose={() => setCustomModalProduct(null)}
        onAddToCart={handleAddToCartFromCustom}
      />
    </CustomerLayout>
  );
}
