'use client'

/**
 * Checkout Page
 *
 * Warm, human-centered design with offset shadows,
 * caramel accents, and editorial typography
 * Responsive: 2-column on desktop, single column on mobile
 */

import { useEffect, useState, FormEvent, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCart } from '@/features/cart'
import { useCustomerSession } from '@/features/customer-session'
import { useGroupStore } from '@/features/groups/store/groupStore'
import { useSession } from '@/contexts/SessionContext'
import EmptyCart from '@/components/customer/cart/EmptyCart'
import { useCreateOrder, useGroupCheckout, useGroupCart } from '@/lib/api/queries/useOrders'
import type { CreateOrderRequest, OrderType, PaymentMethod, GroupCheckoutRequest, GroupCart } from '@/types/order.types'
import {
  ArrowLeft, User, Wallet, Receipt, Check, CreditCard,
  Banknote, Smartphone, QrCode, Building2, Lock, ShoppingBag,
  AlertCircle, Loader2, Coffee
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner/LoadingSpinner'

// Payment options with Lucide icons
const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash', icon: Banknote, color: 'text-green-600' },
  { value: 'card', label: 'Card', icon: CreditCard, color: 'text-blue-600' },
  { value: 'e_wallet', label: 'E-Wallet', icon: Smartphone, color: 'text-purple-600' },
  { value: 'qr', label: 'QR Payment', icon: QrCode, color: 'text-orange-600' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2, color: 'text-indigo-600' },
]

