/**
 * Stock Adjust Modal Component
 * Modal for adjusting stock quantity with reason and reference
 */

'use client'

import { useState } from 'react'
import AdminModal from '@/components/admin/ui/AdminModal'
import { Plus, Minus } from 'lucide-react'
import type { InventoryItem, StockAdjustmentReason } from '@/types/inventory'
import { STOCK_ADJUSTMENT_REASONS, formatStockQuantity } from '@/types/inventory'

interface StockAdjustModalProps {
  show: boolean
  item: InventoryItem | null
  onClose: () => void
  onConfirm: (adjustment: { quantity: number; reason: string; reference?: string }) => Promise<void>
  isLoading?: boolean
}

export function StockAdjustModal({
  show,
  item,
  onClose,
  onConfirm,
  isLoading = false,
}: StockAdjustModalProps) {
  const [adjustment, setAdjustment] = useState(0)
  const [reason, setReason] = useState<StockAdjustmentReason>('adjustment')
  const [reference, setReference] = useState('')

  // Reset form when item changes
  if (item && adjustment === 0 && reason === 'adjustment') {
    // Keep initial state
  }

  const handleClose = () => {
    setAdjustment(0)
    setReason('adjustment')
    setReference('')
    onClose()
  }

  const handleQuickAdjust = (amount: number) => {
    setAdjustment(prev => prev + amount)
  }

  const handleConfirm = async () => {
    if (!item) return
    await onConfirm({
      quantity: adjustment,
      reason: reason,
      reference: reference || undefined,
    })
    handleClose()
  }

  const isInvalid = adjustment === 0 || !reason

  return (
    <AdminModal show={show && !!item} title="Adjust Stock" onClose={handleClose} maxWidth="md">
      {item && (
        <div className="space-y-6">
          {/* Item Info */}
          <div className="flex items-center gap-4 p-4 bg-[#faf9f7] rounded-xl">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h3 className="font-semibold text-[#2d2a26]">{item.name}</h3>
              <p className="text-sm text-[#8b8680]">
                Current Stock: {formatStockQuantity(item.stock_quantity, item.stock_unit)}
                {item.container_count !== null && item.container_count !== undefined && (
                  <span className="text-[#d4a574] ml-1">
                    ({item.container_count} {item.container_type}{item.container_count !== 1 ? 'es' : ''})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Adjustment Input */}
          <div>
            <label className="block text-sm font-medium text-[#2d2a26] mb-2">
              Adjustment Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleQuickAdjust(-1)}
                className="p-2 rounded-lg border border-[#e8e4df]/60 bg-white text-[#5c5752] hover:bg-[#faf9f7] transition-all"
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                type="number"
                value={adjustment}
                onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
                className="flex-1 px-4 py-2 text-center rounded-lg border border-[#e8e4df]/60 bg-white text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all"
                placeholder="0"
              />
              <button
                onClick={() => handleQuickAdjust(1)}
                className="p-2 rounded-lg border border-[#e8e4df]/60 bg-white text-[#5c5752] hover:bg-[#faf9f7] transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
              <span className="text-sm text-[#8b8680] w-20">
                {item.stock_unit}
              </span>
            </div>
            <p className="text-xs text-[#8b8680] mt-1">
              New Stock: {item.stock_quantity + adjustment} {item.stock_unit}
              {item.container_count !== null && item.container_count !== undefined && item.container_capacity && (
                <span className="text-[#d4a574] ml-1">
                  ({((item.stock_quantity + adjustment) / item.container_capacity).toFixed(2)} {item.container_type}
                  {((item.stock_quantity + adjustment) / item.container_capacity) !== 1 ? 'es' : ''})
                </span>
              )}
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-[#2d2a26] mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as StockAdjustmentReason)}
              className="w-full px-4 py-2.5 rounded-lg border border-[#e8e4df]/60 bg-white text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all"
            >
              {STOCK_ADJUSTMENT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} - {r.description}
                </option>
              ))}
            </select>
          </div>

          {/* Reference (Optional) */}
          <div>
            <label className="block text-sm font-medium text-[#2d2a26] mb-2">
              Reference Number <span className="text-[#8b8680]">(Optional)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., Order #12345, Invoice #INV-001"
              className="w-full px-4 py-2.5 rounded-lg border border-[#e8e4df]/60 bg-white text-[#2d2a26] placeholder:text-[#8b8680] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#e8e4df]/60">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-[#e8e4df]/60 bg-white text-[#5c5752] hover:bg-[#faf9f7] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isInvalid || isLoading}
              className="px-4 py-2 rounded-lg bg-[#d4a574] text-white hover:bg-[#c49a6b] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'Processing...' : 'Confirm Adjustment'}
            </button>
          </div>
        </div>
      )}
    </AdminModal>
  )
}
