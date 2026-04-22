'use client'

import React, { useEffect, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface BottomSheetProps {
  show: boolean
  onClose: () => void
  children: ReactNode
  maxHeight?: string
  closeOnBackdropClick?: boolean
}

/**
 * BottomSheet - Mobile bottom sheet that slides up from bottom
 * Like delivery apps (QuickServe style)
 */
export default function BottomSheet({
  show,
  onClose,
  children,
  maxHeight = '80vh',
  closeOnBackdropClick = true,
}: BottomSheetProps) {
  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show && closeOnBackdropClick) {
        onClose()
      }
    },
    [show, closeOnBackdropClick, onClose]
  )

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose()
      }
    },
    [closeOnBackdropClick, onClose]
  )

  // Add/remove escape key listener
  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [handleEscape])

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [show])

  if (!show) return null

  const content = (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 transition-opacity duration-300',
          show ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl',
          'transform transition-transform duration-300 ease-out',
          show ? 'translate-y-0' : 'translate-y-full',
          'max-h-[90vh] flex flex-col'
        )}
        style={{ maxHeight }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-surface-300 rounded-full" />
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )

  return typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : content
}
