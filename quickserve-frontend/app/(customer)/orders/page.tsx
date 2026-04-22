'use client'

/**
 * Orders Page - Human-centered design with warm aesthetic
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useOrderHistory, setCurrentOrderSession } from '@/features/customer-orders'
import { useTableWebSocket } from '@/hooks/useWebSocket'
import { useCustomerSession } from '@/features/customer-session'
import { useCustomerCategories } from '@/lib/api/queries/useCustomerMenu'
import { useCategoryStore } from '@/features/categories/store/categoryStore'
import { Receipt, Clock, Trash2 } from 'lucide-react'
import type { Order } from '@/types/order.types'
import CustomerLayout from '@/components/customer/layout/CustomerLayout'
import OrderCard from './components/OrderCard'
import OrderFilters, { type OrderFilterType, type ViewModeType, calculateFilterCounts } from './components/OrderFilters'
import OrderDetailsModal from './components/OrderDetailsModal'
import EmptyState from './components/EmptyState'
import GroupOrdersSection from './components/GroupOrdersSection'
import ConfirmDialog from '@/components/ui/confirm-dialog'

export default function OrdersPage() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<OrderFilterType>('all')
  const [viewMode, setViewMode] = useState<ViewModeType>('flat')
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { tableId, isValid, sessionId, sessionDbId: contextSessionDbId } = useCustomerSession()

  // Fallback: Get sessionDbId from tableSession localStorage if not in context
  const sessionDbId = typeof window !== 'undefined' ? (() => {
    if (contextSessionDbId) return contextSessionDbId
    try {
      const tableSessionStr = localStorage.getItem('tableSession')
      if (tableSessionStr) {
        const tableSession = JSON.parse(tableSessionStr)
        return tableSession.id || null
      }
    } catch {
      // Ignore parse errors
    }
    return null
  })() : contextSessionDbId
  const { categories, setCategories } = useCategoryStore()

  const { data: categoriesFromApi = [] } = useCustomerCategories()

  useEffect(() => {
    if (categoriesFromApi.length > 0) {
      setCategories(categoriesFromApi)
    }
  }, [categoriesFromApi, setCategories])

  const handleCategorySelect = useCallback((categoryId: string) => {
    if (categoryId === 'all') {
      router.push('/menu')
    } else {
      router.push(`/menu?category=${categoryId}`)
    }
  }, [router])

  // Set the current session for order filtering
  // This ensures orders from other sessions are not saved
  useEffect(() => {
    setCurrentOrderSession(sessionDbId)
  }, [sessionDbId])

  const {
    orders,
    isLoading,
    updateOrder,
    getActiveOrders,
    getCompletedOrders,
    getCancelledOrders,
    clearHistory,
  } = useOrderHistory({ status: activeFilter, sessionId: sessionDbId })

  const filterCounts = useMemo(() => {
    const groupSessions = new Set(
      orders
        .filter(o => o.group_session_id)
        .map(o => o.group_session_id)
    ).size

    return calculateFilterCounts(
      orders.length,
      getActiveOrders().length,
      getCompletedOrders().length,
      getCancelledOrders().length,
      groupSessions
    )
  }, [orders.length, getActiveOrders, getCompletedOrders, getCancelledOrders, orders])

  const hasGroupOrders = useMemo(() => {
    return orders.some(o => o.group_session_id !== undefined && o.group_session_id !== null)
  }, [orders])

  const selectedOrderData = useMemo(() =>
    orders.find(o => o.id === selectedOrder) || null,
    [orders, selectedOrder]
  )

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'active') return getActiveOrders()
    if (activeFilter === 'completed') return getCompletedOrders()
    if (activeFilter === 'cancelled') return getCancelledOrders()
    return orders
  }, [activeFilter, orders, getActiveOrders, getCompletedOrders, getCancelledOrders])

  const handleOrderStatusChanged = useCallback(async (orderId: number, newStatus: string, order?: any) => {
    if (order) {
      // Use the complete order data from WebSocket (includes items, pricing, etc.)
      // The saveOrderToHistory function will check if it belongs to the current session
      updateOrder(order as Order)
    } else {
      // Fallback: just update status if order data not provided (backward compatibility)
      const existingOrder = orders.find(o => o.id === orderId)
      if (existingOrder) {
        const updatedOrder = {
          ...existingOrder,
          status: newStatus as any,
          updated_at: new Date().toISOString(),
        }
        updateOrder(updatedOrder as any)
      }
    }
  }, [updateOrder, orders])

  const handleNewOrder = useCallback((order: any) => {
    if (order && order.id) {
      // Use the complete order data from WebSocket
      // The saveOrderToHistory function will check if it belongs to the current session
      updateOrder(order as Order)
    }
  }, [updateOrder])

  const handleClearHistory = useCallback(() => {
    clearHistory()
  }, [clearHistory])

  useTableWebSocket(tableId ?? 0, {
    sessionId: sessionId,
    enabled: isValid && !!tableId,
    onOrderStatusChanged: handleOrderStatusChanged,
    onNewOrder: handleNewOrder,
  })

  // Background polling to refresh orders silently every 30 seconds
  // Only updates orders that have actually changed
  useEffect(() => {
    if (!isValid || !sessionDbId) return

    const fetchOrders = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/orders?table_session_id=${sessionDbId}&page=1&page_size=50`
        )
        if (response.ok) {
          const data = await response.json()

          // Batch update: only update orders that have changed
          const currentOrdersMap = new Map(orders.map(o => [o.id, o]))
          const ordersToUpdate: Order[] = []

          for (const order of data.items || []) {
            const existing = currentOrdersMap.get(order.id)
            // Only update if status or updated_at changed
            if (!existing ||
                existing.status !== order.status ||
                existing.updated_at !== order.updated_at) {
              ordersToUpdate.push(order as Order)
            }
          }

          // Batch update all changed orders at once
          if (ordersToUpdate.length > 0) {
            for (const order of ordersToUpdate) {
              updateOrder(order)
            }
          }
        }
      } catch {
        // Silent fail - background refresh shouldn't show errors
      }
    }

    // Initial fetch after a short delay to avoid flicker on mount
    const initialTimeout = setTimeout(fetchOrders, 2000)

    // Poll every 30 seconds (reduced frequency to minimize flicker)
    const interval = setInterval(fetchOrders, 30000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [isValid, sessionDbId, orders, updateOrder])

  return (
    <CustomerLayout
      categories={categories}
      activeCategory="all"
      onCategorySelect={handleCategorySelect}
    >
      <div className="py-6 sm:py-8">
        {/* Header - Warm human-centered design */}
        <div className="relative mx-4 sm:mx-6 lg:mx-8 mb-8">
          <div className="absolute inset-0 bg-[#d4a574]/20 rounded-2xl translate-x-0.5 translate-y-0.5" />
          <div className="relative bg-white rounded-2xl p-6 sm:p-8 border border-[#e8e4df]/60 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#f5f0eb] rounded-xl flex items-center justify-center text-[#d4a574]">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium text-[#d4a574] tracking-[0.2em] uppercase mb-1">
                  Your Orders
                </p>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#2d2a26] tracking-tight">
                  Order History
                </h1>
                <p className="text-sm text-[#8b8680] mt-1">
                  Track and manage your orders
                </p>
              </div>
              <div className="flex items-center gap-3">
                {orders.length > 0 && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-[#f5f0eb] rounded-lg">
                    <Clock className="w-4 h-4 text-[#8b8680]" />
                    <span className="text-xs font-medium text-[#5c5752]">
                      {orders.length} order{orders.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {orders.length > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="hidden sm:flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group"
                    title="Clear all order history"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 group-hover:text-red-700" />
                    <span className="text-xs font-medium text-red-600 group-hover:text-red-700">Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <OrderFilters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={filterCounts}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            hasGroupOrders={hasGroupOrders}
          />
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#e8e4df] border-t-[#d4a574] rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState filter={activeFilter} />
        ) : (
          viewMode === 'grouped' && hasGroupOrders ? (
            <div className="pb-6 sm:pb-8">
              <GroupOrdersSection
                orders={filteredOrders}
                onOrderClick={(orderId) => setSelectedOrder(orderId)}
                currentParticipantId={sessionId ? parseInt(sessionId) : undefined}
              />
            </div>
          ) : (
            <div className="px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-6 sm:pb-8">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => setSelectedOrder(order.id)}
                />
              ))}
            </div>
          )
        )}
      </div>

      <OrderDetailsModal
        order={selectedOrderData}
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleClearHistory}
        title="Clear All Order History?"
        message="This will permanently delete all your order history. This action cannot be undone."
        confirmText="Clear History"
        cancelText="Cancel"
        variant="danger"
      />
    </CustomerLayout>
  )
}
