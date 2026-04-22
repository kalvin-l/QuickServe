'use client'

import { useRouter } from 'next/navigation'
import { useCart } from '@/features/cart/hooks/useCart'
import { useGroupStore } from '@/features/groups/store/groupStore'
import { useSession } from '@/contexts/SessionContext'

/**
 * OrderSummary - Displays cart summary in sidebar
 */
export default function OrderSummary() {
  const router = useRouter()
  const { items, tax, itemCount, isEmpty, isLoading, formattedSubtotal, formattedTotal, getQRSession } = useCart()
  const { currentGroup } = useGroupStore()
  const { session, participant } = useSession()

  // SAFER: Check if user is in group mode by looking at localStorage directly
  const isProbablyInGroupMode = (() => {
    if (typeof window === 'undefined') return false
    try {
      const tableSessionStr = localStorage.getItem('tableSession')
      const qrSessionStr = localStorage.getItem('qr_session')

      let sessionId = session?.session_id
      if (!sessionId) {
        if (tableSessionStr) {
          const tableSession = JSON.parse(tableSessionStr)
          sessionId = tableSession.session_id
        } else if (qrSessionStr) {
          const qrSession = JSON.parse(qrSessionStr)
          sessionId = qrSession.sessionId
        }
      }

      if (sessionId) {
        const orderMode = localStorage.getItem(`order-mode-${sessionId}`)
        return orderMode === 'group'
      }
    } catch (e) {
      console.error('[OrderSummary] Error checking group mode:', e)
    }
    return false
  })()

  // Use store data if available, otherwise fall back to localStorage check
  const isGroupMode = currentGroup?.payment_type === 'host_pays_all' || isProbablyInGroupMode
  // CORRECT: Compare participant ID (unique per device) not session ID (shared by all devices at table)
  const isHost = currentGroup?.host_participant_id === participant?.id
  const canEdit = !isGroupMode || isHost

  const handleCheckout = () => {
    if (!isEmpty && itemCount > 0 && canEdit) {
      router.push('/checkout')
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 border-t border-surface-200">
        <div className="bg-surface-100 rounded-xl p-8 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-surface-500 text-xs font-medium">Syncing cart...</p>
        </div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="p-4 border-t border-surface-200">
        <div className="bg-surface-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <i className="fas fa-shopping-basket text-surface-400"></i>
            <span className="font-heading text-sm text-surface-600">
              {isGroupMode ? 'Group Cart' : 'Your Cart'}
            </span>
          </div>
          <p className="font-body text-xs text-surface-500 text-center py-2">
            No items yet
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border-t border-surface-200">
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-receipt text-white"></i>
              <span className="font-heading text-sm text-white font-semibold">
                {isGroupMode ? 'Group Order' : 'Order Summary'}
              </span>
            </div>
            <span className="bg-white/20 text-white text-xs font-semibold px-2 py-1 rounded-full">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          {isGroupMode && (
            <div className="mt-2 text-[10px] text-white/90 bg-white/10 px-2 py-1 rounded inline-block">
              {isHost ? 'You are the Host (Pays All)' : 'Host Pays All'}
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="max-h-48 overflow-y-auto p-3 space-y-2">
          {items.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="font-medium text-surface-800 truncate pr-1">{item.name}</p>
                </div>
                <p className="text-xs text-surface-500">Qty: {item.quantity}</p>
              </div>
              <p className="font-semibold text-primary-600 text-sm whitespace-nowrap">
                ₱{item.totalPrice.toFixed(2)}
              </p>
            </div>
          ))}
          {items.length > 5 && (
            <p className="text-xs text-surface-500 text-center">
              +{items.length - 5} more items
            </p>
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-surface-200 bg-surface-50 px-4 py-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-surface-600">Subtotal</span>
            <span className="font-semibold text-surface-800">{formattedSubtotal}</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-surface-600">Tax</span>
              <span className="font-semibold text-surface-800">₱{tax.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base pt-2 border-t border-surface-200">
            <span className="font-semibold text-surface-800">Total</span>
            <span className="font-bold text-primary-600">{formattedTotal}</span>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="p-3 pt-0">
          {isGroupMode && !isHost ? (
            <div className="w-full bg-surface-100 text-surface-500 text-xs font-medium py-2.5 rounded-lg text-center border border-surface-200">
              Waiting for host to checkout
            </div>
          ) : (
            <button
              onClick={handleCheckout}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:from-primary-600 hover:to-primary-700 transition-all shadow-sm"
            >
              Proceed to Checkout
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
