/**
 * Restock Modal Component
 * Modal for restocking items to reorder quantity level
 */

'use client'

import { useState } from 'react'
import AdminModal from '@/components/admin/ui/AdminModal'
import { Package } from 'lucide-react'
import type { InventoryItem } from '@/types/inventory'
import { formatStockQuantity } from '@/types/inventory'

interface RestockModalProps {
  show: boolean
  item: InventoryItem | null
  onClose: () => void
  onConfirm: (quantity?: number) => Promise<void>
  isLoading?: boolean
}

export function RestockModal({
  show,
  item,
  onClose,
  onConfirm,
  isLoading = false,
}: RestockModalProps) {
  const [useCustom, setUseCustom] = useState(false)
  const [customQuantity, setCustomQuantity] = useState(0)

  const handleClose = () => {
    setUseCustom(false)
    setCustomQuantity(0)
    onClose()
  }

  const handleConfirm = async () => {
    if (!item) return
    const quantity = useCustom ? customQuantity : undefined
    await onConfirm(quantity)
    handleClose()
  }

  const isInvalid = useCustom && customQuantity <= 0

  return (
    <AdminModal show={show && !!item} title="Restock Item" onClose={handleClose} maxWidth="md">
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
            <div className="flex-1">
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
            <div className="text-right">
              <p className="text-xs text-[#8b8680]">Reorder Point</p>
              <p className="text-sm font-medium text-[#f59e0b]">{item.reorder_level} {item.stock_unit}</p>
            </div>
          </div>

          {/* Restock Options */}
          <div>
            <label className="block text-sm font-medium text-[#2d2a26] mb-3">
              Restock Quantity
            </label>

            {/* Default Option */}
            <button
              onClick={() => setUseCustom(false)}
              className={`w-full p-4 rounded-xl border transition-all mb-3 text-left ${
                !useCustom
                  ? 'border-[#d4a574] bg-[#f5f0eb] ring-2 ring-[#d4a574]/20'
                  : 'border-[#e8e4df]/60 bg-white hover:bg-[#faf9f7]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${!useCustom ? 'bg-[#d4a574] text-white' : 'bg-[#e8e4df]/30 text-[#8b8680]'}`}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-[#2d2a26]">Use Reorder Quantity</p>
                    <p className="text-xs text-[#8b8680]">Add {item.reorder_quantity} {item.stock_unit}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#8b8680]">New Stock</p>
                  <p className="font-semibold text-[#2d2a26]">
                    {item.stock_quantity + item.reorder_quantity} {item.stock_unit}
                    {item.container_count !== null && item.container_count !== undefined && item.container_capacity && (
                      <span className="text-[#d4a574] text-xs ml-1">
                        ({((item.stock_quantity + item.reorder_quantity) / item.container_capacity).toFixed(2)} {item.container_type}
                        {((item.stock_quantity + item.reorder_quantity) / item.container_capacity) !== 1 ? 'es' : ''})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </button>

            {/* Custom Option */}
            <button
              onClick={() => setUseCustom(true)}
              className={`w-full p-4 rounded-xl border transition-all text-left ${
                useCustom
                  ? 'border-[#d4a574] bg-[#f5f0eb] ring-2 ring-[#d4a574]/20'
                  : 'border-[#e8e4df]/60 bg-white hover:bg-[#faf9f7]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#2d2a26]">Custom Quantity</p>
                  <p className="text-xs text-[#8b8680]">Enter a custom amount</p>
                </div>
              </div>
            </button>

            {/* Custom Quantity Input */}
            {useCustom && (
              <div className="mt-3">
                <input
                  type="number"
                  value={customQuantity || ''}
                  onChange={(e) => setCustomQuantity(parseInt(e.target.value) || 0)}
                  min={1}
                  placeholder={`Enter quantity in ${item.stock_unit}`}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#e8e4df]/60 bg-white text-[#2d2a26] placeholder:text-[#8b8680] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all"
                />
                {customQuantity > 0 && (
                  <p className="text-sm text-[#8b8680] mt-2">
                    New Stock: {item.stock_quantity + customQuantity} {item.stock_unit}
                    {item.container_count !== null && item.container_count !== undefined && item.container_capacity && (
                      <span className="text-[#d4a574] ml-1">
                        ({((item.stock_quantity + customQuantity) / item.container_capacity).toFixed(2)} {item.container_type}
                        {((item.stock_quantity + customQuantity) / item.container_capacity) !== 1 ? 'es' : ''})
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
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
              className="px-4 py-2 rounded-lg bg-[#22c55e] text-white hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'Processing...' : 'Confirm Restock'}
            </button>
          </div>
        </div>
      )}
    </AdminModal>
  )
}
