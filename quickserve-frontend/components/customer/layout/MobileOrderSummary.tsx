'use client'

import { useRouter } from 'next/navigation'
import { useCart } from '@/features/cart/hooks/useCart'
import { useGroupStore } from '@/features/groups/store/groupStore'
import { useSession } from '@/contexts/SessionContext'

/**
 * MobileOrderSummary - Full order summary for bottom sheet
 */
export default function MobileOrderSummary() {
  const router = useRouter()
  const { session, participant } = useSession()
  const {
    items, tax, itemCount, isEmpty, formattedSubtotal, formattedTotal,
    updateQuantity, removeFromCart, getQRSession
  } = useCart()
  const { currentGroup } = useGroupStore()

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
      console.error('[MobileOrderSummary] Error checking group mode:', e)
    }
    return false
  })()

  // Use store data if available, otherwise fall back to localStorage check
  const isGroupMode = currentGroup?.payment_type === 'host_pays_all' || isProbablyInGroupMode
  // CORRECT: Compare participant ID (unique per device) not session ID (shared by all devices at table)
  const isHost = currentGroup?.host_participant_id === participant?.id

  // Determine if editing should be allowed (host or individual mode only)
  const canEdit = !isGroupMode || isHost

  const handleCheckout = () => {
    if (!isEmpty && itemCount > 0 && canEdit) {
      router.push('/checkout')
    }
  }

  if (isEmpty) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-shopping-basket text-2xl text-surface-400"></i>
          </div>
          <h3 className="font-heading text-lg text-surface-800 mb-2">
            {isGroupMode ? 'Group Cart is Empty' : 'Your Cart is Empty'}
          </h3>
          <p className="font-body text-sm text-surface-500">
            Add items from the menu to get started
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fas fa-shopping-cart text-primary-500"></i>
            <h2 className="font-heading text-lg font-semibold text-surface-800">
              {isGroupMode ? 'Group Cart' : 'Your Cart'}
            </h2>
          </div>
          <span className="bg-primary-100 text-primary-600 text-xs font-semibold px-3 py-1 rounded-full">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>
        {isGroupMode && (
          <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
            {isHost ? 'You are the Host (Pays All)' : 'Host Pays All'}
          </div>
        )}
      </div>

      {/* Items List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-surface-200 rounded-xl p-3">
            <div className="flex gap-3">
              {/* Image */}
              <div className="w-16 h-16 bg-surface-100 rounded-lg overflow-hidden flex-shrink-0">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <i className="fas fa-utensils text-surface-300"></i>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-heading text-sm font-semibold text-surface-800 truncate mb-1">
                  {item.name}
                </h4>

                {item.customizations.size && (
                  <p className="text-xs text-surface-500 mt-0.5">
                    Size: {item.customizations.size}
                  </p>
                )}
                {item.customizations.addons && item.customizations.addons.length > 0 && (
                  <div className="text-xs text-surface-500 mt-0.5">
                    <span>Addons: </span>
                    {item.customizations.addons.map((addon, idx) => (
                      <span key={idx}>
                        {addon.name} {addon.quantity > 1 && `(x${addon.quantity})`}
                        {idx < item.customizations.addons!.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                )}

                {/* Price and Actions */}
                <div className="flex items-center justify-between mt-2">
                  <p className="font-bold text-primary-600">
                    ₱{item.totalPrice.toFixed(2)}
                  </p>

                  {/* Quantity Controls - only if canEdit */}
                  {canEdit ? (
                    <div className="flex items-center gap-2 bg-surface-100 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center text-surface-600 hover:bg-surface-200 rounded-lg transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <i className="fas fa-minus text-xs"></i>
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-surface-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        aria-label="Increase quantity"
                      >
                        <i className="fas fa-plus text-xs"></i>
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-surface-600">Qty: {item.quantity}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Remove Button - only if canEdit */}
            {canEdit && (
              <button
                onClick={() => removeFromCart(item.id)}
                className="w-full mt-2 text-xs text-red-500 hover:text-red-600 font-medium flex items-center justify-center gap-1 py-1"
              >
                <i className="fas fa-trash-alt"></i>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer - Totals and Checkout */}
      <div className="border-t border-surface-200 bg-surface-50 px-5 py-4 space-y-3">
        <div className="space-y-2">
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
          <div className="flex justify-between text-lg pt-2 border-t border-surface-200">
            <span className="font-bold text-surface-800">Total</span>
            <span className="font-bold text-primary-600">{formattedTotal}</span>
          </div>
        </div>

        {isGroupMode && !isHost ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
            <p className="text-yellow-800 text-sm font-medium">
              Waiting for host to checkout
            </p>
          </div>
        ) : (
          <button
            onClick={handleCheckout}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold py-3.5 rounded-xl text-sm hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg"
          >
            <i className="fas fa-lock mr-2"></i>
            Proceed to Checkout
          </button>
        )}
      </div>
    </div>
  )
}