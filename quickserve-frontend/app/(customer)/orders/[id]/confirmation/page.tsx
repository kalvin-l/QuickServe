'use client'

/**
 * Order Confirmation Page
 *
 * Warm, human-centered design with offset shadows
 * Celebrates successful order placement
 */

import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useOrder, useReceipt } from '@/lib/api/queries/useOrders'
import { useCart } from '@/features/cart'
import { saveOrderToHistory, setCurrentOrderSession } from '@/features/customer-orders'
import { useCustomerSession } from '@/features/customer-session'
import {
  CheckCircle2, Clock, ChefHat, Bell, Check, XCircle,
  Receipt, Wallet, MapPin, Calendar, ArrowRight,
  Utensils, List, Sparkles, Coffee
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner/LoadingSpinner'

// Status configuration with Lucide icons
const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: '#d4a574', icon: <Clock className="w-4 h-4" />, label: 'Pending' },
  confirmed: { color: '#22c55e', icon: <Check className="w-4 h-4" />, label: 'Confirmed' },
  preparing: { color: '#8b5cf6', icon: <ChefHat className="w-4 h-4" />, label: 'Preparing' },
  ready: { color: '#22c55e', icon: <Bell className="w-4 h-4" />, label: 'Ready' },
  served: { color: '#8b8680', icon: <Check className="w-4 h-4" />, label: 'Served' },
  cancelled: { color: '#ef4444', icon: <XCircle className="w-4 h-4" />, label: 'Cancelled' },
}

const PAYMENT_STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  pending: { color: '#d4a574', bg: '#faf9f7', icon: <Clock className="w-4 h-4" />, label: 'Pending' },
  processing: { color: '#3b82f6', bg: '#eff6ff', icon: <Clock className="w-4 h-4" />, label: 'Processing' },
  completed: { color: '#22c55e', bg: '#f0fdf4', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Paid' },
  failed: { color: '#ef4444', bg: '#fef2f2', icon: <XCircle className="w-4 h-4" />, label: 'Failed' },
  refunded: { color: '#8b8680', bg: '#faf9f7', icon: <Clock className="w-4 h-4" />, label: 'Refunded' },
}