export default function CheckoutPage() {
  const router = useRouter()
  const [isGroupLoading, setIsGroupLoading] = useState(true)
  const { items, subtotal, tax, total, isEmpty, meetsMinimumOrder, isLoading, isGroupCart } = useCart()
  const { isValid, isLoading: sessionLoading, tableId, sessionId, sessionDbId: contextSessionDbId } = useCustomerSession()
  const { currentGroup, fetchGroup } = useGroupStore()
  const { session, participant } = useSession()
  const createOrderMutation = useCreateOrder()
  const groupCheckoutMutation = useGroupCheckout()

  // Fallback: Get sessionDbId from tableSession localStorage if not in context
  const sessionDbId = (() => {
    if (contextSessionDbId) return contextSessionDbId
    if (typeof window !== 'undefined') {
      try {
        const tableSessionStr = localStorage.getItem('tableSession')
        if (tableSessionStr) {
          const tableSession = JSON.parse(tableSessionStr)
          return tableSession.id || null
        }
      } catch {
        // Ignore parse errors
      }
    }
    return null
  })()

  const { data: groupCart, isLoading: groupCartLoading } = useGroupCart(currentGroup?.group_id) as {
    data: GroupCart | undefined
    isLoading: boolean
  }

  // Load group from localStorage (only if not in individual mode)
  useEffect(() => {
    const loadGroup = async () => {
      setIsGroupLoading(true)
      try {
        const tableSessionStr = localStorage.getItem('tableSession')
        const qrSessionStr = localStorage.getItem('qr_session')
        let effectiveSessionId = sessionId
        if (!effectiveSessionId) {
          if (tableSessionStr) {
            const tableSession = JSON.parse(tableSessionStr)
            effectiveSessionId = tableSession.session_id
          } else if (qrSessionStr) {
            const qrSession = JSON.parse(qrSessionStr)
            effectiveSessionId = qrSession.sessionId
          }
        }

        // Check if user selected individual ordering mode - if so, don't load the group
        if (effectiveSessionId) {
          const orderMode = localStorage.getItem(`order-mode-${effectiveSessionId}`)
          if (orderMode === 'individual') {
            setIsGroupLoading(false)
            return
          }
        }

        if (effectiveSessionId && !currentGroup) {
          const savedGroupId = localStorage.getItem(`group-id-${effectiveSessionId}`)
          if (savedGroupId) {
            const group = await fetchGroup(savedGroupId)

            // CRITICAL: Validate that the loaded group belongs to the current session
            // Groups are tied to specific sessions, so if the session doesn't match, ignore the group
            if (group) {
              // Check if this group belongs to the current table session
              // The group should have the same table_id or be associated with the current session
              const groupBelongsToCurrentSession =
                group.table_id === session?.table_id ||
                group.host_session_id === session?.session_id ||
                group.host_session_id === participant?.table_session_id?.toString()

              if (!groupBelongsToCurrentSession) {
                // Clear the stale group
                const { setCurrentGroup } = useGroupStore.getState()
                setCurrentGroup(null)
                // Also remove the stale group-id from localStorage
                localStorage.removeItem(`group-id-${effectiveSessionId}`)
                localStorage.removeItem(`group-host-${effectiveSessionId}`)
              }
            }
          }
        }
      } catch (error) {
        // Silently handle errors
      } finally {
        setIsGroupLoading(false)
      }
    }
    loadGroup()
  }, [sessionId, currentGroup, fetchGroup])

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSubmitted, setOrderSubmitted] = useState(false)
  const isNavigatingAwayRef = useRef(false)

  // Group mode detection
  const isProbablyInGroupMode = (() => {
    try {
      const tableSessionStr = localStorage.getItem('tableSession')
      const qrSessionStr = localStorage.getItem('qr_session')
      let effectiveSessionId = sessionId
      if (!effectiveSessionId) {
        if (tableSessionStr) {
          const tableSession = JSON.parse(tableSessionStr)
          effectiveSessionId = tableSession.session_id
        } else if (qrSessionStr) {
          const qrSession = JSON.parse(qrSessionStr)
          effectiveSessionId = qrSession.sessionId
        }
      }
      if (effectiveSessionId) {
        const orderMode = localStorage.getItem(`order-mode-${effectiveSessionId}`)
        return orderMode === 'group'
      }
    } catch (e) {
      // Silently handle errors
    }
    return false
  })()

  const storedHostParticipantId = (() => {
    try {
      const tableSessionStr = localStorage.getItem('tableSession')
      const qrSessionStr = localStorage.getItem('qr_session')
      let effectiveSessionId = sessionId
      if (!effectiveSessionId) {
        if (tableSessionStr) {
          const tableSession = JSON.parse(tableSessionStr)
          effectiveSessionId = tableSession.session_id
        } else if (qrSessionStr) {
          const qrSession = JSON.parse(qrSessionStr)
          effectiveSessionId = qrSession.sessionId
        }
      }
      if (effectiveSessionId) {
        const storedHostId = localStorage.getItem(`group-host-${effectiveSessionId}`)
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
          // Silently handle errors
        }
      }
    } catch (e) {
      // Silently handle errors
    }
    return null
  })()

  // Check if the current group actually belongs to the current session
  // Groups are tied to specific sessions/table_sessions, so we need to validate
  const groupBelongsToCurrentSession = currentGroup && (
    currentGroup.table_id === session?.table_id ||
    currentGroup.host_session_id === session?.session_id ||
    currentGroup.host_session_id === participant?.table_session_id?.toString()
  )

  // Only consider it a host_pays group if the group actually belongs to the current session
  const isHostPaysGroup = groupBelongsToCurrentSession && currentGroup?.payment_type === 'host_pays_all'
  const isGroupHost = currentGroup?.host_participant_id === participant?.id || storedHostParticipantId === participant?.id

  // Validation
  const effectiveTotal = isHostPaysGroup && isGroupHost
    ? (groupCart?.total_in_pesos ?? 0)
    : total
  const effectiveMeetsMinimumOrder = effectiveTotal >= 5.00
  const isFormValid = paymentMethod !== '' && effectiveMeetsMinimumOrder

  // Redirect handling
  useEffect(() => {
    if (isNavigatingAwayRef.current) return
    if (sessionLoading || isLoading || isGroupLoading || groupCartLoading) return
    if (!isValid) {
      router.replace('/join')
      return
    }
    // Don't redirect participants - they'll see a message on the page instead
    const isCartEmpty = isHostPaysGroup && isGroupHost
      ? (groupCart?.items?.length ?? 0) === 0
      : isEmpty
    if (isCartEmpty && !isSubmitting && !orderSubmitted) {
      // Redirect to menu since /cart page doesn't exist (cart is a modal)
      router.replace('/menu')
    }
  }, [router, isValid, sessionLoading, isEmpty, isLoading, isGroupCart, isSubmitting, orderSubmitted, isHostPaysGroup, isGroupHost, isGroupLoading, groupCart, groupCartLoading])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isFormValid || isSubmitting) return

    isNavigatingAwayRef.current = true
    setOrderSubmitted(true)
    setIsSubmitting(true)

    try {
      const isHostPays = currentGroup?.payment_type === 'host_pays_all'
      const isHost = currentGroup?.host_participant_id === participant?.id

      if (isHostPays && isHost) {
        if (!currentGroup?.group_id) {
          throw new Error('Invalid group session')
        }
        const checkoutData: GroupCheckoutRequest = {
          session_id: sessionId || '',
          participant_id: participant?.id,
          customer_name: customerName || 'Group Host',
          payment_method: paymentMethod as PaymentMethod,
          notes: undefined
        }
        try {
          const order = await groupCheckoutMutation.mutateAsync({
            groupId: currentGroup.group_id,
            data: checkoutData
          })
          router.push(`/orders/${order.id}/confirmation`)
          return
        } catch (groupError: any) {
          console.error('[Checkout] Group checkout API failed:', groupError)
        }
      }

      let orderType: OrderType = 'individual'
      if (currentGroup) {
        orderType = currentGroup.payment_type === 'individual' ? 'group_split' : 'individual'
      }

      const orderItems = items.map(item => ({
        menu_item_id: typeof item.productId === 'string' ? parseInt(item.productId) : item.productId,
        quantity: item.quantity,
        size_key: item.customizations?.sizeKey || undefined,
        size_label: item.customizations?.size || undefined,
        size_price: item.customizations?.sizePrice ? Math.round(item.customizations.sizePrice * 100) : 0,
        addons: item.customizations?.addons?.map(addon => ({
          id: addon.id,
          name: addon.name,
          price: Math.round(addon.price * 100),
          quantity: addon.quantity || 1
        })) || [],
      }))

      const orderData: CreateOrderRequest = {
        table_id: tableId ?? undefined,
        table_session_id: sessionDbId ?? undefined,  // Use database ID for order filtering
        order_type: orderType,
        group_session_id: currentGroup?.id || undefined,
        participant_id: undefined,
        customer_name: customerName || 'Guest',
        items: orderItems,
        notes: undefined,
        payment_method: paymentMethod as PaymentMethod,
      }

      const order = await createOrderMutation.mutateAsync(orderData)
      router.push(`/orders/${order.id}/confirmation`)
    } catch (error) {
      console.error('Order submission failed:', error)
      isNavigatingAwayRef.current = false
      setOrderSubmitted(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isCartEmpty = isHostPaysGroup && isGroupHost
    ? (groupCart?.items?.length ?? 0) === 0
    : isEmpty

  // Show message for participants in host-pays-all groups (not host)
  // Note: We check isProbablyInGroupMode to ensure we don't show this for individual ordering
  const showGroupModeMessage = isHostPaysGroup && !isGroupHost && isProbablyInGroupMode && !orderSubmitted

  if (showGroupModeMessage) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="relative bg-white rounded-2xl p-6 md:p-8 border border-[#e8e4df]/60 shadow-sm">
            <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10" />

            <div className="w-12 h-12 rounded-full bg-[#faf9f7] flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-6 h-6 text-[#d4a574]" />
            </div>

            <h1 className="text-xl font-semibold text-[#2d2a26] text-center mb-2">
              Group Ordering Mode
            </h1>

            <p className="text-sm text-[#8b8680] text-center mb-6">
              You are part of a group where the host will place the order for everyone. Add items to your cart and the host will include them when they checkout.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/cart')}
                className="w-full bg-[#2d2a26] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#3d3a36] active:scale-[0.98] transition-all"
              >
                View Your Cart
              </button>

              <button
                onClick={() => router.push(`/table/${session?.table_number}`)}
                className="w-full bg-white text-[#2d2a26] font-semibold py-3 px-6 rounded-xl border border-[#e8e4df]/60 hover:bg-[#faf9f7] transition-all"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isCartEmpty && !isLoading && !groupCartLoading) {
    return <EmptyCart />
  }

  if (sessionLoading || isLoading || groupCartLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex flex-col items-center justify-center px-4 relative overflow-hidden">
        {/* Ambient Background Shapes */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#d4a574]/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#d4a574]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 text-center">
          <LoadingSpinner type="branded" size="xl" />
          <p className="mt-4 text-[#8b8680] text-sm tracking-wide">Preparing checkout...</p>
        </div>
      </div>
    )
  }

  if (!isValid) return null

  const selectedPaymentOption = PAYMENT_OPTIONS.find(opt => opt.value === paymentMethod)
  const SelectedPaymentIcon = selectedPaymentOption?.icon
  const displayItems = isHostPaysGroup && isGroupHost ? groupCart?.items : items
  const displayItemCount = isHostPaysGroup && isGroupHost 
    ? (groupCart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0)
    : items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="min-h-screen bg-[#faf9f7] pb-8">
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/cart')}
            className="inline-flex items-center gap-2 text-[#8b8680] hover:text-[#2d2a26] mb-4 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Cart</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#2d2a26] tracking-tight">
            Checkout
          </h1>
          <p className="text-[#8b8680] text-sm mt-1">
            Complete your order details below
          </p>
        </div>

        {/* Responsive Grid: Desktop 2-column, Mobile single */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-7 space-y-5">
            <form id="checkout-form" onSubmit={handleSubmit}>
              
              {/* Customer Information */}
              <div className="relative bg-white rounded-2xl p-5 md:p-6 border border-[#e8e4df]/60 shadow-sm mb-5">
                {/* Offset shadow */}
                <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10" />
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#faf9f7] flex items-center justify-center">
                    <User className="w-4 h-4 text-[#d4a574]" />
                  </div>
                  <h2 className="text-base font-semibold text-[#2d2a26]">Customer Information</h2>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2d2a26] tracking-[0.1em] uppercase mb-2">
                    Your Name <span className="text-[#8b8680] font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#e8e4df]/60 bg-[#faf9f7] text-[#2d2a26] placeholder:text-[#8b8680]/60 focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 outline-none transition-all"
                  />
                  <p className="text-xs text-[#8b8680] mt-2">
                    Leave blank to order as guest
                  </p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="relative bg-white rounded-2xl p-5 md:p-6 border border-[#e8e4df]/60 shadow-sm">
                {/* Offset shadow */}
                <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10" />
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#faf9f7] flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-[#d4a574]" />
                  </div>
                  <h2 className="text-base font-semibold text-[#2d2a26]">Payment Method</h2>
                  <span className="text-[10px] font-semibold text-[#d4a574] bg-[#faf9f7] px-2 py-1 rounded-full uppercase tracking-wider border border-[#e8e4df]/60 ml-auto">
                    Required
                  </span>
                </div>

                {/* Payment Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PAYMENT_OPTIONS.map((option) => {
                    const Icon = option.icon
                    const isSelected = paymentMethod === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPaymentMethod(option.value)}
                        className={`
                          relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200
                          ${isSelected
                            ? 'border-[#d4a574] bg-[#faf9f7]'
                            : 'border-[#e8e4df]/60 bg-white hover:border-[#d4a574]/50'
                          }
                        `}
                      >
                        <Icon className={`w-6 h-6 ${isSelected ? option.color : 'text-[#8b8680]'}`} />
                        <span className={`text-xs font-medium text-center ${isSelected ? 'text-[#2d2a26]' : 'text-[#5c5752]'}`}>
                          {option.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <Check className="w-4 h-4 text-[#d4a574]" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Selected Payment Info */}
                {selectedPaymentOption && SelectedPaymentIcon && (
                  <div className="mt-4 p-3 bg-[#faf9f7] rounded-xl border border-[#e8e4df]/60">
                    <div className="flex items-center gap-2">
                      <SelectedPaymentIcon className={`w-5 h-5 ${selectedPaymentOption.color}`} />
                      <span className="text-sm font-medium text-[#2d2a26]">
                        Paying with {selectedPaymentOption.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-6 space-y-5">
              
              {/* Summary Card */}
              <div className="relative bg-white rounded-2xl p-5 md:p-6 border border-[#e8e4df]/60 shadow-sm">
                {/* Offset shadow */}
                <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10" />
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#faf9f7] flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-[#d4a574]" />
                  </div>
                  <h2 className="text-base font-semibold text-[#2d2a26]">Order Summary</h2>
                  <span className="text-xs text-[#8b8680] ml-auto">
                    {displayItemCount} items
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-3 max-h-48 overflow-y-auto mb-4 pr-1">
                  {isHostPaysGroup && isGroupHost ? (
                    // Group cart items
                    groupCart?.items?.slice(0, 6).map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-12 h-12 rounded-lg bg-[#faf9f7] flex-shrink-0 overflow-hidden relative">
                          {item.item_image ? (
                            <Image src={item.item_image} alt={item.item_name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-4 h-4 text-[#8b8680]" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#2d2a26] truncate">{item.item_name}</p>
                          {item.participant_name && (
                            <p className="text-[10px] text-[#8b8680]">by {item.participant_name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#2d2a26]">₱{(item.item_total_in_pesos ?? 0).toFixed(2)}</p>
                          <p className="text-xs text-[#8b8680]">×{item.quantity}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Individual cart items
                    items.slice(0, 6).map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-12 h-12 rounded-lg bg-[#faf9f7] flex-shrink-0 overflow-hidden relative">
                          {item.image ? (
                            <Image src={item.image} alt={item.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#f5f0eb]">
                              <Coffee className="w-5 h-5 text-[#d4a574]/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#2d2a26] truncate">{item.name}</p>
                          {item.customizations?.size && (
                            <p className="text-[10px] text-[#8b8680]">{item.customizations.size}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#2d2a26]">₱{item.totalPrice.toFixed(2)}</p>
                          <p className="text-xs text-[#8b8680]">×{item.quantity}</p>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {(isHostPaysGroup && isGroupHost 
                    ? (groupCart?.items?.length ?? 0) 
                    : items.length
                  ) > 6 && (
                    <p className="text-xs text-[#8b8680] text-center py-2">
                      +{(isHostPaysGroup && isGroupHost 
                        ? (groupCart?.items?.length ?? 0) 
                        : items.length
                      ) - 6} more items
                    </p>
                  )}
                </div>

                {/* Totals */}
                <div className="border-t border-[#e8e4df]/60 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8b8680]">Subtotal</span>
                    <span className="font-medium text-[#5c5752]">
                      ₱{isHostPaysGroup && isGroupHost
                        ? ((groupCart?.subtotal_in_pesos ?? 0)).toFixed(2)
                        : subtotal.toFixed(2)}
                    </span>
                  </div>
                  
                  {((isHostPaysGroup && isGroupHost ? (groupCart?.tax_in_pesos ?? 0) : tax) > 0) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8b8680]">Tax</span>
                      <span className="font-medium text-[#5c5752]">
                        ₱{isHostPaysGroup && isGroupHost
                          ? (groupCart?.tax_in_pesos ?? 0).toFixed(2)
                          : tax.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-3 border-t border-[#e8e4df]/60">
                    <span className="font-semibold text-[#2d2a26]">Total</span>
                    <span className="text-2xl font-bold text-[#d4a574]">
                      ₱{isHostPaysGroup && isGroupHost
                        ? ((groupCart?.total_in_pesos ?? 0)).toFixed(2)
                        : total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Note */}
              <div className="flex items-center gap-2 text-xs text-[#8b8680] justify-center">
                <Lock className="w-3.5 h-3.5" />
                <span>Secure checkout powered by QuickServe</span>
              </div>

              {/* Submit Button - Desktop */}
              <div className="hidden lg:block">
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={!isFormValid || isSubmitting}
                  className="w-full bg-[#2d2a26] text-white font-semibold py-4 px-6 rounded-xl hover:bg-[#3d3a36] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Place Order
                    </>
                  )}
                </button>

                {!isFormValid && !effectiveMeetsMinimumOrder && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#8b8680] mt-3">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Minimum order: ₱5.00</span>
                  </div>
                )}
                {!isFormValid && effectiveMeetsMinimumOrder && !paymentMethod && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#8b8680] mt-3">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Please select a payment method</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button - Mobile (Sticky bottom) */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#e8e4df]/60 z-20">
            <button
              type="submit"
              form="checkout-form"
              disabled={!isFormValid || isSubmitting}
              className="w-full bg-[#2d2a26] text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-[#3d3a36] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Place Order — ₱{effectiveTotal.toFixed(2)}
                </>
              )}
            </button>
            
            {!isFormValid && !effectiveMeetsMinimumOrder && (
              <p className="text-center text-xs text-[#8b8680] mt-2">
                Minimum order: ₱5.00
              </p>
            )}
          </div>
          
          {/* Spacer for mobile sticky button */}
          <div className="lg:hidden h-20" />
        </div>
      </div>
    </div>
  )
}
