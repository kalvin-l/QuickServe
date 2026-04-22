'use client'

import React, { useState, useEffect } from 'react'
import type { StoredOrder } from '@/features/customer-orders/types/orderHistory.types'
import { Users, ChevronDown, ChevronUp, User } from 'lucide-react'
import OrderCard from './OrderCard'

const STORAGE_KEY = 'quickserve-expanded-groups'

interface GroupOrdersSectionProps {
  orders: StoredOrder[]
  onOrderClick?: (orderId: number) => void
  currentParticipantId?: number | null  // NEW: For identifying "your order"
}

function groupOrdersBySession(orders: StoredOrder[]): Map<number | null, StoredOrder[]> {
  const grouped = new Map<number | null, StoredOrder[]>()

  orders.forEach(order => {
    const groupId = order.group_session_id ?? null
    if (!grouped.has(groupId)) {
      grouped.set(groupId, [])
    }
    grouped.get(groupId)!.push(order)
  })

  return grouped
}

interface GroupStats {
  totalOrders: number
  totalAmount: number
  participants: Set<string>
  orderTypes: Set<'group_split' | 'group_host'>
}

function calculateGroupStats(orders: StoredOrder[]): GroupStats {
  const participants = new Set<string>()
  const orderTypes = new Set<'group_split' | 'group_host'>()

  orders.forEach(order => {
    if (order.customer_name) {
      participants.add(order.customer_name)
    }
    if (order.order_type !== 'individual') {
      orderTypes.add(order.order_type)
    }
  })

  return {
    totalOrders: orders.length,
    totalAmount: orders.reduce((sum, o) => sum + o.total_in_pesos, 0),
    participants,
    orderTypes,
  }
}

// Helper: Check if order belongs to current user
function isCurrentUsersOrder(order: StoredOrder, currentParticipantId: number | null | undefined): boolean {
  if (!currentParticipantId) return false
  return order.participant_id === currentParticipantId
}

// Helper: Get group status (worst status in group)
function getGroupStatus(orders: StoredOrder[]): string {
  const statusPriority = ['cancelled', 'pending', 'confirmed', 'preparing', 'ready', 'served']
  for (const status of statusPriority) {
    if (orders.some(o => o.status === status)) return status
  }
  return orders[0]?.status || 'pending'
}

// Helper: Get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Helper: Order type tooltip component
function OrderTypeTooltip({ type }: { type: 'group_host' | 'group_split' }) {
  const [showTooltip, setShowTooltip] = React.useState(false)

  return (
    <div className="relative inline-block">
      <span
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-[10px] font-medium text-[#8b8680] cursor-help border border-transparent hover:border-[#d4a574]/20 transition-colors"
        role="button"
        tabIndex={0}
        aria-label={type === 'group_host' ? 'Host pays for all orders in this group' : 'Each person pays for their own orders'}
      >
        <Users className="w-3 h-3" />
        {type === 'group_host' ? 'Host' : 'Split'}
      </span>
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-[#2d2a26] text-white text-xs rounded-lg whitespace-nowrap z-10 shadow-lg">
          {type === 'group_host'
            ? 'Host pays for all orders in this group'
            : 'Each person pays for their own orders'}
          <div className="absolute top-full left-3 -mt-px w-2 h-2 bg-[#2d2a26] rotate-45" />
        </div>
      )}
    </div>
  )
}

// Helper: Empty section state component
function EmptySectionState({ type }: { type: 'group' | 'individual' }) {
  const config = {
    group: {
      icon: Users,
      title: 'No group orders yet',
      description: 'Start a group session with friends to order together',
    },
    individual: {
      icon: User,
      title: 'No individual orders',
      description: 'Your personal orders will appear here',
    },
  }
  const { icon: Icon, title, description } = config[type]

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12 text-center">
      <div className="inline-flex w-16 h-16 rounded-full bg-[#f5f0eb] items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[#d4a574]/50" />
      </div>
      <h3 className="text-sm font-medium text-[#2d2a26] mb-1">{title}</h3>
      <p className="text-xs text-[#8b8680]">{description}</p>
    </div>
  )
}

