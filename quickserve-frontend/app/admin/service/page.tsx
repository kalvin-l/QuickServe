'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { ShoppingCart, RefreshCw, Receipt, CheckCircle, Play, Check, CheckCheck, Clock, User, MessageSquare, Sliders } from 'lucide-react'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import AdminModal from '@/components/admin/ui/AdminModal'
import { useOrders } from '@/lib/api/queries/useOrders'
import { useUpdateOrderStatus } from '@/lib/api/queries/useOrders'
import type { Order as APIOrder, OrderStatus as APIOrderStatus } from '@/types/order.types'
import { formatTime } from '@/lib/utils'

type OrderStatus = 'preparing' | 'ready' | 'served'
type ViewType = 'all' | 'preparing' | 'ready' | 'served'

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
  apiStatus: APIOrderStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

// Map API order status to service status
function mapApiStatusToServiceStatus(status: APIOrderStatus): OrderStatus | null {
  switch (status) {
    case 'preparing':
      return 'preparing'
    case 'ready':
      return 'ready'
    case 'served':
      return 'served'
    default:
      return null // 'pending', 'confirmed', 'cancelled' are not shown in service queue
  }
}

// Transform API order to service order format
function transformOrder(apiOrder: APIOrder): Order | null {
  const serviceStatus = mapApiStatusToServiceStatus(apiOrder.status)
  if (!serviceStatus) return null

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
    status: serviceStatus,
    apiStatus: apiOrder.status,
    notes: apiOrder.notes,
    createdAt: apiOrder.created_at || new Date().toISOString(),
    updatedAt: apiOrder.updated_at || apiOrder.created_at || new Date().toISOString()
  }
}

