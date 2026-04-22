/**
 * View Details Modal Component
 * Modal for viewing detailed information about an inventory item
 */

'use client'

import { Package, AlertTriangle, CheckCircle, XCircle, Calendar, Scale, Box, Utensils, Clock } from 'lucide-react'
import AdminModal from '@/components/admin/ui/AdminModal'
import type { InventoryItem } from '@/types/inventory'
import { getStockStatusConfig, formatStockQuantity, STOCK_UNITS_BY_TYPE } from '@/types/inventory'

interface ViewDetailsModalProps {
  show: boolean
  item: InventoryItem | null
  onClose: () => void
}

export function ViewDetailsModal({
  show,
  item,
  onClose,
}: ViewDetailsModalProps) {
  if (!item) return null

  const statusConfig = getStockStatusConfig(item.stock_level?.status || item.stock_status)

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Get status icon
  const getStatusIcon = () => {
    switch (item.stock_level?.status || item.stock_status) {
      case 'in_stock':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'low_stock':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />
      case 'out_of_stock':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Package className="w-5 h-5 text-gray-500" />
    }
  }

  // Calculate stock level percentage
  const stockPercentage = item.stock_level?.percentage || item.stock_level_percentage || 0

  // Calculate stock color
  const getStockColor = () => {
    if (stockPercentage >= 50) return 'bg-[#22c55e]'
    if (stockPercentage >= 20) return 'bg-[#f59e0b]'
    return 'bg-[#ef4444]'
  }

  return (
    <AdminModal show={show && !!item} title="" onClose={onClose} maxWidth="4xl">
      <div className="h-full flex flex-col">
        {/* Header Section */}
        <div className="flex gap-6 pb-6 border-b border-[#e8e4df]/60 mb-6">
          {/* Item Image */}
          <div className="shrink-0">
            <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-[#d4a574]/20 to-[#d4a574]/5 flex items-center justify-center border border-[#e8e4df]/60 shadow-sm">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <Utensils className="w-20 h-20 text-[#d4a574]/60" />
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-2xl font-bold text-[#2d2a26] mb-1">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-[#8b8680] max-w-md">{item.description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 rounded-full bg-[#faf9f7] hover:bg-[#e8e4df] flex items-center justify-center text-[#8b8680] hover:text-[#2d2a26] transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${statusConfig.bg} ${statusConfig.color}`}
              >
                {getStatusIcon()}
                {statusConfig.label}
              </span>
              {item.needs_reorder && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#fef3c7] text-[#f59e0b] border border-[#f59e0b]/20">
                  <AlertTriangle className="w-4 h-4" />
                  Needs Reorder
                </span>
              )}
              {item.container_type && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#e0f2fe] text-[#0284c7] border border-[#0284c7]/20">
                  <Box className="w-4 h-4" />
                  Container Tracking
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid - Two Column Layout for Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Stock Information Card */}
            <div className="bg-gradient-to-br from-[#f8f5ef] to-[#f0e9e4] rounded-2xl border border-[#e8e4df]/60 overflow-hidden">
              <div className="px-5 py-3 bg-[#2d2a26]/5 border-b border-[#e8e4df]/40">
                <h4 className="text-sm font-bold text-[#5c5752] uppercase tracking-wide flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Stock Information
                </h4>
              </div>

              <div className="p-5 space-y-4">
                {/* Current Stock - Featured */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-[#8b8680] uppercase tracking-wide mb-1">Current Stock</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-[#2d2a26]">
                          {item.stock_quantity.toLocaleString()}
                        </span>
                        <span className="text-sm text-[#8b8680]">{item.stock_unit}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#8b8680] mb-1">Level</div>
                      <div className="text-2xl font-bold" style={{ color: stockPercentage >= 50 ? '#22c55e' : stockPercentage >= 20 ? '#f59e0b' : '#ef4444' }}>
                        {stockPercentage.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Stock Level Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-[#e8e4df] rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${getStockColor()} transition-all`}
                        style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Stock Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/80 rounded-xl p-3 text-center">
                    <div className="text-xs text-[#8b8680] mb-1">Low Stock At</div>
                    <div className="text-lg font-bold text-[#f59e0b]">
                      {item.low_stock_threshold}
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-xl p-3 text-center">
                    <div className="text-xs text-[#8b8680] mb-1">Reorder At</div>
                    <div className="text-lg font-bold text-[#2d2a26]">
                      {item.reorder_level}
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-xl p-3 text-center">
                    <div className="text-xs text-[#8b8680] mb-1">Reorder Qty</div>
                    <div className="text-lg font-bold text-[#22c55e]">
                      {item.reorder_quantity}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Container Information (if applicable) */}
            {item.container_type && item.container_capacity && (
              <div className="bg-gradient-to-br from-[#e0f2fe] to-[#bae6fd] rounded-2xl border border-[#bae6fd]/60 overflow-hidden">
                <div className="px-5 py-3 bg-[#0284c7]/10 border-b border-[#bae6fd]/40">
                  <h4 className="text-sm font-bold text-[#5c5752] uppercase tracking-wide flex items-center gap-2">
                    <Box className="w-4 h-4 text-[#0284c7]" />
                    Container Tracking
                  </h4>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/80 rounded-xl p-4 text-center">
                      <div className="text-xs text-[#8b8680] mb-2">Type</div>
                      <div className="text-xl font-bold text-[#0284c7]">{item.container_type}</div>
                    </div>

                    <div className="bg-white/80 rounded-xl p-4 text-center">
                      <div className="text-xs text-[#8b8680] mb-2">Capacity</div>
                      <div className="text-xl font-bold text-[#2d2a26]">
                        {item.container_capacity.toLocaleString()} {item.stock_unit}
                      </div>
                    </div>

                    <div className="bg-white/80 rounded-xl p-4 text-center">
                      <div className="text-xs text-[#8b8680] mb-2">Total Containers</div>
                      <div className="text-xl font-bold text-[#2d2a26]">
                        {item.container_count ?? 0}
                      </div>
                    </div>
                  </div>

                  {item.container_count && item.container_capacity && (
                    <div className="mt-4 bg-[#0284c7]/10 rounded-xl p-4 text-center border border-[#0284c7]/20">
                      <div className="text-xs text-[#8b8680] mb-1">Total Volume in Containers</div>
                      <div className="text-2xl font-bold text-[#0284c7]">
                        {(item.container_count * item.container_capacity).toLocaleString()} {item.stock_unit}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Category & Unit Information */}
            <div className="bg-[#faf9f7] rounded-2xl border border-[#e8e4df]/60 overflow-hidden">
              <div className="px-5 py-3 bg-[#2d2a26]/5 border-b border-[#e8e4df]/40">
                <h4 className="text-sm font-bold text-[#5c5752] uppercase tracking-wide flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Classification
                </h4>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-[#e8e4df]/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#d4a574]/10 flex items-center justify-center">
                      <Utensils className="w-5 h-5 text-[#d4a574]" />
                    </div>
                    <div>
                      <div className="text-xs text-[#8b8680] uppercase tracking-wide">Category</div>
                      <div className="text-base font-semibold text-[#2d2a26]">
                        {item.category?.name || 'Uncategorized'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#d4a574]/10 flex items-center justify-center">
                      <Scale className="w-5 h-5 text-[#d4a574]" />
                    </div>
                    <div>
                      <div className="text-xs text-[#8b8680] uppercase tracking-wide">Unit Type</div>
                      <div className="text-base font-semibold text-[#2d2a26]">
                        {item.unit_display || item.stock_unit}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Information */}
            <div className="bg-[#faf9f7] rounded-2xl border border-[#e8e4df]/60 overflow-hidden">
              <div className="px-5 py-3 bg-[#2d2a26]/5 border-b border-[#e8e4df]/40">
                <h4 className="text-sm font-bold text-[#5c5752] uppercase tracking-wide flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timeline
                </h4>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[#e8e4df]/30">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-[#8b8680]" />
                    <span className="text-sm text-[#8b8680]">Last Restocked</span>
                  </div>
                  <span className="text-sm font-semibold text-[#2d2a26]">
                    {formatDate(item.last_restocked_at)}
                  </span>
                </div>

                {item.days_since_restock !== undefined && item.days_since_restock !== null && (
                  <div className="flex items-center justify-between py-2 border-b border-[#e8e4df]/30">
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 text-[#8b8680]" />
                      <span className="text-sm text-[#8b8680]">Days Since Restock</span>
                    </div>
                    <span className={`text-sm font-bold px-2 py-1 rounded-lg ${
                      item.days_since_restock > 30 ? 'bg-red-100 text-red-600' :
                      item.days_since_restock > 14 ? 'bg-orange-100 text-orange-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {item.days_since_restock} days
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-[#e8e4df]/30">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-[#8b8680]" />
                    <span className="text-sm text-[#8b8680]">Created</span>
                  </div>
                  <span className="text-sm font-semibold text-[#2d2a26]">
                    {formatDate(item.created_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-[#8b8680]" />
                    <span className="text-sm text-[#8b8680]">Last Updated</span>
                  </div>
                  <span className="text-sm font-semibold text-[#2d2a26]">
                    {formatDate(item.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex justify-end gap-3 pt-5 border-t border-[#e8e4df]/60 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-white text-[#5c5752] hover:bg-[#faf9f7] hover:border-[#d4a574] transition-all font-medium shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </AdminModal>
  )
}
