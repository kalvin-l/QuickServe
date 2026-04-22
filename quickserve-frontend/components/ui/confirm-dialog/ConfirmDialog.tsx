'use client'

import React from 'react'
import Modal from '@/components/ui/modal/Modal'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const variantStyles = {
    danger: {
      confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
      icon: 'text-red-600 bg-red-50'
    },
    warning: {
      confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white',
      icon: 'text-amber-600 bg-amber-50'
    },
    info: {
      confirmBtn: 'bg-[#d4a574] hover:bg-[#c49464] text-white',
      icon: 'text-[#d4a574] bg-[#f5f0eb]'
    }
  }

  const styles = variantStyles[variant]

  return (
    <Modal show={isOpen} onClose={onClose} maxWidth="sm">
      <div className="bg-[#faf9f7]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e8e4df]/60 bg-white">
          <h3 className="text-lg font-semibold text-[#2d2a26] tracking-tight">
            {title}
          </h3>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-[#5c5752]">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-[#e8e4df]/60 bg-white flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-[#5c5752] hover:text-[#2d2a26] hover:bg-[#faf9f7] rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all active:scale-[0.98] ${styles.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}
