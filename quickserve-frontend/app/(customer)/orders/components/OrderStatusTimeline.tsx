'use client'

import React from 'react'
import { Clock, Check, ChefHat, Bell, Flag, Ban } from 'lucide-react'
import type { OrderStatus } from '@/types/order.types'

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus
  compact?: boolean
}

const STATUS_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'served',
]

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Done',
  cancelled: 'Cancelled',
}

const STATUS_ICONS: Record<OrderStatus, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  confirmed: <Check className="w-3.5 h-3.5" />,
  preparing: <ChefHat className="w-3.5 h-3.5" />,
  ready: <Bell className="w-3.5 h-3.5" />,
  served: <Flag className="w-3.5 h-3.5" />,
  cancelled: <Ban className="w-3.5 h-3.5" />,
}

function getProgressInfo(currentStatus: OrderStatus) {
  if (currentStatus === 'cancelled') {
    return { progress: 0, currentIndex: -1 }
  }

  const currentIndex = STATUS_FLOW.indexOf(currentStatus)
  const totalSteps = STATUS_FLOW.length
  const progress = ((currentIndex + 1) / totalSteps) * 100

  return { progress, currentIndex }
}

function getStepState(stepStatus: OrderStatus, currentIndex: number) {
  const stepIndex = STATUS_FLOW.indexOf(stepStatus)

  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'current'
  return 'pending'
}

export default function OrderStatusTimeline({ currentStatus, compact = false }: OrderStatusTimelineProps) {
  const { progress, currentIndex } = getProgressInfo(currentStatus)
  const isCancelled = currentStatus === 'cancelled'

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {/* Progress bar */}
        <div className="flex-1 h-2 bg-[#f5f0eb] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#d4a574] rounded-full transition-all duration-500 ease-out"
            style={{ width: isCancelled ? '0%' : `${progress}%` }}
          />
        </div>
        {/* Status label */}
        <div className="flex items-center gap-2 min-w-fit">
          {!isCancelled && (
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              progress === 100 ? 'bg-[#2d2a26]' : 'bg-[#f5f0eb]'
            }`}>
              {STATUS_ICONS[currentStatus] && (
                <span className={`w-3.5 h-3.5 ${progress === 100 ? 'text-white' : 'text-[#d4a574]'}`}>
                  {STATUS_ICONS[currentStatus]}
                </span>
              )}
            </div>
          )}
          <span className="text-xs font-medium text-[#5c5752]">
            {isCancelled ? 'Cancelled' : STATUS_LABELS[currentStatus]}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-[#f5f0eb] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#d4a574] rounded-full transition-all duration-500 ease-out"
            style={{ width: isCancelled ? '0%' : `${progress}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-[#5c5752] min-w-fit">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Status steps - Responsive: horizontal on desktop, vertical on mobile */}
      <div className="flex md:hidden flex-col gap-3">
        {STATUS_FLOW.map((stepStatus) => {
          const stepState = getStepState(stepStatus, currentIndex)

          return (
            <div key={stepStatus} className="flex items-center gap-3">
              {/* Step dot */}
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 shrink-0
                  ${stepState === 'completed' ? 'bg-[#d4a574]' : ''}
                  ${stepState === 'current' ? 'bg-[#d4a574] ring-2 ring-[#f5f0eb]' : ''}
                  ${stepState === 'pending' ? 'bg-[#e8e4df]' : ''}
                `}
              >
                {stepState !== 'pending' && (
                  <Check className="w-3.5 h-3.5 text-white" />
                )}
              </div>

              {/* Step label */}
              <span
                className={`
                  text-xs font-medium
                  ${stepState === 'current' ? 'text-[#2d2a26]' : ''}
                  ${stepState === 'completed' ? 'text-[#8b8680]' : ''}
                  ${stepState === 'pending' ? 'text-[#8b8680]/50' : ''}
                `}
              >
                {STATUS_LABELS[stepStatus]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Desktop: Horizontal layout */}
      <div className="hidden md:flex items-center justify-between gap-1">
        {STATUS_FLOW.map((stepStatus, index) => {
          const stepState = getStepState(stepStatus, currentIndex)

          return (
            <React.Fragment key={stepStatus}>
              {/* Step */}
              <div className="flex flex-col items-center gap-1.5 flex-1">
                {/* Step dot */}
                <div
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300
                    ${stepState === 'completed' ? 'bg-[#d4a574]' : ''}
                    ${stepState === 'current' ? 'bg-[#d4a574] ring-2 ring-[#f5f0eb]' : ''}
                    ${stepState === 'pending' ? 'bg-[#e8e4df]' : ''}
                  `}
                >
                  {stepState !== 'pending' && (
                    <Check className="w-3.5 h-3.5 text-white" />
                  )}
                </div>

                {/* Step label */}
                <span
                  className={`
                    text-[10px] font-medium text-center
                    ${stepState === 'current' ? 'text-[#2d2a26]' : ''}
                    ${stepState === 'completed' ? 'text-[#8b8680]' : ''}
                    ${stepState === 'pending' ? 'text-[#8b8680]/50' : ''}
                  `}
                >
                  {STATUS_LABELS[stepStatus]}
                </span>
              </div>

              {/* Connector line */}
              {index < STATUS_FLOW.length - 1 && (
                <div className="flex-1 h-0.5 bg-[#e8e4df] rounded-full overflow-hidden -mt-4">
                  <div
                    className="h-full bg-[#d4a574] transition-all duration-500 ease-out"
                    style={{ width: stepState === 'completed' ? '100%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
