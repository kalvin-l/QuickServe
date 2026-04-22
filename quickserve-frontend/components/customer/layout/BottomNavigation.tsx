'use client'

import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, UtensilsCrossed, Receipt, ShoppingCart, Users } from 'lucide-react'
import { useCustomerSession } from '@/features/customer-session'
import { useSession } from '@/contexts/SessionContext'
import { useCartItemCount } from '@/features/cart/hooks/useCart'
import { getActiveGroupByTable } from '@/lib/groupApi'
import { getPendingRequests } from '@/lib/joinRequestApi'
import { useGroupStore } from '@/features/groups/store/groupStore'
import CartModal from '@/components/customer/cart/CartModal'
import HostDashboardModal from '@/components/customer/group/HostDashboardModal'
import ParticipantGroupCartModal from '@/components/customer/group/ParticipantGroupCartModal'
import { useGroupCart } from '@/lib/api/queries/useOrders'

export default function BottomNavigation() {
  const pathname = usePathname()
  const { tableNumber: customerTableNumber, qrCode, isValid } = useCustomerSession()
  const { session, participant } = useSession()
  const cartItemCount = useCartItemCount()
  const currentGroup = useGroupStore((state) => state.currentGroup)

  const { data: groupCart } = useGroupCart(currentGroup?.group_id) as {
    data: { items: { length: number }[] } | undefined
    isLoading: boolean
    refetch: () => void
  }

  const [showCartModal, setShowCartModal] = useState(false)
  const [showHostModal, setShowHostModal] = useState(false)
  const [showParticipantCartModal, setShowParticipantCartModal] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [isIndividualMode, setIsIndividualMode] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [storedGroupId, setStoredGroupId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isProbablyHostPaysMode = (() => {
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
        if (orderMode === 'group') {
          const storedHostId = localStorage.getItem(`group-host-${sessionId}`)
          return !!storedHostId
        }
      }
    } catch (e) {
      console.error('[BottomNavigation] Error checking host_pays mode:', e)
    }
    return false
  })()

  useEffect(() => {
    if (typeof window === 'undefined') return
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
        const groupId = localStorage.getItem(`group-id-${sessionId}`)
        if (groupId) setStoredGroupId(groupId)
      }
    } catch (e) {
      console.error('[BottomNavigation] Error getting storedGroupId:', e)
    }
  }, [session?.session_id])

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
          if (isProbablyHostPaysMode && tableParticipant.id) {
            return tableParticipant.id
          }
        } catch (e) {
          console.error('[BottomNavigation] Error parsing tableParticipant:', e)
        }
      }
    } catch (e) {
      console.error('[BottomNavigation] Error reading stored host_participant_id:', e)
    }
    return null
  })()

  const isHost = (currentGroup?.host_participant_id === participant?.id) || (storedHostParticipantId === participant?.id)
  const isParticipant = (currentGroup?.payment_type === 'host_pays_all' && !isHost && currentGroup) || (isProbablyHostPaysMode && !isHost)

  useEffect(() => {
    const effectiveGroupId = currentGroup?.group_id || storedGroupId
    if (!isHost || !effectiveGroupId) {
      setPendingCount(0)
      return
    }

    const fetchPendingCount = async () => {
      try {
        const requests = await getPendingRequests(effectiveGroupId)
        setPendingCount(requests.length)
      } catch {
        setPendingCount(0)
      }
    }

    fetchPendingCount()
    const interval = setInterval(fetchPendingCount, 5000)
    return () => clearInterval(interval)
  }, [isHost, currentGroup, storedGroupId])

  useEffect(() => {
    if (!session?.session_id) return

    const checkOrderMode = () => {
      const orderMode = localStorage.getItem(`order-mode-${session.session_id}`)
      setIsIndividualMode(orderMode === 'individual')
    }

    checkOrderMode()
    const interval = setInterval(checkOrderMode, 1000)
    return () => clearInterval(interval)
  }, [session?.session_id])

  const navItems = useMemo(() => {
    const items = []

    if (!mounted) {
      return [
        { id: 'home', label: 'Home', icon: Home, href: '/' },
        { id: 'menu', label: 'Menu', icon: UtensilsCrossed, href: '/menu' },
        { id: 'orders', label: 'Orders', icon: Receipt, href: '/orders' }
      ]
    }

    // Use session.table_number (from SessionContext) as primary source, fall back to customerSession
    const currentTableNumber = session?.table_number || customerTableNumber

    if (isValid && currentTableNumber) {
      items.push(
        { id: 'home', label: 'Home', icon: Home, href: `/table/${currentTableNumber}` },
        { id: 'menu', label: 'Menu', icon: UtensilsCrossed, href: qrCode ? `/menu?table=${qrCode}` : '/menu' }
      )
    } else {
      items.push(
        { id: 'home', label: 'Home', icon: Home, href: '/' },
        { id: 'menu', label: 'Menu', icon: UtensilsCrossed, href: '/menu' }
      )
    }

    const isInHostPaysAllGroup = currentGroup?.payment_type === 'host_pays_all' || isProbablyHostPaysMode
    if (isIndividualMode && !isInHostPaysAllGroup) {
      items.push({
        id: 'cart',
        label: 'Cart',
        icon: ShoppingCart,
        href: '',
        action: () => setShowCartModal(true),
        badge: cartItemCount > 0 ? cartItemCount : undefined
      })
    }

    if (isHost && (currentGroup || storedGroupId)) {
      items.push({
        id: 'host',
        label: 'Group',
        icon: Users,
        href: '',
        action: () => setShowHostModal(true),
        badge: pendingCount > 0 ? pendingCount : undefined
      })
    }

    if (isParticipant) {
      items.push({
        id: 'group-cart',
        label: 'Group Cart',
        icon: ShoppingCart,
        href: '',
        action: () => setShowParticipantCartModal(true),
        badge: groupCart?.items?.length ? groupCart.items.length : undefined
      })
    }

    items.push(
      { id: 'orders', label: 'Orders', icon: Receipt, href: '/orders' }
    )

    return items
  }, [mounted, isValid, session?.table_number, customerTableNumber, qrCode, isIndividualMode, isHost, isParticipant, currentGroup, cartItemCount, pendingCount, groupCart?.items?.length, isProbablyHostPaysMode, storedGroupId])

  const isGroupMode = currentGroup?.payment_type === 'host_pays_all' || isProbablyHostPaysMode

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e8e4df]/60 z-50">
        <div className="flex items-center justify-around py-2 pb-safe">
          {navItems.map((item) => {
            const isActive = item.id === 'menu'
              ? pathname === '/menu'
              : pathname === item.href

            const Icon = item.icon
            const content = (
              <>
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'text-[#d4a574]' : 'text-[#8b8680]'}`} />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] transition-all duration-200 ${isActive ? 'font-medium text-[#2d2a26]' : 'text-[#8b8680]'}`}>
                  {item.label}
                </span>
              </>
            )

            if (item.action) {
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 active:scale-95"
                >
                  {content}
                </button>
              )
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 active:scale-95"
              >
                {content}
              </Link>
            )
          })}
        </div>

        {/* Group Mode Banner */}
        {mounted && isGroupMode && (
          <div className="bg-green-50 border-t border-green-100 px-4 py-1.5">
            <p className="text-[10px] text-center text-green-700 font-medium flex items-center justify-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              Group Order Active
            </p>
          </div>
        )}
      </nav>

      {/* Modals */}
      <CartModal show={showCartModal} onClose={() => setShowCartModal(false)} />

      {isHost && (currentGroup || storedGroupId) && (
        <HostDashboardModal
          show={showHostModal}
          onClose={() => setShowHostModal(false)}
          groupId={currentGroup?.group_id || storedGroupId || ''}
        />
      )}

      {isParticipant && (
        <ParticipantGroupCartModal
          show={showParticipantCartModal}
          onClose={() => setShowParticipantCartModal(false)}
          groupId={currentGroup?.group_id || storedGroupId || ''}
        />
      )}
    </>
  )
}
