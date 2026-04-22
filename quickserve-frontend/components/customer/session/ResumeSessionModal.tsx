/**
 * Resume Session Modal Component
 *
 * Appears when customer returns with a paused session.
 * Shows options to resume, transfer to table, or start fresh.
 *
 * Phase 5: UI/UX Polish - Smart Contextual End
 */

import React from 'react'
import { AlertCircle, ShoppingCart, Clock, ArrowRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ResumableSession } from '@/features/customer-session'
import { useCustomerSession } from '@/features/customer-session/hooks/useCustomerSession'

interface ResumeSessionModalProps {
  session: ResumableSession
  onClose: () => void
  onTransfer?: (newTableId: number) => void
  onStartFresh?: () => void
}

export function ResumeSessionModal({
  session,
  onClose,
  onTransfer,
  onStartFresh,
}: ResumeSessionModalProps) {
  const { resumeSession } = useCustomerSession()

  const handleResume = async () => {
    try {
      await resumeSession(session.session_id)
      onClose()
    } catch (error) {
      console.error('Failed to resume session:', error)
    }
  }

  const handleTransfer = async () => {
    // Show table selection (can be extended to show available tables)
    // For now, we'll use the existing table
    onTransfer?.(session.table_id)
  }

  const handleStartFresh = () => {
    // Clear the paused session and start fresh
    onStartFresh?.()
    onClose()
  }

  const formatExpiryTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const hoursRemaining = Math.max(0, (date.getTime() - now.getTime()) / (1000 * 60 * 60))

    if (hoursRemaining < 1) {
      const minutes = Math.ceil(hoursRemaining * 60)
      return `${minutes} minute${minutes > 1 ? 's' : ''}`
    }
    return `${Math.ceil(hoursRemaining)} hour${Math.ceil(hoursRemaining) > 1 ? 's' : ''}`
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Resume Your Order?
            </h2>
            <p className="text-gray-500 mt-1">
              You have items from Table {session.table_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Cart Summary */}
        {session.has_cart && (
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {session.cart_item_count} {session.cart_item_count === 1 ? 'item' : 'items'}
                </p>
                <p className="text-sm text-gray-500">
                  Total: {formatCurrency(session.cart_total)}
                </p>
              </div>
            </div>

            {/* Sample items preview (optional - would need to fetch from API) */}
            <div className="border-t border-blue-200 pt-3">
              <p className="text-sm text-blue-600 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Expires in {formatExpiryTime(session.can_resume_until)}
              </p>
            </div>
          </div>
        )}

        {/* Warning if cart is empty */}
        {!session.has_cart && (
          <div className="bg-amber-50 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">
                  Cart was empty
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Your previous session had no items. Would you like to start fresh?
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Primary Action: Resume */}
          <button
            onClick={handleResume}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-5 h-5" />
            Resume Here
          </button>

          {/* Secondary Action: Transfer to different table */}
          {onTransfer && (
            <button
              onClick={handleTransfer}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl border border-gray-300 transition-colors"
            >
              Transfer to Table {session.table_number}
            </button>
          )}

          {/* Tertiary Action: Start fresh */}
          {onStartFresh && (
            <button
              onClick={handleStartFresh}
              className="w-full text-gray-500 hover:text-gray-700 font-medium py-2 px-4 transition-colors text-sm"
            >
              Start Fresh
            </button>
          )}
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-400 text-center mt-6">
          Session paused from {new Date(session.paused_at).toLocaleString()}
        </p>
      </div>
    </div>
  )
}

/**
 * Resume Session Modal Container
 * Manages display of resume modal for all resumable sessions
 */
export function ResumeSessionModalContainer() {
  const { resumableSessions, checkResumableSessions } = useCustomerSession()
  const [selectedSession, setSelectedSession] = React.useState<ResumableSession | null>(null)

  React.useEffect(() => {
    // Check for resumable sessions on mount
    checkResumableSessions()
  }, [checkResumableSessions])

  if (resumableSessions.length === 0 || !selectedSession) {
    return null
  }

  return (
    <ResumeSessionModal
      session={selectedSession}
      onClose={() => setSelectedSession(null)}
      onTransfer={(newTableId) => {
        // Handle transfer logic
        console.log('Transfer to table:', newTableId)
      }}
      onStartFresh={() => {
        // Handle start fresh logic
        console.log('Start fresh')
      }}
    />
  )
}