export default function ServicePage() {
  const { data: ordersData, isLoading, refetch } = useOrders()
  const updateStatusMutation = useUpdateOrderStatus()

  const [selectedView, setSelectedView] = useState<ViewType>('all')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Set initial refresh time
  useEffect(() => {
    setLastRefresh(new Date())
  }, [])

  // Transform API orders to service format
  const orders = useMemo(() => {
    if (!ordersData?.orders) return []
    return ordersData.orders
      .map(transformOrder)
      .filter((order): order is Order => order !== null)
  }, [ordersData])

  // Filter orders by status
  const preparingOrders = useMemo(() => {
    return orders.filter(order => order.status === 'preparing')
  }, [orders])

  const readyOrders = useMemo(() => {
    return orders.filter(order => order.status === 'ready')
  }, [orders])

  const servedOrders = useMemo(() => {
    return orders.filter(order => order.status === 'served')
  }, [orders])

  // Calculate statistics
  const queueStats = useMemo(() => ({
    preparing: preparingOrders.length,
    ready: readyOrders.length,
    served: servedOrders.length,
  }), [orders, preparingOrders.length, readyOrders.length, servedOrders.length])

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
      if (order.status === 'preparing') {
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
      // Error is handled by the mutation hook
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

  const viewButtons = [
    { value: 'all', label: 'All Orders' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready to Serve' },
    { value: 'served', label: 'Served' }
  ]

  return (
    <AdminLayout
      pageTitle="Service Queue"
      pageSubtitle="Order Management for Service Staff"
      showHeader={false}
    >
      <div className="h-[calc(100vh-64px)] flex flex-col p-2 sm:p-4 md:p-6 max-w-full mx-auto bg-[#faf9f7]">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6 shrink-0">
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10 text-[#d4a574]" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2d2a26]">
                Service Queue
              </h1>
              <p className="text-[#8b8680] text-xs sm:text-sm mt-0.5">Order Management</p>
            </div>
          </div>

          {/* Controls Section */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Last Updated */}
            <div className="text-right hidden xs:block">
              <div className="text-[10px] sm:text-xs text-[#8b8680] font-medium">Updated</div>
              <div className="text-xs sm:text-sm font-bold text-[#5c5752] font-mono">
                {lastRefresh
                  ? formatTime(lastRefresh.toISOString())
                  : '--:--'
                }
              </div>
            </div>

            {/* Refresh Button */}
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

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl p-3 sm:p-4 border border-[#e8e4df]/60 shadow-sm">
            <div className="text-[10px] sm:text-xs text-[#8b8680] font-medium uppercase tracking-wide">Preparing</div>
            <div className="text-2xl sm:text-3xl font-bold text-[#f59e0b]">{queueStats.preparing}</div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 border border-[#e8e4df]/60 shadow-sm">
            <div className="text-[10px] sm:text-xs text-[#8b8680] font-medium uppercase tracking-wide">Ready</div>
            <div className="text-2xl sm:text-3xl font-bold text-[#22c55e]">{queueStats.ready}</div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 border border-[#e8e4df]/60 shadow-sm">
            <div className="text-[10px] sm:text-xs text-[#8b8680] font-medium uppercase tracking-wide">Served</div>
            <div className="text-2xl sm:text-3xl font-bold text-[#3b82f6]">{queueStats.served}</div>
          </div>
        </div>

        {/* View Filter (Desktop) */}
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

        {/* Mobile Filter */}
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4a574] mx-auto mb-4" />
              <p className="mt-4 text-sm sm:text-base text-[#8b8680]">Loading orders...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && orders.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ShoppingCart className="w-16 h-16 text-[#e8e4df] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#5c5752] mb-2">No orders to serve</h3>
              <p className="text-[#8b8680]">Orders will appear here when ready</p>
            </div>
          </div>
        )}

        {/* Orders Grid */}
        {orders.length > 0 && (
          <div className="flex-1 min-h-0 grid gap-4 grid-cols-1 md:grid-cols-3">
            {/* Column 1: Preparing */}
            {(selectedView === 'all' || selectedView === 'preparing') && (
              <div className="bg-[#fef3c7] rounded-xl p-4 border border-[#f59e0b]/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#f59e0b]">Preparing</h3>
                  <span className="bg-[#f59e0b] text-white px-2 py-1 rounded-full text-sm font-bold">
                    {preparingOrders.length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {preparingOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      timeInStatus={getTimeInStatus(order.updatedAt)}
                      onAction={(action) => handleCardAction(order, action)}
                      onClick={() => setSelectedOrder(order)}
                    />
                  ))}
                  {preparingOrders.length === 0 && (
                    <p className="text-center text-[#8b8680] py-8">No orders preparing</p>
                  )}
                </div>
              </div>
            )}

            {/* Column 2: Ready */}
            {(selectedView === 'all' || selectedView === 'ready') && (
              <div className="bg-[#f0fdf4] rounded-xl p-4 border border-[#22c55e]/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#22c55e]">Ready to Serve</h3>
                  <span className="bg-[#22c55e] text-white px-2 py-1 rounded-full text-sm font-bold">
                    {readyOrders.length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {readyOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      timeInStatus={getTimeInStatus(order.updatedAt)}
                      onAction={(action) => handleCardAction(order, action)}
                      onClick={() => setSelectedOrder(order)}
                    />
                  ))}
                  {readyOrders.length === 0 && (
                    <p className="text-center text-[#8b8680] py-8">No orders ready</p>
                  )}
                </div>
              </div>
            )}

            {/* Column 3: Served */}
            {(selectedView === 'all' || selectedView === 'served') && (
              <div className="bg-[#f0f9ff] rounded-xl p-4 border border-[#3b82f6]/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#3b82f6]">Served</h3>
                  <span className="bg-[#3b82f6] text-white px-2 py-1 rounded-full text-sm font-bold">
                    {servedOrders.length}
                  </span>
                </div>
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {servedOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      timeInStatus={getTimeInStatus(order.updatedAt)}
                      onAction={(action) => handleCardAction(order, action)}
                      onClick={() => setSelectedOrder(order)}
                    />
                  ))}
                  {servedOrders.length === 0 && (
                    <p className="text-center text-[#8b8680] py-8">No served orders</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
      </div>
    </AdminLayout>
  )
}

// Order Card Component
interface OrderCardProps {
  order: Order
  timeInStatus: string
  onAction: (action: string) => void
  onClick: () => void
}

function OrderCard({ order, timeInStatus, onAction, onClick }: OrderCardProps) {
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'preparing':
        return 'bg-[#fef3c7] border-[#f59e0b]/30'
      case 'ready':
        return 'bg-[#f0fdf4] border-[#22c55e]/30'
      case 'served':
        return 'bg-[#f0f9ff] border-[#3b82f6]/30'
    }
  }

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'preparing':
        return 'bg-[#f59e0b] text-white'
      case 'ready':
        return 'bg-[#22c55e] text-white'
      case 'served':
        return 'bg-[#3b82f6] text-white'
    }
  }

  return (
    <div
      onClick={onClick}
      className={`${getStatusColor(order.status)} rounded-xl p-4 border cursor-pointer hover:shadow-md transition-all`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg text-[#2d2a26]">#{order.orderNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusBadge(order.status)}`}>
              {order.status}
            </span>
          </div>
          <div className="text-sm text-[#5c5752]">{order.tableNumber}</div>
          <div className="text-xs text-[#8b8680]">{order.customerName}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#8b8680]">{timeInStatus}</div>
        </div>
      </div>

      <div className="border-t border-black/10 pt-3 mb-3">
        {order.items.slice(0, 3).map((item) => (
          <div key={item.id} className="flex justify-between text-sm mb-1">
            <span className="text-[#2d2a26]">
              <span className="font-bold">{item.quantity}</span>× {item.name}
            </span>
          </div>
        ))}
        {order.items.length > 3 && (
          <div className="text-xs text-[#8b8680]">+{order.items.length - 3} more items</div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="font-bold text-[#2d2a26]">₱{order.total.toFixed(2)}</div>
        {order.status === 'ready' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAction('advance')
            }}
            className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-bold transition-colors"
          >
            Mark Served
          </button>
        )}
      </div>
    </div>
  )
}
