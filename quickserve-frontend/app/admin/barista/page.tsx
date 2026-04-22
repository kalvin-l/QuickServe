'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Coffee, RefreshCw, Coffee as CoffeeIcon, Receipt, Blend, CheckCircle, Play, Check, CheckCheck, AlertTriangle, MessageSquare, Clock, User, Eye, Sliders } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner/LoadingSpinner'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import BaristaStats from '@/components/admin/barista/BaristaStats'
import BaristaColumn from '@/components/admin/barista/BaristaColumn'
import BaristaOrderCard from '@/components/admin/barista/BaristaOrderCard'
import AdminModal from '@/components/admin/ui/AdminModal'
import { useKitchenQueue, useUpdateOrderStatus } from '@/lib/api/queries/useOrders'
import { useKitchenWebSocket } from '@/hooks/useWebSocket'
import type { Order as APIOrder, OrderStatus as APIOrderStatus } from '@/types/order.types'
import { formatTime } from '@/lib/utils'

type OrderStatus = 'queued' | 'preparing' | 'ready'
type ViewType = 'all' | 'queued' | 'preparing' | 'ready'

interface OrderItem {
  id: string
  name: string
  quantity: number
  isCustomized?: boolean
}

interface Order {
  id: string
  orderNumber: string
  tableNumber: string
  customerName: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  apiStatus: APIOrderStatus // Store original API status for proper transitions
  notes?: string
  createdAt: string
  updatedAt: string
}

// Map API order status to barista status
function mapApiStatusToBaristaStatus(status: APIOrderStatus): OrderStatus | null {
  switch (status) {
    case 'pending':
    case 'confirmed':
      return 'queued'
    case 'preparing':
      return 'preparing'
    case 'ready':
      return 'ready'
    default:
      return null // 'served' and 'cancelled' are not shown in KDS
  }
}

// Transform API order to barista order format
function transformOrder(apiOrder: APIOrder): Order | null {
  const baristaStatus = mapApiStatusToBaristaStatus(apiOrder.status)
  if (!baristaStatus) return null

  return {
    id: String(apiOrder.id),
    orderNumber: apiOrder.order_number,
    tableNumber: apiOrder.table_number ? `Table ${apiOrder.table_number}` : 'N/A',
    customerName: apiOrder.customer_name || 'Guest',
    items: (apiOrder.items || []).map(item => ({
      id: String(item.id),
      name: item.item_name,
      quantity: item.quantity,
      isCustomized: !!(item.addons?.length || item.special_instructions || item.size_key || item.temperature)
    })),
    total: apiOrder.total_in_pesos,
    status: baristaStatus,
    apiStatus: apiOrder.status, // Store original API status
    notes: apiOrder.notes,
    createdAt: apiOrder.created_at || new Date().toISOString(),
    updatedAt: apiOrder.updated_at || apiOrder.created_at || new Date().toISOString()
  }
}

