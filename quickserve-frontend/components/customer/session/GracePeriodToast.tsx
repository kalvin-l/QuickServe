/**
 * Grace Period Toast Component
 *
 * Shows countdown toast during grace period before session pause.
 * Offers "Keep Alive" button to extend the grace period.
 *
 * Phase 5: UI/UX Polish - Smart Contextual End
 */

import React, { useEffect, useState, useMemo } from 'react'
import { AlertTriangle, Clock, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCustomerSession } from '@/features/customer-session'

interface GracePeriodToastProps {
  className?: string
  onKeepAlive?: () => Promise<void>
}

export function GracePeriodToast({
  className,
  onKeepAlive,
}: GracePeriodToastProps) {
  const { status, gracePeriodEnd, keepAlive } = useCustomerSession()
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isExtending, setIsExtending] = useState(false)
  const [visible, setVisible] = useState(false)

  // Calculate time remaining in grace period
  useEffect(() => {
    if (status !== 'pausing' || !gracePeriodEnd) {
      setTimeRemaining(0)
      setVisible(false)
      return
    }

    // Only show toast when less than 2 minutes remaining
    const TWO_MINUTES = 2 * 60 * 1000
    const now = new Date()
    const remaining = Math.max(0, gracePeriodEnd.getTime() - now.getTime())

    if (remaining > TWO_MINUTES) {
      setVisible(false)
      setTimeRemaining(remaining)
      return
    }

    setVisible(true)
    setTimeRemaining(remaining)

    const interval = setInterval(() => {
      const newRemaining = Math.max(0, gracePeriodEnd.getTime() - new Date().getTime())
      setTimeRemaining(newRemaining)

      if (newRemaining <= 0) {
        setVisible(false)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [status, gracePeriodEnd])

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const isUrgent = timeRemaining < 60000 // Less than 1 minute

  const handleKeepAlive = async () => {
    setIsExtending(true)
    try {
      if (onKeepAlive) {
        await onKeepAlive()
      } else {
        await keepAlive()
      }
      // Toast will hide when grace period is extended
    } catch (error) {
      console.error('Failed to extend grace period:', error)
    } finally {
      setIsExtending(false)
    }
  }

  if (!visible) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed top-24 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50',
        'animate-in slide-in-from-top-4 duration-300',
        className
      )}
    >
      <div
        className={cn(
          'rounded-xl shadow-lg p-4',
          'bg-gradient-to-r',
          isUrgent
            ? 'from-red-500 to-red-600 text-white'
            : 'from-orange-500 to-amber-500 text-white'
        )}
      >
        {/* Content */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn('flex-shrink-0', isUrgent && 'animate-pulse')}>
            {isUrgent ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <Clock className="w-6 h-6" />
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">
              {isUrgent ? 'Session Ending Soon!' : 'Session Pausing'}
            </h3>
            <p className="text-sm opacity-90 mt-1">
              {isUrgent
                ? 'Your session will pause in less than 1 minute'
                : 'Your session will pause due to inactivity'}
            </p>

            {/* Countdown Timer */}
            <div className="mt-3 flex items-center gap-2">
              <div className="bg-white/20 rounded-lg px-3 py-1.5">
                <span className="text-2xl font-bold tabular-nums">
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <span className="text-sm">remaining</span>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleKeepAlive}
                disabled={isExtending}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg',
                  'bg-white text-orange-600 font-semibold',
                  'hover:bg-opacity-90 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isExtending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Extending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Keep Active
                  </>
                )}
              </button>
              <button
                onClick={() => setVisible(false)}
                className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setVisible(false)}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close toast"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact Grace Period Banner
 * For use in page headers
 */
export function GracePeriodBanner({
  className,
  onKeepAlive,
}: GracePeriodToastProps) {
  const { status, gracePeriodEnd, keepAlive } = useCustomerSession()
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isExtending, setIsExtending] = useState(false)

  useEffect(() => {
    if (status !== 'pausing' || !gracePeriodEnd) {
      setTimeRemaining(0)
      return
    }

    const calculateTimeRemaining = () => {
      const now = new Date()
      const remaining = Math.max(0, gracePeriodEnd.getTime() - now.getTime())
      setTimeRemaining(remaining)
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

  const isUrgent = timeRemaining < 60000

  const handleKeepAlive = async () => {
    setIsExtending(true)
    try {
      if (onKeepAlive) {
        await onKeepAlive()
      } else {
        await keepAlive()
      }
    } catch (error) {
      console.error('Failed to extend grace period:', error)
    } finally {
      setIsExtending(false)
    }
  }

  if (status !== 'pausing' || timeRemaining <= 0) {
    return null
  }

  return (
    <div
      className={cn(
        'w-full px-4 py-2',
        'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
        'flex items-center justify-between gap-4',
        isUrgent && 'animate-pulse',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">
          Session pausing in {formatTime(timeRemaining)}
        </span>
      </div>

      <button
        onClick={handleKeepAlive}
        disabled={isExtending}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium disabled:opacity-50"
      >
        {isExtending ? (
          <>
            <RefreshCw className="w-3 h-3 animate-spin" />
            Extending...
          </>
        ) : (
          <>
            <RefreshCw className="w-3 h-3" />
            Keep Active
          </>
        )}
      </button>
    </div>
  )
}
