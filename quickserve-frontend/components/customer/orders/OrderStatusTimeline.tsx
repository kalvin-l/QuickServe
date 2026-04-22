'use client'

/**
 * Order Status Timeline Component
 * Visual timeline showing order progress: Pending → Confirmed → Preparing → Ready → Served
 */

import { Check, Clock, ChefHat, Bell, Utensils, XCircle } from 'lucide-react'
import type { OrderStatus } from '@/types/order.types'
import { formatTime } from '@/lib/utils'

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus
  createdAt?: string
  updatedAt?: string
  compact?: boolean // For smaller display in cards
}

interface StatusStep {
  key: OrderStatus
  label: string
  icon: React.ReactNode
  description: string
}

const STATUS_STEPS: StatusStep[] = [
  { key: 'pending', label: 'Pending', icon: <Clock className="w-4 h-4" />, description: 'Order received' },
  { key: 'confirmed', label: 'Confirmed', icon: <Check className="w-4 h-4" />, description: 'Order confirmed' },
  { key: 'preparing', label: 'Preparing', icon: <ChefHat className="w-4 h-4" />, description: 'Being prepared' },
  { key: 'ready', label: 'Ready', icon: <Bell className="w-4 h-4" />, description: 'Ready for pickup' },
  { key: 'served', label: 'Served', icon: <Utensils className="w-4 h-4" />, description: 'Enjoy your meal' },
]

// Map status to step index
const STATUS_INDEX: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  served: 4,
  cancelled: -1,
}

export default function OrderStatusTimeline({
  currentStatus,
  createdAt,
  updatedAt,
  compact = false,
}: OrderStatusTimelineProps) {
  // Handle cancelled orders specially
  if (currentStatus === 'cancelled') {
    return (
      <div className={`${compact ? 'py-2' : 'py-4'} px-4 bg-red-50 rounded-xl border border-red-100`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="font-medium text-red-700">Order Cancelled</p>
            <p className="text-sm text-red-500">This order has been cancelled</p>
          </div>
        </div>
      </div>
    )
  }

  const currentIndex = STATUS_INDEX[currentStatus] ?? 0

  if (compact) {
    // Compact version for order cards
    return (
      <div className="flex items-center gap-1">
        {STATUS_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isPending = index > currentIndex

          return (
            <div key={step.key} className="flex items-center">
              <div
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center transition-all
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isCurrent ? 'bg-[#d4a574] text-white ring-2 ring-[#d4a574]/30 ring-offset-1' : ''}
                  ${isPending ? 'bg-gray-100 text-gray-300' : ''}
                `}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span className="w-2 h-2">{step.icon}</span>
                )}
              </div>
              {index < STATUS_STEPS.length - 1 && (
                <div
                  className={`w-4 h-0.5 mx-0.5 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Full timeline version
  return (
    <div className="py-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#2d2a26]">Order Progress</h3>
        {updatedAt && (
          <span className="text-xs text-[#8b8680]">
            Updated {formatTime(updatedAt)}
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Progress Line Background */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Animated Progress Line */}
        <div
          className="absolute left-5 top-0 w-0.5 bg-green-500 transition-all duration-500"
          style={{ height: `${(currentIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        <div className="space-y-4">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isPending = index > currentIndex

            return (
              <div key={step.key} className="relative flex items-start gap-4">
                {/* Icon Circle */}
                <div
                  className={`
                    relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${isCompleted ? 'bg-green-500 text-white shadow-md shadow-green-500/30' : ''}
                    ${isCurrent ? 'bg-[#d4a574] text-white shadow-lg shadow-[#d4a574]/40 ring-4 ring-[#d4a574]/20' : ''}
                    ${isPending ? 'bg-white border-2 border-gray-200 text-gray-300' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}

                  {/* Pulse animation for current step */}
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full bg-[#d4a574] animate-ping opacity-20" />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 pt-1.5">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-medium transition-colors ${
                        isCurrent ? 'text-[#d4a574]' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-[#d4a574]/10 text-[#d4a574] text-xs font-medium rounded-full">
                        In Progress
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm ${
                      isPending ? 'text-gray-300' : 'text-[#8b8680]'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>

                {/* Timestamp for completed steps */}
                {isCompleted && createdAt && index === 0 && (
                  <span className="text-xs text-gray-400 pt-2">
                    {formatTime(createdAt)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Estimated Time */}
      {currentStatus !== 'served' && (
        <div className="mt-6 p-3 bg-[#faf9f7] rounded-xl border border-[#e8e4df]/60">
          <p className="text-sm text-[#5c5752]">
            {currentStatus === 'pending' && '⏳ Your order is being reviewed...'}
            {currentStatus === 'confirmed' && '👍 Order confirmed! Preparing soon...'}
            {currentStatus === 'preparing' && '👨‍🍳 Our kitchen is preparing your order...'}
            {currentStatus === 'ready' && '🔔 Your order is ready! Please pick it up.'}
          </p>
        </div>
      )}
    </div>
  )
}