export default function BaristaPage() {
  const { data: kitchenData, isLoading, refetch } = useKitchenQueue()
  const updateStatusMutation = useUpdateOrderStatus()

  const [selectedView, setSelectedView] = useState<ViewType>('all')
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false) // Disabled by default since WebSocket provides real-time updates
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Real-time WebSocket updates for kitchen
  useKitchenWebSocket({
    onNewOrder: useCallback(() => {
      // Refetch kitchen queue when a new order comes in
      refetch()
    }, [refetch]),
    onOrderStatusChanged: useCallback(() => {
      // Refetch kitchen queue when an order status changes
      refetch()
    }, [refetch]),
    enabled: true, // Always enable WebSocket for real-time updates
  })

  // Set initial refresh time after client-side mount to avoid hydration mismatch
  useEffect(() => {
    setLastRefresh(new Date())
  }, [])

  // Transform API orders to barista format
  const orders = useMemo(() => {
    if (!kitchenData?.orders) return []
    return kitchenData.orders
      .map(transformOrder)
      .filter((order): order is Order => order !== null)
  }, [kitchenData])

  // Filter orders by status
  const queuedOrders = useMemo(() => {
    return orders.filter(order => order.status === 'queued')
  }, [orders])

  const preparingOrders = useMemo(() => {
    return orders.filter(order => order.status === 'preparing')
  }, [orders])

  const readyOrders = useMemo(() => {
    return orders.filter(order => order.status === 'ready')
  }, [orders])

  // Calculate statistics
  const queueStats = useMemo(() => ({
    queued: queuedOrders.length,
    preparing: preparingOrders.length,
    ready: readyOrders.length,
    overdue: orders.filter(order =>
      ['queued', 'preparing'].includes(order.status) &&
      isOverdue(order.status, order.updatedAt)
    ).length
  }), [orders, queuedOrders.length, preparingOrders.length, readyOrders.length])

  // Check if order is overdue (more than 10 minutes in queued/preparing status)
  function isOverdue(status: OrderStatus, updatedAt: string): boolean {
    const updateDate = new Date(updatedAt)
    const now = new Date()
    const diffMinutes = (now.getTime() - updateDate.getTime()) / (1000 * 60)
    return diffMinutes > 10
  }

  // Get time in status
  function getTimeInStatus(updatedAt: string): string {
    const updateDate = new Date(updatedAt)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60))

    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes === 1) return '1 min ago'
    if (diffMinutes < 60) return `${diffMinutes} mins ago`
    const hours = Math.floor(diffMinutes / 60)
    if (hours === 1) return '1 hour ago'
    return `${hours} hours ago`
  }

  // Handle advancing order to next status
  const handleAdvanceOrder = useCallback(async (order: Order) => {
    try {
      if (order.status === 'queued') {
        // If pending, confirm first then prepare
        // If already confirmed, just start preparing
        if (order.apiStatus === 'pending') {
          await updateStatusMutation.mutateAsync({
            orderId: parseInt(order.id),
            status: 'confirmed'
          })
          await updateStatusMutation.mutateAsync({
            orderId: parseInt(order.id),
            status: 'preparing'
          })
        } else {
          // Already confirmed -> Start preparing
          await updateStatusMutation.mutateAsync({
            orderId: parseInt(order.id),
            status: 'preparing'
          })
        }
      } else if (order.status === 'preparing') {
        // Preparing -> Ready
        await updateStatusMutation.mutateAsync({
          orderId: parseInt(order.id),
          status: 'ready'
        })
      } else if (order.status === 'ready') {
        // Ready -> Served
        await updateStatusMutation.mutateAsync({
          orderId: parseInt(order.id),
          status: 'served'
        })
      }
      refetch()
    } catch {
      // Error is handled by the mutation hook (toast)
    }
  }, [updateStatusMutation, refetch])

  // Handle card actions
  const handleCardAction = useCallback((order: Order, action: string) => {
    if (action === 'view') {
      setSelectedOrder(order)
    } else if (action === 'advance') {
      handleAdvanceOrder(order)
    }
  }, [handleAdvanceOrder])

  // Manual refresh
  const fetchOrders = useCallback(() => {
    refetch()
    setLastRefresh(new Date())
  }, [refetch])

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled)
  }

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefreshEnabled) {
      intervalRef.current = setInterval(() => {
        refetch()
        setLastRefresh(new Date())
      }, 10000) // 10 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefreshEnabled, refetch])

  const viewButtons = [
    { value: 'all', label: 'All Views' },
    { value: 'queued', label: 'To Prep' },
    { value: 'preparing', label: 'In Progress' },
    { value: 'ready', label: 'Ready' }
  ]

  return (
    <AdminLayout
      pageTitle="Barista KDS"
      pageSubtitle="Kitchen Display System"
      showHeader={false}
    >
      <div className="h-[calc(100vh-64px)] flex flex-col p-2 sm:p-4 md:p-6 max-w-full mx-auto bg-[#faf9f7]">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6 shrink-0">
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <Coffee className="w-8 h-8 sm:w-10 sm:h-10 text-[#d4a574]" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2d2a26]">
                Barista KDS
              </h1>
              <p className="text-[#8b8680] text-xs sm:text-sm mt-0.5">Kitchen Display System</p>
            </div>
          </div>

          {/* Controls Section */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Auto-Refresh Toggle - Hide text on mobile */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white px-2 sm:px-3 py-1.5 rounded-full border border-[#e8e4df]/60 shadow-sm">
              <span className="hidden sm:inline text-xs text-[#8b8680] font-medium uppercase tracking-wide">
                Auto-Refresh
              </span>
              <div
                onClick={toggleAutoRefresh}
                className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${
                  autoRefreshEnabled ? 'bg-[#22c55e]' : 'bg-[#e8e4df]'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                    autoRefreshEnabled ? 'translate-x-5' : ''
                  }`}
                ></div>
              </div>
            </div>

            {/* Last Updated - Smaller on mobile */}
            <div className="text-right hidden xs:block">
              <div className="text-[10px] sm:text-xs text-[#8b8680] font-medium">Updated</div>
              <div className="text-xs sm:text-sm font-bold text-[#5c5752] font-mono">
                {lastRefresh
                  ? formatTime(lastRefresh.toISOString())
                  : '--:--'}
              </div>
            </div>

            {/* Refresh Button - Smaller on mobile */}
            <button
              onClick={fetchOrders}
              disabled={isLoading}
              className="p-2 sm:p-2.5 text-[#8b8680] hover:text-[#d4a574] bg-white rounded-full shadow-sm border border-[#e8e4df]/60 hover:shadow-md transition-all active:scale-95"
              title="Refresh Now"
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* View Filter (Centered - Desktop) */}
        <div className="hidden md:flex bg-[#f5f0eb] p-1 rounded-xl border border-[#e8e4df]/60 mb-6">
          {viewButtons.map((view) => (
            <button
              key={view.value}
              onClick={() => setSelectedView(view.value as ViewType)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                selectedView === view.value
                  ? 'bg-white text-[#2d2a26] shadow-sm'
                  : 'text-[#5c5752] hover:text-[#2d2a26]'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        {/* Stats Bar */}
        <BaristaStats stats={queueStats} />

        {/* Mobile Filter (Visible only on small screens) */}
        <div className="md:hidden mb-3 sm:mb-4 overflow-x-auto pb-2 -mx-2 px-2">
          <div className="flex gap-2 min-w-max">
            {viewButtons.map((view) => (
              <button
                key={view.value}
                onClick={() => setSelectedView(view.value as ViewType)}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap border ${
                  selectedView === view.value
                    ? 'bg-[#2d2a26] text-white border-transparent'
                    : 'bg-white text-[#5c5752] border-[#e8e4df]/60'
                }`}
              >
                {view.value === 'all' ? 'All' : view.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && orders.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <LoadingSpinner type="branded" size="xl" />
              <p className="mt-4 text-sm sm:text-base text-[#8b8680]">Loading kitchen queue...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && orders.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <CoffeeIcon className="w-16 h-16 text-[#e8e4df] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#5c5752] mb-2">No orders in queue</h3>
              <p className="text-[#8b8680]">New orders will appear here automatically</p>
            </div>
          </div>
        )}

        {/* Main KDS Board */}
        {orders.length > 0 && (
          <div
            className={`flex-1 min-h-0 grid gap-2 sm:gap-4 lg:gap-6 pb-2 ${
              selectedView === 'all' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'
            }`}
          >
            {/* Column 1: Queued */}
            {(selectedView === 'all' || selectedView === 'queued') && (
              <BaristaColumn
                title="To Prep"
                count={queuedOrders.length}
                icon={Receipt}
                countColor="bg-[#e8e4df] text-[#5c5752]"
                isGrid={selectedView !== 'all'}
              >
                {queuedOrders.map((order) => (
                  <BaristaOrderCard
                    key={order.id}
                    order={order}
                    isOverdue={isOverdue(order.status, order.updatedAt)}
                    timeInStatus={getTimeInStatus(order.updatedAt)}
                    onAction={(action) => handleCardAction(order, action)}
                    onClick={() => setSelectedOrder(order)}
                  />
                ))}
              </BaristaColumn>
            )}

            {/* Column 2: Preparing */}
            {(selectedView === 'all' || selectedView === 'preparing') && (
              <BaristaColumn
                title="In Progress"
                count={preparingOrders.length}
                icon={Blend}
                countColor="bg-[#fef3c7] text-[#f59e0b]"
                isGrid={selectedView !== 'all'}
              >
                {preparingOrders.map((order) => (
                  <BaristaOrderCard
                    key={order.id}
                    order={order}
                    isOverdue={isOverdue(order.status, order.updatedAt)}
                    timeInStatus={getTimeInStatus(order.updatedAt)}
                    onAction={(action) => handleCardAction(order, action)}
                    onClick={() => setSelectedOrder(order)}
                  />
                ))}
              </BaristaColumn>
            )}

            {/* Column 3: Ready */}
            {(selectedView === 'all' || selectedView === 'ready') && (
              <BaristaColumn
                title="Ready for Pickup"
                count={readyOrders.length}
                icon={CheckCircle}
                countColor="bg-[#f0fdf4] text-[#22c55e]"
                isGrid={selectedView !== 'all'}
              >
                {readyOrders.map((order) => (
                  <BaristaOrderCard
                    key={order.id}
                    order={order}
                    timeInStatus={getTimeInStatus(order.updatedAt)}
                    onAction={(action) => handleCardAction(order, action)}
                    onClick={() => setSelectedOrder(order)}
                  />
                ))}
              </BaristaColumn>
            )}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <AdminModal
        show={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `#${selectedOrder.orderNumber}` : ''}
        maxWidth="2xl"
      >
        {selectedOrder && (
          <div className="p-1">
            {/* Modal Header Context */}
            <div className="flex justify-between items-center mb-6 border-b border-[#e8e4df]/60 pb-4">
              <div>
                <div className="text-sm text-[#8b8680]">Customer</div>
                <div className="font-bold text-lg text-[#2d2a26]">
                  {selectedOrder.customerName}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-[#8b8680]">Table</div>
                <div className="font-bold text-lg text-[#2d2a26]">
                  {selectedOrder.tableNumber}
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto pr-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8b8680]">
                Order Items
              </h4>
              {selectedOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start py-3 border-b border-dashed border-[#e8e4df]/60 last:border-0 hover:bg-[#faf9f7] rounded-lg px-2 transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="font-extrabold text-xl text-[#d4a574] w-8 text-center bg-[#fef3c7] rounded-lg h-8 flex items-center justify-center">
                      {item.quantity}
                    </div>
                    <div>
                      <div className="text-[#2d2a26] font-bold text-lg leading-tight">
                        {item.name}
                      </div>
                      {item.isCustomized && (
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-[#d4a574] bg-[#fef3c7] px-2 py-0.5 rounded-full mt-1">
                          <Sliders className="w-3 h-3" /> Customized
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes Block */}
            {selectedOrder.notes && (
              <div className="bg-[#fef3c7] border-l-4 border-[#f59e0b] p-4 rounded-r-lg mb-8">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-[#f59e0b] shrink-0" />
                  <div>
                    <div className="font-bold text-[#2d2a26] text-sm uppercase tracking-wide">
                      Special Instructions
                    </div>
                    <div className="text-[#5c5752] mt-1">{selectedOrder.notes}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-[#e8e4df]/60">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-[#8b8680] hover:text-[#2d2a26] font-medium transition-colors text-center"
              >
                Close
              </button>

              {selectedOrder.status === 'queued' && (
                <button
                  onClick={() => {
                    handleAdvanceOrder(selectedOrder)
                    setSelectedOrder(null)
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-[#d4a574] hover:bg-[#c49665] text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Start Making
                </button>
              )}

              {selectedOrder.status === 'preparing' && (
                <button
                  onClick={() => {
                    handleAdvanceOrder(selectedOrder)
                    setSelectedOrder(null)
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Mark Ready
                </button>
              )}

              {selectedOrder.status === 'ready' && (
                <button
                  onClick={() => {
                    handleAdvanceOrder(selectedOrder)
                    setSelectedOrder(null)
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark Served
                </button>
              )}
            </div>
          </div>
        )}
      </AdminModal>
    </AdminLayout>
  )
}
