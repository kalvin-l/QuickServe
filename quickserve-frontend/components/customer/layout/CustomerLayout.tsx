'use client'

import { ReactNode, useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Category } from '@/types'
import { Coffee, Home, UtensilsCrossed, Receipt, ShoppingBasket, Users, Clock } from 'lucide-react'
import BottomNavigation from './BottomNavigation'
import HostDashboardModal from '@/components/customer/group/HostDashboardModal'
import ParticipantGroupCartModal from '@/components/customer/group/ParticipantGroupCartModal'
import CartModal from '@/components/customer/cart/CartModal'
import { useSession } from '@/contexts/SessionContext'
import { getActiveGroupByTable } from '@/lib/groupApi'
import { getPendingRequests } from '@/lib/joinRequestApi'
import { useGroupStore } from '@/features/groups/store/groupStore'
import { useCustomerSession } from '@/features/customer-session'
import { useGroupCart } from '@/lib/api/queries/useOrders'
import { useCartItemCount } from '@/features/cart'

export interface CustomerLayoutProps {
  categories: Category[]
  activeCategory: string
  onCategorySelect: (id: string) => void
  children: ReactNode
}

/**
 * CustomerLayout - Human-centered design with warm aesthetic
 */
export default function CustomerLayout({
  categories,
  activeCategory,
  onCategorySelect,
  children
}: CustomerLayoutProps) {
  const pathname = usePathname()
  const [showHostModal, setShowHostModal] = useState(false)
  const [showParticipantCartModal, setShowParticipantCartModal] = useState(false)
  const [showCartModal, setShowCartModal] = useState(false)
  const [hostGroupId, setHostGroupId] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [storedGroupId, setStoredGroupId] = useState<string | null>(null)

  const { session, participant } = useSession()
  const { tableNumber: customerTableNumber, qrCode, isValid } = useCustomerSession()
  const { setCurrentGroup, currentGroup } = useGroupStore()

  const cartItemCount = useCartItemCount()

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
      console.error('[CustomerLayout] Error checking host_pays mode:', e)
    }
    return false
  })()

  const { data: groupCart } = useGroupCart(currentGroup?.group_id) as {
    data: { items: { length: number }[] } | undefined
    isLoading: boolean
    refetch: () => void
  }

  useEffect(() => {
    setMounted(true)
  }, [])

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
      console.error('[CustomerLayout] Error getting storedGroupId:', e)
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
          console.error('[CustomerLayout] Error parsing tableParticipant:', e)
        }
      }
    } catch (e) {
      console.error('[CustomerLayout] Error reading stored host_participant_id:', e)
    }
    return null
  })()

  const isHost = currentGroup?.host_participant_id === participant?.id || storedHostParticipantId === participant?.id
  const isParticipant = (currentGroup?.payment_type === 'host_pays_all' && !isHost && currentGroup) || (isProbablyHostPaysMode && !isHost)

  const navItems = useMemo(() => {
    // Use session.table_number (from SessionContext) as primary source, fall back to customerSession
    const currentTableNumber = session?.table_number || customerTableNumber

    if (!mounted) {
      return [
        { id: 'home', label: 'Home', icon: Home, href: '/' },
        { id: 'menu', label: 'Menu', icon: UtensilsCrossed, href: '/menu' },
        { id: 'orders', label: 'Orders', icon: Receipt, href: '/orders' }
      ]
    }

    if (isValid && currentTableNumber) {
      return [
        { id: 'home', label: 'Home', icon: Home, href: `/table/${currentTableNumber}` },
        { id: 'menu', label: 'Menu', icon: UtensilsCrossed, href: qrCode ? `/menu?table=${qrCode}` : '/menu' },
        { id: 'orders', label: 'Orders', icon: Receipt, href: '/orders' }
      ]
    }
    return [
      { id: 'home', label: 'Home', icon: Home, href: '/' },
      { id: 'menu', label: 'Menu', icon: UtensilsCrossed, href: '/menu' },
      { id: 'orders', label: 'Orders', icon: Receipt, href: '/orders' }
    ]
  }, [mounted, isValid, session?.table_number, customerTableNumber, qrCode])

  useEffect(() => {
    const checkGroupStatus = async () => {
      if (!session?.table_id) return

      const orderMode = localStorage.getItem(`order-mode-${session.session_id}`)
      if (orderMode === 'individual') {
        setCurrentGroup(null)
        setHostGroupId(null)
        return
      }

      try {
        const group = await getActiveGroupByTable(session.table_id)
        setCurrentGroup(group)

        if (group && participant?.id && group.host_participant_id === participant.id) {
          setHostGroupId(group.group_id)
          try {
            const requests = await getPendingRequests(group.group_id)
            setPendingCount(requests.length)
          } catch {
            setPendingCount(0)
          }
        }
      } catch (err) {
        console.error('Failed to fetch group status:', err)
        setCurrentGroup(null)
      }
    }

    checkGroupStatus()
    const interval = setInterval(checkGroupStatus, 5000)
    return () => clearInterval(interval)
  }, [session?.table_id, session?.session_id, setCurrentGroup, participant?.id])

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

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col bg-white border-r border-[#e8e4df]/60 z-40">
        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2d2a26] rounded-xl flex items-center justify-center">
              <Coffee className="w-5 h-5 text-[#faf9f7]" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#2d2a26] tracking-tight">
                QuickServe
              </h1>
              <p className="text-[11px] text-[#8b8680]">Café & Bistro</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          {/* Categories */}
          <div>
            <h2 className="text-[10px] font-medium text-[#8b8680] tracking-[0.15em] uppercase mb-3 px-3">
              Menu
            </h2>
            <ul className="space-y-0.5">
              {categories.map((category) => (
                <li key={category.id}>
                  <button
                    onClick={() => onCategorySelect(category.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                      category.active
                        ? 'bg-[#2d2a26] text-white font-medium'
                        : 'text-[#5c5752] hover:bg-[#f5f0eb]'
                    }`}
                  >
                    <i className={`${category.icon} text-sm`}></i>
                    <span>{category.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h2 className="text-[10px] font-medium text-[#8b8680] tracking-[0.15em] uppercase mb-3 px-3">
              Navigate
            </h2>

            {/* Group Mode Indicator */}
            {currentGroup?.payment_type === 'host_pays_all' && (
              <div className="mb-3 mx-3 px-3 py-2 bg-green-50 border border-green-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                  </span>
                  <span className="text-xs font-medium text-green-700">Group Order</span>
                </div>
              </div>
            )}

            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = item.id === 'menu'
                  ? pathname === '/menu'
                  : pathname === item.href

                const Icon = item.icon
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                        isActive
                          ? 'bg-[#d4a574] text-white font-medium'
                          : 'text-[#5c5752] hover:bg-[#f5f0eb]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Cart & Group Buttons */}
          <div className="space-y-2">
            {!isProbablyHostPaysMode && !currentGroup?.payment_type?.includes('group') && (
              <button
                onClick={() => setShowCartModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#f5f0eb] hover:bg-[#ebe5de] text-[#5c5752] rounded-lg transition-all duration-200"
              >
                <div className="relative">
                  <ShoppingBasket className="w-4 h-4" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#d4a574] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {cartItemCount > 9 ? '9+' : cartItemCount}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium">My Cart</span>
              </button>
            )}

            {isParticipant && (
              <button
                onClick={() => setShowParticipantCartModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-all duration-200 border border-green-200"
              >
                <div className="relative">
                  <ShoppingBasket className="w-4 h-4" />
                  {groupCart?.items?.length && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-green-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {groupCart.items.length > 9 ? '9+' : groupCart.items.length}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium">Group Cart</span>
              </button>
            )}

            {isHost && (hostGroupId || storedGroupId) && (
              <button
                onClick={() => setShowHostModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-[#2d2a26] hover:bg-[#3d3a36] text-white rounded-lg transition-all duration-200"
              >
                <div className="relative">
                  <Users className="w-4 h-4" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium">Group Dashboard</span>
              </button>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#e8e4df]/60">
          <div className="flex items-center gap-3 px-3 py-3 bg-[#f5f0eb] rounded-lg">
            <Clock className="w-4 h-4 text-[#8b8680]" />
            <div>
              <p className="text-[10px] text-[#8b8680]">Open Daily</p>
              <p className="text-[11px] font-medium text-[#5c5752]">7AM — 10PM</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e8e4df]/60 px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <div className="w-9 h-9 bg-[#2d2a26] rounded-xl flex items-center justify-center">
              <Coffee className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[#2d2a26]">QuickServe</h1>
              <p className="text-[10px] text-[#8b8680]">Café & Bistro</p>
            </div>
          </div>
        </header>

        {/* Mobile Category Navigation */}
        <nav className="lg:hidden sticky top-14 z-20 bg-white/95 backdrop-blur-md border-b border-[#e8e4df]/60 px-3 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  category.active
                    ? 'bg-[#2d2a26] text-white'
                    : 'bg-[#f5f0eb] text-[#5c5752] hover:bg-[#ebe5de]'
                }`}
              >
                <i className={`${category.icon} text-xs`}></i>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile Bottom Navigation */}
        <BottomNavigation />

        {/* Page Content */}
        <div className="pb-20 pt-4 lg:pb-0 lg:pt-0">
          {children}
        </div>
      </main>

      {/* Modals */}
      {(hostGroupId || storedGroupId) && (
        <HostDashboardModal
          show={showHostModal}
          onClose={() => setShowHostModal(false)}
          groupId={hostGroupId || storedGroupId || ''}
        />
      )}

      {(currentGroup?.payment_type === 'host_pays_all' || isProbablyHostPaysMode) && !hostGroupId && (
        <ParticipantGroupCartModal
          show={showParticipantCartModal}
          onClose={() => setShowParticipantCartModal(false)}
          groupId={currentGroup?.group_id || ''}
        />
      )}

      <CartModal
        show={showCartModal}
        onClose={() => setShowCartModal(false)}
      />
    </div>
  )
}