export default function OrderConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id ? parseInt(params.id as string) : undefined
  const { clearCart } = useCart()
  const { sessionDbId } = useCustomerSession()

  const { data: order, isLoading, error } = useOrder(orderId)
  const { data: receipt } = useReceipt(order?.payment?.id)

  const cartClearedRef = useRef(false)
  const orderSavedRef = useRef(false)

  // Set the current session for order filtering
  useEffect(() => {
    setCurrentOrderSession(sessionDbId)
  }, [sessionDbId])

  // Save order to history (only if it belongs to this session)
  useEffect(() => {
    if (order && !orderSavedRef.current) {
      // The saveOrderToHistory function now checks the session internally
      saveOrderToHistory(order)
      orderSavedRef.current = true
    }
  }, [order])

  // Clear cart once
  useEffect(() => {
    if (!cartClearedRef.current) {
      clearCart()
      cartClearedRef.current = true
    }
  }, [clearCart])

  const handleNavigation = () => {
    // Use customer_session to get current session
    // This ensures we use the correct table, not from old orders
    const customerSessionStr = typeof window !== 'undefined' ? localStorage.getItem('customer_session') : null
    if (customerSessionStr) {
      try {
        const session = JSON.parse(customerSessionStr)
        if (session.tableNumber) {
          console.log('[Confirmation] Redirecting to current table:', session.tableNumber)
          router.push(`/table/${session.tableNumber}`)
          return
        }
        if (session.qrCode) {
          router.push(`/menu?table=${session.qrCode}`)
          return
        }
      } catch {
        // Invalid session
        console.log('[Confirmation] Invalid customer_session, redirecting to join')
        router.push('/join')
        return
      }
    }

    // Fallback to join page
    console.log('[Confirmation] No session found, redirecting to join')
    router.push('/join')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex flex-col items-center justify-center px-4 relative overflow-hidden">
        {/* Ambient Background Shapes */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#d4a574]/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#d4a574]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 text-center">
          <LoadingSpinner type="branded" size="xl" />
          <p className="mt-4 text-[#8b8680] text-sm tracking-wide">Loading order...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-[#d4a574]" />
          </div>
          <h2 className="text-xl font-semibold text-[#2d2a26] mb-2">Order Not Found</h2>
          <p className="text-sm text-[#8b8680] mb-6">We couldn't find this order.</p>
          <button
            onClick={handleNavigation}
            className="bg-[#2d2a26] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#3d3a36] transition-colors"
          >
            Back to Menu
          </button>
        </div>
      </div>
    )
  }

  const orderStatus = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const paymentStatus = order.payment
    ? PAYMENT_STATUS_CONFIG[order.payment.status] || PAYMENT_STATUS_CONFIG.pending
    : null

  const isPaid = order.payment?.status === 'completed'

  return (
    <div className="min-h-screen bg-[#faf9f7] pb-8">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#d4a574]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-6">
        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-[#d4a574]/20 rounded-full scale-125" />
            <div className="relative w-20 h-20 bg-[#d4a574] rounded-full flex items-center justify-center">
              {isPaid ? (
                <CheckCircle2 className="w-10 h-10 text-white" />
              ) : (
                <Receipt className="w-10 h-10 text-white" />
              )}
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#2d2a26] tracking-tight mb-2">
            {isPaid ? 'Order Confirmed!' : 'Order Created'}
          </h1>
          <p className="text-[#8b8680]">
            Thank you{order.customer_name ? `, ${order.customer_name}` : ''}!
          </p>
        </div>

        {/* Order Number Card */}
        <div className="relative mb-4">
          <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/10 rounded-2xl" />
          <div className="relative bg-white rounded-2xl p-5 border border-[#e8e4df]/60 text-center">
            <p className="text-[10px] font-bold text-[#2d2a26] tracking-[0.15em] uppercase mb-2">
              Order Number
            </p>
            <p className="text-3xl font-bold text-[#d4a574] font-mono tracking-wider">
              {order.order_number}
            </p>

            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              {/* Order Status */}
              <span 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${orderStatus.color}15`,
                  color: orderStatus.color 
                }}
              >
                {orderStatus.icon}
                {orderStatus.label}
              </span>

              {/* Payment Status */}
              {paymentStatus && (
                <span 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: paymentStatus.bg,
                    color: paymentStatus.color 
                  }}
                >
                  {paymentStatus.icon}
                  {paymentStatus.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="relative mb-4">
          <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl" />
          <div className="relative bg-white rounded-2xl p-5 border border-[#e8e4df]/60">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-[#d4a574]" />
              </div>
              <h2 className="text-base font-semibold text-[#2d2a26]">Order Details</h2>
            </div>

            {/* Items */}
            <div className="space-y-3 mb-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center text-xs font-bold text-[#d4a574]">
                        {item.quantity}
                      </span>
                      <p className="font-medium text-[#2d2a26] text-sm truncate">{item.item_name}</p>
                    </div>
                    {(item.size_label || item.temperature || (item.addons && item.addons.length > 0)) && (
                      <p className="text-xs text-[#8b8680] mt-1 ml-8">
                        {[
                          item.size_label,
                          item.temperature,
                          ...(item.addons?.map(a => a.name) || [])
                        ].filter(Boolean).join(' • ')}
                      </p>
                    )}
                    {item.special_instructions && (
                      <p className="text-xs text-[#5c5752] italic mt-1 ml-8 bg-[#faf9f7] px-2 py-1 rounded">
                        &ldquo;{item.special_instructions}&rdquo;
                      </p>
                    )}
                  </div>
                  <p className="font-semibold text-[#2d2a26] text-sm shrink-0">
                    ₱{item.item_total_in_pesos.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-[#e8e4df]/60 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#8b8680]">Subtotal</span>
                <span className="font-medium text-[#5c5752]">₱{order.subtotal_in_pesos.toFixed(2)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#8b8680]">Tax</span>
                  <span className="font-medium text-[#5c5752]">₱{(order.tax / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#e8e4df]/60">
                <span className="font-semibold text-[#2d2a26]">Total</span>
                <span className="text-xl font-bold text-[#d4a574]">₱{order.total_in_pesos.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        {order.payment && (
          <div className="relative mb-4">
            <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl" />
            <div className="relative bg-white rounded-2xl p-5 border border-[#e8e4df]/60">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-[#d4a574]" />
                </div>
                <h2 className="text-base font-semibold text-[#2d2a26]">Payment</h2>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8b8680]">Method</span>
                  <span className="font-medium text-[#2d2a26] capitalize">
                    {order.payment.method.replace('_', ' ')}
                  </span>
                </div>
                {order.payment.payment_reference && (
                  <div className="flex justify-between">
                    <span className="text-[#8b8680]">Reference</span>
                    <span className="font-mono text-[#5c5752]">{order.payment.payment_reference}</span>
                  </div>
                )}
              </div>

              {order.payment.status === 'failed' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-sm text-red-700 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Payment failed. Please contact staff.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* What's Next */}
        <div className="relative mb-6">
          <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl" />
          <div className="relative bg-[#faf9f7] border border-[#e8e4df]/60 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#e8e4df]/60 flex items-center justify-center">
                <Coffee className="w-4 h-4 text-[#d4a574]" />
              </div>
              <h3 className="font-semibold text-[#2d2a26]">What's Next?</h3>
            </div>
            <ul className="text-sm text-[#5c5752] space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574] mt-2 shrink-0" />
                <span>Your order will be prepared shortly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574] mt-2 shrink-0" />
                <span>We'll notify you when it's ready</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574] mt-2 shrink-0" />
                <span>Please stay at your table</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleNavigation}
            className="w-full bg-[#2d2a26] hover:bg-[#3d3a36] text-white font-semibold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Utensils className="w-5 h-5" />
            Order More
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => router.push('/orders')}
            className="w-full bg-white hover:bg-[#faf9f7] text-[#2d2a26] font-semibold py-3.5 px-6 rounded-xl border border-[#e8e4df]/60 transition-all flex items-center justify-center gap-2"
          >
            <List className="w-5 h-5" />
            View All Orders
          </button>
        </div>
      </div>
    </div>
  )
}
