'use client'

import React, { useCallback, ReactNode } from 'react'
import AdminModal from '@/components/admin/ui/AdminModal'
import OrderStatusBadge from '@/components/admin/ui/OrderStatusBadge'
import { STATUS_MAP } from '../constants/statusMaps'
import { statusActions } from '../constants/statusActions'
import type { Order, OrderStatus } from '@/types/order.types'

export interface OrderDetailsModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
  onConfirmPayment: (paymentId: number) => Promise<void>
  onUpdateStatus: (orderId: number, newStatus: OrderStatus) => Promise<void>
  formatTimeAgo: (dateString: string | undefined) => string
}

/**
 * Order details modal component
 * Displays order information, payment, items, and summary in a two-column layout
 */
export default function OrderDetailsModal({
  order,
  isOpen,
  onClose,
  onConfirmPayment,
  onUpdateStatus,
  formatTimeAgo,
}: OrderDetailsModalProps) {
  const getPrimaryActionButton = useCallback((): ReactNode | null => {
    if (!order) return null

    // Confirm payment action
    if (order.payment?.status === 'pending' && order.payment?.method === 'cash') {
      return (
        <button
          onClick={() => {
            if (order.payment) {
              onConfirmPayment(order.payment.id)
              onClose()
            }
          }}
          className="px-6 py-2.5 bg-[#ec7813] text-white rounded-lg hover:bg-[#ea580c] font-medium transition-colors"
        >
          Confirm Payment
        </button>
      )
    }

    // Status update actions
    const action = statusActions[order.status]
    if (action) {
      return (
        <button
          onClick={() => {
            onUpdateStatus(order.id, action.nextStatus)
            onClose()
          }}
          className="px-6 py-2.5 bg-[#ec7813] text-white rounded-lg hover:bg-[#ea580c] font-medium transition-colors"
        >
          {action.label}
        </button>
      )
    }

    return null
  }, [order, onConfirmPayment, onUpdateStatus, onClose])

  if (!order) return null

  return (
    <AdminModal
      show={isOpen}
      onClose={onClose}
      title=""
      maxWidth="2xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Order Number Badge */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#ec7813]/10 flex items-center justify-center">
                <i className="fas fa-receipt text-[#ec7813]"></i>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Order Number</p>
                <p className="text-2xl font-bold text-gray-900">{order.order_number}</p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <i className="fas fa-clipboard-list text-gray-400 text-sm"></i>
                <h3 className="text-sm font-semibold text-gray-900">Order Details</h3>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-user text-gray-500 text-sm"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Customer</p>
                  <p className="text-gray-900 font-medium truncate">{order.customer_name || 'Guest'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-utensils text-gray-500 text-sm"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Table</p>
                  <p className="text-gray-900 font-medium">
                    {order.table_number ? `Table ${order.table_number}` : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-tag text-gray-500 text-sm"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Order Type</p>
                  <p className="text-gray-900 font-medium capitalize">{order.order_type.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-clock text-gray-500 text-sm"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Time</p>
                  <p className="text-gray-900 font-medium">{formatTimeAgo(order.created_at)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-info-circle text-gray-500 text-sm"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                  <div className="mt-1">
                    <OrderStatusBadge status={STATUS_MAP[order.status] || order.status} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          {order.payment && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <i className="fas fa-credit-card text-gray-400 text-sm"></i>
                  <h3 className="text-sm font-semibold text-gray-900">Payment</h3>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    {order.payment.method === 'cash' ? (
                      <i className="fas fa-money-bill-wave text-gray-500 text-sm"></i>
                    ) : order.payment.method === 'card' ? (
                      <i className="fas fa-credit-card text-gray-500 text-sm"></i>
                    ) : (
                      <i className="fas fa-wallet text-gray-500 text-sm"></i>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Method</p>
                    <p className="text-gray-900 font-medium capitalize">{order.payment.method.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-check-circle text-gray-500 text-sm"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.payment.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : order.payment.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.payment.status === 'completed' ? 'Paid' : order.payment.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Items & Total */}
        <div className="lg:col-span-2 flex flex-col">
          {/* Items */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex-1">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fas fa-shopping-basket text-gray-400 text-sm"></i>
                  <h3 className="text-sm font-semibold text-gray-900">Order Items ({order.items?.length || 0})</h3>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-1">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-start py-3 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg border-2 border-gray-200 flex items-center justify-center flex-shrink-0 bg-white">
                          <span className="text-sm font-bold text-gray-700">{item.quantity}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <i className="fas fa-coffee text-gray-400 text-sm"></i>
                            <p className="text-gray-900 font-medium truncate">{item.item_name}</p>
                          </div>
                          {(item.size_label || item.addons) && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 ml-7 text-xs text-gray-500">
                              {item.size_label && (
                                <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                  <i className="fas fa-ruler-horizontal text-[10px]"></i>
                                  {item.size_label}
                                </span>
                              )}
                              {item.addons && item.addons.length > 0 && (
                                <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                  <i className="fas fa-plus text-[10px]"></i>
                                  {item.addons.map(a => a.name).join(', ')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 text-right flex-shrink-0">
                      <p className="text-gray-900 font-semibold">₱{item.item_total_in_pesos.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary & Actions */}
          <div className="mt-6 space-y-4">
            {/* Order Summary */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <i className="fas fa-calculator text-gray-500"></i>
                <h4 className="text-sm font-semibold text-gray-900">Order Summary</h4>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <i className="fas fa-list-alt text-xs w-4"></i>
                    <span>Subtotal</span>
                  </div>
                  <span className="text-gray-900 font-medium">₱{order.subtotal_in_pesos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <i className="fas fa-percent text-xs w-4"></i>
                    <span>Tax</span>
                  </div>
                  <span className="text-gray-900 font-medium">₱{(order.tax / 100).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#ec7813] flex items-center justify-center">
                        <i className="fas fa-peso-sign text-white text-sm"></i>
                      </div>
                      <span className="text-gray-900 font-semibold">Total</span>
                    </div>
                    <span className="text-2xl font-bold text-[#ec7813]">₱{order.total_in_pesos.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {getPrimaryActionButton()}
              <button
                onClick={onClose}
                className="flex-1 px-6 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminModal>
  )
}
