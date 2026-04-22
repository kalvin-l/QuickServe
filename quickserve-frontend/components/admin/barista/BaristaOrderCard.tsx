'use client'

import { Play, Check, Eye, User, Clock, AlertCircle, MessageSquare } from 'lucide-react'

interface OrderItem {
  id: string
  name: string
  quantity: number
  isCustomized?: boolean
}

interface BaristaOrderCardProps {
  order: {
    id: string
    orderNumber: string
    tableNumber: string
    customerName: string
    items: OrderItem[]
    total: number
    status: string
    apiStatus?: string // Optional: original API status
    notes?: string
    createdAt: string
    updatedAt: string
  }
  isOverdue?: boolean
  timeInStatus: string
  onAction: (action: string) => void
  onClick: () => void
}

export default function BaristaOrderCard({
  order,
  isOverdue = false,
  timeInStatus,
  onAction,
  onClick
}: BaristaOrderCardProps) {
  const getActionButton = () => {
    if (order.status === 'queued') {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAction('advance')
          }}
          className="flex-1 bg-[#d4a574] hover:bg-[#c49665] text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
        >
          <Play className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>Start Making</span>
        </button>
      )
    }
    if (order.status === 'preparing') {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAction('advance')
          }}
          className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
        >
          <Check className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>Mark Ready</span>
        </button>
      )
    }
    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onAction('view')
        }}
        className="flex-1 bg-[#f5f0eb] hover:bg-[#ebe5de] text-[#5c5752] px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
      >
        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
        <span>View</span>
      </button>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-all ${
        isOverdue ? 'border-[#fca5a5] bg-[#fef2f2]/30' : 'border-[#e8e4df]/60'
      }`}
    >
      {/* Order Header */}
      <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <h3 className="font-bold text-base sm:text-lg text-[#2d2a26]">#{order.orderNumber}</h3>
            {isOverdue && (
              <span className="px-1.5 sm:px-2 py-0.5 bg-[#fef2f2] text-[#ef4444] rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap flex items-center gap-1">
                <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Overdue
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#8b8680] mt-0.5 truncate flex items-center gap-1">
            <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {order.customerName}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] sm:text-xs text-[#8b8680]">Table</div>
          <div className="font-bold text-sm sm:text-base text-[#2d2a26]">{order.tableNumber.replace('Table ', '')}</div>
        </div>
      </div>

      {/* Time in Status */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-xs sm:text-sm">
        <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isOverdue ? 'text-[#ef4444]' : 'text-[#8b8680]'}`} />
        <span className={isOverdue ? 'text-[#ef4444] font-bold' : 'text-[#5c5752]'}>
          {timeInStatus}
        </span>
      </div>

      {/* Order Items Preview */}
      <div className="mb-2 sm:mb-3 pb-2 sm:pb-3 border-b border-[#e8e4df]/60">
        <div className="text-[10px] sm:text-xs font-bold text-[#8b8680] uppercase tracking-wide mb-1.5 sm:mb-2">Items</div>
        <div className="space-y-1 sm:space-y-1.5">
          {order.items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <span className="font-bold text-[#d4a574] w-4 sm:w-5 text-center text-xs sm:text-sm shrink-0">{item.quantity}</span>
              <span className="text-[#5c5752] truncate flex-1">{item.name}</span>
              {item.isCustomized && (
                <span className="px-1 sm:px-1.5 py-0.5 bg-[#fef3c7] text-[#d4a574] rounded text-[10px] sm:text-xs font-medium shrink-0">
                  Custom
                </span>
              )}
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="text-[10px] sm:text-xs text-[#8b8680] pl-5 sm:pl-7">
              +{order.items.length - 3} more
            </div>
          )}
        </div>
      </div>

      {/* Notes Indicator */}
      {order.notes && (
        <div className="mb-2 sm:mb-3 p-1.5 sm:p-2 bg-[#fef3c7] border border-[#f59e0b]/30 rounded-lg">
          <div className="flex items-start gap-1.5 sm:gap-2">
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#f59e0b] shrink-0 mt-0.5" />
            <p className="text-[10px] sm:text-xs text-[#5c5752] line-clamp-2">{order.notes}</p>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex gap-1.5 sm:gap-2">
        {getActionButton()}
      </div>
    </div>
  )
}
