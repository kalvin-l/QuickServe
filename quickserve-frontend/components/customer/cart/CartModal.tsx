'use client'

/**
 * CartModal - Individual Cart Modal
 *
 * Warm, human-centered design with offset shadows,
 * caramel accents, and editorial typography
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Modal from '@/components/ui/modal/Modal'
import { useCart, useCartItems } from '@/features/cart'
import { useSession } from '@/contexts/SessionContext'
import { useGroupStore } from '@/features/groups/store/groupStore'
import type { CartItem as CartItemType } from '@/features/cart/types/cart.types'
import { formatPrice } from '@/lib/utils'
import { X, Minus, Plus, ShoppingBag, Trash2, Lock, CreditCard, AlertCircle } from 'lucide-react'

interface CartModalProps {
  show: boolean
  onClose: () => void
}

export default function CartModal({ show, onClose }: CartModalProps) {
  const router = useRouter()
  const { session, participant } = useSession()
  const { incrementQuantity, decrementQuantity, removeFromCart, subtotal, tax, total, clearCart, meetsMinimumOrder, isLoading } = useCart()
  const cartItems = useCartItems()
  const { currentGroup } = useGroupStore()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)

  // Group mode detection
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
      console.error('[CartModal] Error checking group mode:', e)
    }
    return false
  })()

  const storedHostParticipantId = (() => {
    if (typeof window === 'undefined') return null
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
        const storedHostId = localStorage.getItem(`group-host-${sessionId}`)
        if (storedHostId) return parseInt(storedHostId, 10)
      }
      const tableParticipantStr = localStorage.getItem('tableParticipant')
      if (tableParticipantStr) {
        try {
          const tableParticipant = JSON.parse(tableParticipantStr)
          if (isProbablyInGroupMode && tableParticipant.id) {
            return tableParticipant.id
          }
        } catch (e) {
          console.error('[CartModal] Error parsing tableParticipant:', e)
        }
      }
    } catch (e) {
      console.error('[CartModal] Error reading stored host_participant_id:', e)
    }
    return null
  })()

  const isGroupMode = currentGroup?.payment_type === 'host_pays_all' || isProbablyInGroupMode
  const isHost = currentGroup?.host_participant_id === participant?.id || storedHostParticipantId === participant?.id
  const canEdit = !isGroupMode || isHost

  useEffect(() => {
    if (!show) setCheckoutLoading(false)
  }, [show])

  const handleCheckout = () => {
    setCheckoutLoading(true)
    router.push('/checkout')
  }

  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      clearCart()
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    setRemovingItemId(itemId)
    try {
      const item = cartItems.find(i => i.id === itemId)
      if (item && item.quantity > 1) {
        decrementQuantity(itemId)
      } else {
        removeFromCart(itemId)
      }
    } finally {
      setRemovingItemId(null)
    }
  }

  const formatCustomizations = (item: CartItemType) => {
    const parts: string[] = []
    if (item.customizations.size) {
      parts.push(item.customizations.size)
    }
    if (item.customizations.addons && item.customizations.addons.length > 0) {
      const addonNames = item.customizations.addons
        .map((a) => `${a.name}${a.quantity > 1 ? ` x${a.quantity}` : ''}`)
        .join(', ')
      parts.push(addonNames)
    }
    return parts.join(' • ')
  }

  // Calculate total items
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Modal
      show={show}
      onClose={onClose}
      maxWidth="md"
      contentClassName="p-0"
      showCloseButton={false}
    >
      <div className="flex flex-col max-h-[85vh] bg-[#faf9f7]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e8e4df]/60 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#faf9f7] text-[#5c5752] hover:bg-[#f5f0eb] hover:text-[#2d2a26] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[#2d2a26] tracking-tight">Your Order</h2>
              <p className="text-xs text-[#8b8680] mt-0.5">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in cart
              </p>
            </div>
            {isGroupMode && (
              <span className="text-[10px] font-semibold text-[#d4a574] bg-[#faf9f7] px-2.5 py-1 rounded-full uppercase tracking-wider border border-[#e8e4df]/60">
                Group Mode
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-3 border-[#d4a574] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 rounded-full bg-[#faf9f7] border border-[#e8e4df]/60 mx-auto flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6 text-[#8b8680]" />
            </div>
            <h3 className="text-[#2d2a26] font-medium mb-1">Your cart is empty</h3>
            <p className="text-sm text-[#8b8680] mb-4">Add some delicious items to get started</p>
            <button
              onClick={onClose}
              className="text-sm font-medium text-[#d4a574] hover:text-[#c49a6b] transition-colors"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItems.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white rounded-xl p-3 border border-[#e8e4df]/60 shadow-sm relative overflow-hidden"
                >
                  {/* Offset shadow decoration */}
                  <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
                  
                  <div className="flex gap-3">
                    {/* Image */}
                    <div className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden relative bg-[#faf9f7]">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#f5f0eb]">
                          <ShoppingBag className="w-6 h-6 text-[#d4a574]/50" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-medium text-[#2d2a26] text-sm truncate">
                            {item.name}
                          </h4>
                          {formatCustomizations(item) && (
                            <p className="text-xs text-[#8b8680] mt-0.5 line-clamp-1">
                              {formatCustomizations(item)}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-3 mt-2.5">
                            {/* Quantity Controls */}
                            {canEdit ? (
                              <div className="flex items-center gap-1.5 bg-[#faf9f7] rounded-lg p-1">
                                <button
                                  onClick={() => decrementQuantity(item.id)}
                                  className="w-7 h-7 flex items-center justify-center bg-[#2d2a26] text-white rounded-md hover:bg-[#3d3a36] transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-sm font-semibold w-5 text-center text-[#2d2a26]">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => incrementQuantity(item.id)}
                                  className="w-7 h-7 flex items-center justify-center bg-[#2d2a26] text-white rounded-md hover:bg-[#3d3a36] transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm text-[#5c5752] bg-[#faf9f7] px-2.5 py-1 rounded-lg">
                                Qty: {item.quantity}
                              </span>
                            )}

                            {/* Price */}
                            <span className="text-sm font-semibold text-[#d4a574]">
                              {formatPrice(item.totalPrice)}
                            </span>
                          </div>
                        </div>

                        {/* Remove Button */}
                        {canEdit && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={removingItemId === item.id}
                            className="w-8 h-8 flex items-center justify-center bg-[#faf9f7] hover:bg-red-50 text-[#8b8680] hover:text-red-500 rounded-lg transition-colors flex-shrink-0"
                            aria-label="Remove item"
                          >
                            {removingItemId === item.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-[#8b8680] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Clear Cart - only show for users who can edit */}
            {canEdit && cartItems.length > 0 && (
              <div className="px-4 pb-2">
                <button
                  onClick={handleClearCart}
                  className="text-xs font-medium text-[#8b8680] hover:text-red-500 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all items
                </button>
              </div>
            )}

            {/* Summary & Checkout */}
            <div className="border-t border-[#e8e4df]/60 bg-white p-5 space-y-4">
              {/* Cart Summary */}
              <div className="bg-[#faf9f7] rounded-xl p-4 border border-[#e8e4df]/60">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8b8680]">Subtotal</span>
                    <span className="font-medium text-[#5c5752]">{formatPrice(subtotal)}</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#8b8680]">Tax</span>
                      <span className="font-medium text-[#5c5752]">{formatPrice(tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-[#e8e4df]/60">
                    <span className="font-semibold text-[#2d2a26]">Total</span>
                    <span className="font-bold text-xl text-[#d4a574]">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={!meetsMinimumOrder || checkoutLoading || !canEdit}
                className="w-full bg-[#2d2a26] text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-[#3d3a36] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {checkoutLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : !canEdit ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Waiting for Host
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Proceed to Checkout
                  </>
                )}
              </button>

              {/* Status Messages */}
              {!meetsMinimumOrder ? (
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#8b8680]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Minimum order: ₱5.00</span>
                </div>
              ) : !canEdit ? (
                <p className="text-center text-xs text-[#8b8680]">
                  Only the host can checkout group orders
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
