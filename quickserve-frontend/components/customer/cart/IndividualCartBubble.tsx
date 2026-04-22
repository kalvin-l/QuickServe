'use client'

import { useEffect, useState } from 'react'
import { useCartItemCount } from '@/features/cart/hooks/useCart'
import { useSession } from '@/contexts/SessionContext'
import CartModal from './CartModal'

/**
 * IndividualCartBubble - Floating cart bubble for individual customers
 *
 * Only shown when:
 * - User is in individual ordering mode (not group mode)
 * - There are items in the cart
 */
export default function IndividualCartBubble() {
  const { session } = useSession()
  const cartItemCount = useCartItemCount()
  const [bubbleAnimation, setBubbleAnimation] = useState(false)
  const [isIndividualMode, setIsIndividualMode] = useState(false)
  const [showCartModal, setShowCartModal] = useState(false)

  // Check if user is in individual ordering mode
  useEffect(() => {
    if (!session?.session_id) return

    const checkOrderMode = () => {
      const orderMode = localStorage.getItem(`order-mode-${session.session_id}`)
      setIsIndividualMode(orderMode === 'individual')
    }

    checkOrderMode()

    // Poll for order mode changes (since localStorage events don't work in same tab)
    const interval = setInterval(checkOrderMode, 1000)

    return () => clearInterval(interval)
  }, [session?.session_id])

  // Trigger bubble animation when cart is updated
  useEffect(() => {
    const handleCartUpdate = () => {
      setBubbleAnimation(true)
      // Reset animation after it completes
      setTimeout(() => setBubbleAnimation(false), 600)
    }

    window.addEventListener('cart-update', handleCartUpdate)
    return () => window.removeEventListener('cart-update', handleCartUpdate)
  }, [])

  // Don't show if not in individual mode
  if (!isIndividualMode) {
    return null
  }

  const handleClick = () => {
    setShowCartModal(true)
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`lg:hidden fixed bottom-24 left-4 z-50 w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
          bubbleAnimation ? 'animate-bubble-pop' : ''
        }`}
        aria-label="View cart"
      >
        <i className="fas fa-shopping-cart text-white text-lg" />

        {/* Cart Item Count Badge */}
        {cartItemCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {cartItemCount > 9 ? '9+' : cartItemCount}
          </span>
        )}
      </button>

      {/* Cart Modal */}
      <CartModal show={showCartModal} onClose={() => setShowCartModal(false)} />
    </>
  )
}