export default function GroupOrdersSection({ orders, onOrderClick, currentParticipantId }: GroupOrdersSectionProps) {
  // Initialize from localStorage for persisted expand state
  const [expandedGroups, setExpandedGroups] = useState<Set<number | null>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const groupedOrders = groupOrdersBySession(orders)
  const individualOrders = groupedOrders.get(null) || []
  const groupSessions = Array.from(groupedOrders.entries())
    .filter(([sessionId]) => sessionId !== null)
    .sort(([, a], [, b]) => {
      const aLatest = Math.max(...a.map(o => new Date(o.created_at).getTime()))
      const bLatest = Math.max(...b.map(o => new Date(o.created_at).getTime()))
      return bLatest - aLatest
    })

  const hasGroupOrders = groupSessions.length > 0
  const hasIndividualOrders = individualOrders.length > 0

  const toggleGroup = (sessionId: number | null) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)))
      }
      return next
    })
  }

  if (!hasGroupOrders && !hasIndividualOrders) {
    return null
  }

  return (
    <div className="space-y-8">
      {/* Group Orders Section */}
      {hasGroupOrders && (
        <section>
          <div className="mb-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#2d2a26] tracking-[0.15em] uppercase flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#d4a574]/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#d4a574]" />
                </div>
                Group Orders
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#d4a574] text-white text-[10px] font-bold">
                  {groupSessions.length}
                </span>
              </h2>
            </div>
            <p className="ml-10 text-xs text-[#8b8680] mt-1">
              Orders you've placed with others
            </p>
          </div>

          <div className="space-y-4">
            {groupSessions.map(([sessionId, sessionOrders]) => {
              const stats = calculateGroupStats(sessionOrders)
              const isExpanded = expandedGroups.has(sessionId)
              const latestOrder = sessionOrders[0]
              const groupStatus = getGroupStatus(sessionOrders)

              return (
                <div key={`group-${sessionId}`} className="px-4 sm:px-6 lg:px-8">
                  {/* Group Header */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#d4a574]/30 to-[#d4a574]/10 rounded-xl translate-x-0.5 translate-y-0.5" />
                    <div className="relative bg-gradient-to-r from-[#f5f0eb] to-white rounded-xl border border-[#d4a574]/30 overflow-hidden">
                      <button
                        onClick={() => toggleGroup(sessionId)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-[#8b8680]" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-[#8b8680]" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-base font-semibold text-[#2d2a26]">
                                Group #{sessionId}
                              </h3>
                              {Array.from(stats.orderTypes).map(type => (
                                <OrderTypeTooltip key={type} type={type} />
                              ))}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#8b8680] flex-wrap">
                              <span>{stats.totalOrders} order{stats.totalOrders > 1 ? 's' : ''}</span>
                              <span className="w-1 h-1 bg-[#d4a574] rounded-full" />
                              <span>₱{stats.totalAmount.toFixed(2)}</span>
                              {stats.participants.size > 0 && (
                                <>
                                  <span className="w-1 h-1 bg-[#d4a574] rounded-full" />
                                  <span>{stats.participants.size} person{stats.participants.size > 1 ? 's' : ''}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Participant Avatars */}
                          {stats.participants.size > 0 && (
                            <div className="flex -space-x-2 shrink-0 mr-4">
                              {Array.from(stats.participants).slice(0, 4).map((name, i) => (
                                <div
                                  key={i}
                                  className="w-7 h-7 rounded-full bg-[#d4a574] text-white text-[10px] font-medium flex items-center justify-center border-2 border-white shadow-sm"
                                  title={name}
                                >
                                  {getInitials(name)}
                                </div>
                              ))}
                              {stats.participants.size > 4 && (
                                <div className="w-7 h-7 rounded-full bg-[#8b8680] text-white text-[10px] font-medium flex items-center justify-center border-2 border-white shadow-sm">
                                  +{stats.participants.size - 4}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Status */}
                        <div className="shrink-0">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            groupStatus === 'served'
                              ? 'bg-white text-[#5c5752]'
                              : groupStatus === 'cancelled'
                              ? 'bg-red-50 text-red-600'
                              : ['pending', 'confirmed', 'preparing', 'ready'].includes(groupStatus)
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-white text-[#8b8680]'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              groupStatus === 'served'
                                ? 'bg-[#8b8680]'
                                : groupStatus === 'cancelled'
                                ? 'bg-red-400'
                                : ['pending', 'confirmed', 'preparing', 'ready'].includes(groupStatus)
                                ? 'bg-amber-400'
                                : 'bg-[#8b8680]'
                            }`} />
                            {groupStatus === 'served'
                              ? 'Completed'
                              : groupStatus === 'cancelled'
                              ? 'Cancelled'
                              : groupStatus.charAt(0).toUpperCase() + groupStatus.slice(1)}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Orders */}
                  {isExpanded && (
                    <div
                      className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 pl-4 overflow-hidden"
                      style={{
                        animation: 'slideDown 0.2s ease-out'
                      }}
                    >
                      {sessionOrders.map(order => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onClick={() => onOrderClick?.(order.id)}
                          isYourOrder={isCurrentUsersOrder(order, currentParticipantId)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Individual Orders Section */}
      {hasIndividualOrders && (
        <section>
          <div className="mb-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#2d2a26] tracking-[0.15em] uppercase flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#d4a574]/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#d4a574]" />
                </div>
                Individual Orders
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#d4a574] text-white text-[10px] font-bold">
                  {individualOrders.length}
                </span>
              </h2>
            </div>
            <p className="ml-10 text-xs text-[#8b8680] mt-1">
              Your personal orders
            </p>
          </div>

          <div className="px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {individualOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => onOrderClick?.(order.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
