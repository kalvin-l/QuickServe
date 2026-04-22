'use client'

import React from 'react'
import type { StoredOrder } from '@/features/customer-orders/types/orderHistory.types'
import { Users, ChevronRight, User } from 'lucide-react'
import OrderStatusTimeline from './OrderStatusTimeline'
import { formatTimeAgo } from '@/lib/utils'

interface OrderCardProps {
  order: StoredOrder
  onClick?: () => void
  isYourOrder?: boolean  // Show "Your Order" badge in group context
}

// Status configuration with warm colors
const STATUS_CONFIG: Record<string, {
  label: string
  dotColor: string
  bgColor: string
  textColor: string
}> = {
  pending: { 
    label: 'Pending', 
    dotColor: 'bg-amber-400', 
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700'
  },
  confirmed: { 
    label: 'Confirmed', 
    dotColor: 'bg-[#d4a574]', 
    bgColor: 'bg-[#f5f0eb]',
    textColor: 'text-[#8b6914]'
  },
  preparing: { 
    label: 'Preparing', 
    dotColor: 'bg-[#d4a574]', 
    bgColor: 'bg-[#f5f0eb]',
    textColor: 'text-[#8b6914]'
  },
  ready: { 
    label: 'Ready', 
    dotColor: 'bg-green-400', 
    bgColor: 'bg-green-50',
    textColor: 'text-green-700'
  },
  served: { 
    label: 'Completed', 
    dotColor: 'bg-[#8b8680]', 
    bgColor: 'bg-[#f5f0eb]',
    textColor: 'text-[#5c5752]'
  },
  cancelled: {
    label: 'Cancelled',
    dotColor: 'bg-red-400',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700'
  },
}

export default function OrderCard({ order, onClick, isYourOrder = false }: OrderCardProps) {
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const isActive = ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)

  return (
    <button
      onClick={onClick}
      className="group w-full text-left relative"
    >
      {/* Subtle shadow on hover */}
      <div className="absolute inset-0 bg-[#d4a574]/20 rounded-xl translate-x-0.5 translate-y-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300" />
      
      <div className="relative bg-white rounded-xl border border-[#e8e4df]/60 transition-all duration-300 group-hover:border-[#d4a574]/30 group-hover:shadow-sm overflow-hidden">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-semibold text-[#2d2a26]">
                  {order.order_number}
                </h3>
                {order.order_type !== 'individual' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f5f0eb] text-[10px] font-medium text-[#8b8680]">
                    <Users className="w-3 h-3" />
                    {order.order_type === 'group_host' ? 'Host' : 'Group'}
                  </span>
                )}
              </div>
              
              {/* Status pill and badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusConfig.bgColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                  <span className={`text-xs font-medium ${statusConfig.textColor}`}>
                    {statusConfig.label}
                  </span>
                </div>
                {isYourOrder && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d4a574]/10 text-[10px] font-medium text-[#d4a574] border border-[#d4a574]/20">
                    <User className="w-3 h-3" />
                    Your Order
                  </span>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="text-right">
              <p className="text-lg font-semibold text-[#2d2a26]">
                ₱{order.total_in_pesos.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Items preview */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {order.items.slice(0, 3).map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 text-sm text-[#5c5752]"
                >
                  <span className="text-[#d4a574] font-medium">{item.quantity}×</span>
                  <span>{item.item_name}</span>
                </span>
              ))}
              {order.items.length > 3 && (
                <span className="text-xs text-[#8b8680]">
                  +{order.items.length - 3} more
                </span>
              )}
            </div>
          </div>

          {/* Timeline for active orders */}
          {isActive && (
            <div className="mb-4">
              <OrderStatusTimeline currentStatus={order.status} compact />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[#e8e4df]/60">
            <div className="flex items-center gap-3 text-xs text-[#8b8680]">
              <span>{formatTimeAgo(order.created_at)}</span>
              {order.table_number && (
                <>
                  <span className="w-1 h-1 bg-[#d4a574] rounded-full" />
                  <span>Table {order.table_number}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {order.payment?.status === 'completed' ? (
                <span className="text-xs font-medium text-green-600">Paid</span>
              ) : (
                <span className="text-xs text-[#8b8680]">Pending payment</span>
              )}
              <ChevronRight className="w-4 h-4 text-[#8b8680] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
