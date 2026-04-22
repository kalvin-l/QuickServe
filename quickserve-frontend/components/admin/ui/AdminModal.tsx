'use client'

import React, { ReactNode, useEffect } from 'react'

export interface AdminModalProps {
  show: boolean
  onClose: () => void
  title?: string
  maxWidth?: string
  children: ReactNode
}

/**
 * AdminModal - Modal component for displaying details
 */
export default function AdminModal({
  show,
  onClose,
  title,
  maxWidth = '2xl',
  children
}: AdminModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        onClose()
      }
    }

    if (show) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [show, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [show])

  if (!show) return null

  const maxWidthClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative bg-white rounded-2xl shadow-xl ${maxWidthClasses[maxWidth] || maxWidthClasses['2xl']} w-full transform transition-all`}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 font-heading">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
          )}

          {/* Content */}
          <div className={title ? 'p-6' : 'p-6'}>{children}</div>
        </div>
      </div>
    </div>
  )
}
