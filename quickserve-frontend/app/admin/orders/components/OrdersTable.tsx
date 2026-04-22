'use client'

import React from 'react'
import { Inbox } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner/LoadingSpinner'
import OrderStatusBadge from '@/components/admin/ui/OrderStatusBadge'
import OrderTypeBadge from '@/components/admin/ui/OrderTypeBadge'
import TableActionsDropdown, { type Action } from '@/components/admin/ui/TableActionsDropdown'
import { STATUS_MAP } from '../constants/statusMaps'
import type { Order } from '@/types/order.types'

export interface OrdersTableProps {
  orders: Order[]
  isLoading: boolean
  getOrderActions: (order: Order) => Action[]
  formatTimeAgo: (dateString: string | undefined) => string
}

/**
 * Orders table component
 * Displays orders with loading state, empty state, and order rows
 */
export default function OrdersTable({ orders, isLoading, getOrderActions, formatTimeAgo }: OrdersTableProps) {
  if (isLoading) {
    return (
      <div className="relative bg-white rounded-2xl shadow-sm overflow-hidden border border-[#e8e4df]/60">
        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10"></div>
        <div className="p-8 sm:p-12 text-center">
          <LoadingSpinner type="branded" size="xl" />
          <p className="mt-4 text-sm sm:text-base text-[#8b8680]">Loading orders...</p>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="relative bg-white rounded-2xl shadow-sm overflow-hidden border border-[#e8e4df]/60">
        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10"></div>
        <div className="p-12 text-center">
          <Inbox className="w-10 h-10 text-[#e8e4df] mx-auto mb-4" />
          <p className="text-[#8b8680]">No orders found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-white rounded-2xl shadow-sm overflow-hidden border border-[#e8e4df]/60">
      <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10"></div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#e8e4df]/60">
          <thead className="bg-[#faf9f7]">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                Order
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                Table
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                Type
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                Items
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                Total
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                Status
              </th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                Time
              </th>
              <th className="px-6 py-3 text-right text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#e8e4df]/60">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-[#faf9f7] transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-[#2d2a26]">{order.order_number}</div>
                  <div className="text-xs text-[#8b8680]">{order.customer_name || 'Guest'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-[#2d2a26]">
                    {order.table_number ? `Table ${order.table_number}` : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <OrderTypeBadge
                    isGroup={order.order_type !== 'individual'}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-[#2d2a26]">{order.items?.length || 0} items</div>
                  <div className="text-xs text-[#8b8680] truncate max-w-[200px]">
                    {order.items?.map(i => i.item_name).join(', ') || 'No items'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-[#d4a574]">
                    ₱{order.total_in_pesos.toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {order.payment ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.payment.status === 'completed'
                        ? 'bg-[#f0fdf4] text-[#22c55e]'
                        : order.payment.status === 'failed'
                        ? 'bg-[#fef2f2] text-[#ef4444]'
                        : 'bg-[#fef3c7] text-[#f59e0b]'
                    }`}>
                      {order.payment.status === 'completed' ? 'Paid' : order.payment.status}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f5f0eb] text-[#8b8680]">
                      Unpaid
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <OrderStatusBadge status={STATUS_MAP[order.status] || order.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b8680]">
                  {formatTimeAgo(order.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <TableActionsDropdown actions={getOrderActions(order)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
