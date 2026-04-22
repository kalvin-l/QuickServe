/**
 * Session Status Indicator Component
 *
 * Displays the current session status with visual indicators.
 * Shows connection state, grace period countdown, and warnings.
 *
 * Phase 5: UI/UX Polish - Smart Contextual End
 */

import React, { useEffect, useState, useMemo } from 'react'
import { Wifi, WifiOff, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { useCustomerSession, SessionStatus } from '@/features/customer-session'
import { cn } from '@/lib/utils'

interface SessionStatusIndicatorProps {
  className?: string
  showText?: boolean
  compact?: boolean
}

export function SessionStatusIndicator({
  className,
  showText = true,
  compact = false,
}: SessionStatusIndicatorProps) {
  const { status, isReconnecting, gracePeriodEnd } = useCustomerSession()

  // Calculate time remaining in grace period
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isUrgent, setIsUrgent] = useState(false)

  useEffect(() => {
    if (status !== 'pausing' || !gracePeriodEnd) {
      setTimeRemaining(0)
      setIsUrgent(false)
      return
    }

    const calculateTimeRemaining = () => {
      const now = new Date()
      const remaining = Math.max(0, gracePeriodEnd.getTime() - now.getTime())
      setTimeRemaining(remaining)
      setIsUrgent(remaining < 60000) // Less than 1 minute
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [status, gracePeriodEnd])

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Get status configuration
  const statusConfig = useMemo(() => {
    switch (status) {
      case 'active':
        return {
          icon: CheckCircle,
          color: 'bg-emerald-500',
          textColor: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          label: 'Connected',
          pulse: false,
        }
      case 'idle':
      case 'reconnecting':
        return {
          icon: isReconnecting ? WifiOff : Clock,
          color: 'bg-amber-500',
          textColor: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          label: isReconnecting ? 'Reconnecting...' : 'Idle',
          pulse: true,
        }
      case 'pausing':
        return {
          icon: AlertTriangle,
          color: isUrgent ? 'bg-red-500' : 'bg-orange-500',
          textColor: isUrgent ? 'text-red-600' : 'text-orange-600',
          bgColor: isUrgent ? 'bg-red-50' : 'bg-orange-50',
          borderColor: isUrgent ? 'border-red-200' : 'border-orange-200',
          label: timeRemaining > 0 ? `Pausing: ${formatTime(timeRemaining)}` : 'Pausing...',
          pulse: true,
        }
      case 'paused':
        return {
          icon: Clock,
          color: 'bg-blue-500',
          textColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Paused',
          pulse: false,
        }
      case 'ended':
        return {
          icon: WifiOff,
          color: 'bg-gray-500',
          textColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Ended',
          pulse: false,
        }
      default:
        return {
          icon: WifiOff,
          color: 'bg-gray-500',
          textColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Unknown',
          pulse: false,
        }
    }
  }, [status, isReconnecting, timeRemaining, isUrgent])

  const Icon = statusConfig.icon

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className={cn('relative', statusConfig.pulse && 'animate-pulse')}>
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              statusConfig.color,
              statusConfig.pulse && 'ring-2 ring-offset-1 ring-current'
            )}
          />
        </div>
        {showText && (
          <span className={cn('text-xs font-medium', statusConfig.textColor)}>
            {statusConfig.label}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border',
        statusConfig.bgColor,
        statusConfig.borderColor,
        statusConfig.pulse && 'animate-pulse',
        className
      )}
    >
      <Icon className={cn('w-4 h-4', statusConfig.textColor)} />
      {showText && (
        <span className={cn('text-sm font-medium', statusConfig.textColor)}>
          {statusConfig.label}
        </span>
      )}
    </div>
  )
}

/**
 * Floating Session Status Indicator
 * Shows as a floating element in the corner of the screen
 */
export function FloatingSessionStatus() {
  return (
    <div className="fixed top-20 right-4 z-40">
      <SessionStatusIndicator className="shadow-lg" />
    </div>
  )
}
