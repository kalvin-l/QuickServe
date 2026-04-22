'use client'

/**
 * CartItem Component
 *
 * Display a single cart item
 */

import React from 'react'
import Image from 'next/image'
import type { CartItem as CartItemType } from '@/features/cart/types/cart.types'
import { useCart } from '@/features/cart'
import { useGroupStore } from '@/features/groups/store/groupStore'
import { useSession } from '@/contexts/SessionContext'
import { formatPrice } from '@/lib/utils'

interface CartItemProps {
  item: CartItemType
  participantName?: string
  canEdit?: boolean  // If false, hide quantity controls and remove button (for participants)
}

export default function CartItem({ item, participantName, canEdit }: CartItemProps) {
  const { incrementQuantity, decrementQuantity, removeFromCart } = useCart()
  const { currentGroup } = useGroupStore()
  const { participant } = useSession()

  // SAFER AUTO-DETECT: If canEdit is not provided, check both localStorage and group store
  // This ensures participants can never edit items, even if parent component forgets to pass canEdit=false
  const isEditModeAllowed = (() => {
    // If explicitly passed, use it
    if (canEdit !== undefined) return canEdit

    // SAFER: Use group store first as source of truth, then fallback to localStorage
    const isGroupModeFromStore = currentGroup?.payment_type === 'host_pays_all'
    // CORRECT: Compare participant ID (unique per device) not session ID (shared by all devices at table)
    const isHostFromStore = currentGroup?.host_participant_id === participant?.id

    // DEBUG: Log permission check details
    console.log('[CartItem] Permission check:', {
      canEdit,
      'currentGroup.payment_type': currentGroup?.payment_type,
      isGroupModeFromStore,
      'currentGroup.host_participant_id': currentGroup?.host_participant_id,
      'participant.id': participant?.id,
      isHostFromStore,
      'will return (from store)': currentGroup && isGroupModeFromStore ? isHostFromStore : 'checking localStorage...'
    })

    // If group store is loaded, use it
    if (currentGroup && isGroupModeFromStore) {
      return isHostFromStore // Only host can edit
    }

    // Fallback to localStorage check (useful before group loads)
    try {
      // Try different session keys
      const tableSession = typeof window !== 'undefined' ? localStorage.getItem('tableSession') : null
      const qrSession = typeof window !== 'undefined' ? localStorage.getItem('qr_session') : null

      let sessionId = null
      if (tableSession) {
        sessionId = JSON.parse(tableSession).session_id
      } else if (qrSession) {
        sessionId = JSON.parse(qrSession).sessionId
      }

      if (sessionId) {
        const orderMode = localStorage.getItem(`order-mode-${sessionId}`)
        // If in group mode, don't allow editing
        if (orderMode === 'group') {
          return false // SAFER: Don't allow editing if we detect group mode
        }
      }
    } catch (e) {
      console.error('[CartItem] Error detecting group mode:', e)
    }

    // Default to allowing edits only if we're certain we're not in group mode
    return true
  })()

  const formatCustomizations = () => {
    const parts: string[] = []

    if (item.customizations.size) {
      parts.push(item.customizations.size)
    }

    if (item.customizations.addons && item.customizations.addons.length > 0) {
      const addonNames = item.customizations.addons
        .map((a) => `${a.name} x${a.quantity || 1}`)
        .join(', ')
      parts.push(addonNames)
    }

    return parts.join(' • ')
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-surface-100 flex gap-4">
      {/* Image */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-100 shrink-0">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-surface-900 truncate">
          {item.name}
        </h3>

        {/* Participant Name Badge */}
        {participantName && (
          <span className="inline-block text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full mt-1">
            Added by {participantName}
          </span>
        )}

        {formatCustomizations() && (
          <p className="text-xs text-surface-500 mt-0.5 line-clamp-1">
            {formatCustomizations()}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          {/* Quantity Controls - only show if editing is allowed */}
          {isEditModeAllowed ? (
            <div className="flex items-center gap-2 bg-surface-50 rounded-lg border border-surface-200">
              <button
                onClick={() => decrementQuantity(item.id)}
                className="w-8 h-8 flex items-center justify-center text-surface-600 hover:bg-surface-200 rounded-md transition-colors"
              >
                <i className="fas fa-minus text-xs"></i>
              </button>
              <span className="text-sm font-semibold w-6 text-center">
                {item.quantity}
              </span>
              <button
                onClick={() => incrementQuantity(item.id)}
                className="w-8 h-8 flex items-center justify-center text-surface-600 hover:bg-surface-200 rounded-md transition-colors"
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            </div>
          ) : (
            <span className="text-sm text-surface-600">
              Qty: {item.quantity}
            </span>
          )}

          {/* Price */}
          <span className="font-bold text-primary">
            {formatPrice(item.totalPrice)}
          </span>
        </div>
      </div>

      {/* Remove Button - only show if editing is allowed */}
      {isEditModeAllowed && (
        <button
          onClick={() => removeFromCart(item.id)}
          className="self-start text-surface-400 hover:text-red-500 transition-colors p-1"
          aria-label="Remove item"
        >
          <i className="fas fa-trash-alt text-sm"></i>
        </button>
      )}
    </div>
  )
}
