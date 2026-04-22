'use client'

/**
 * CartSummary Component
 *
 * Display cart totals
 */

import React from 'react'
import { formatPrice } from '@/lib/utils'

interface CartSummaryProps {
  subtotal: number
  tax: number
  total: number
  meetsMinimumOrder: boolean
}

export default function CartSummary({
  subtotal,
  tax,
  total,
  meetsMinimumOrder,
}: CartSummaryProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-surface-100">
      <h2 className="text-lg font-bold font-display text-surface-900 mb-4">
        Order Summary
      </h2>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-surface-600">Subtotal</span>
          <span className="font-semibold text-surface-900">{formatPrice(subtotal)}</span>
        </div>

        {tax > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-surface-600">Tax</span>
            <span className="font-semibold text-surface-900">{formatPrice(tax)}</span>
          </div>
        )}

        <div className="border-t border-surface-100 pt-2 mt-2">
          <div className="flex justify-between">
            <span className="font-semibold text-surface-900">Total</span>
            <span className="text-xl font-bold text-primary">{formatPrice(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
