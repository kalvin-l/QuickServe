/**
 * Inventory Stats Component
 * Statistics cards showing inventory overview
 */

'use client'

import { Package, CheckCircle, AlertTriangle, XCircle, Box } from 'lucide-react'

interface InventoryStatsProps {
  totalItems?: number
  inStockCount?: number
  lowStockCount?: number
  outOfStockCount?: number
  totalValue?: number
  containerItemsCount?: number
}

export function InventoryStats({
  totalItems = 0,
  inStockCount = 0,
  lowStockCount = 0,
  outOfStockCount = 0,
  totalValue = 0,
  containerItemsCount = 0,
}: InventoryStatsProps) {
  const formatValue = (value: number) => {
    return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Items */}
        <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-[#e8e4df]/60 flex items-center gap-4">
          <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10"></div>
          <div className="p-3 rounded-full bg-[#f5f0eb] text-[#d4a574]">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-[#8b8680] uppercase font-bold tracking-[0.15em]">Total Items</p>
            <p className="text-2xl font-bold text-[#2d2a26] tracking-tight">{totalItems}</p>
          </div>
        </div>

        {/* In Stock */}
        <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-[#e8e4df]/60 flex items-center gap-4">
          <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#22c55e]/5 rounded-2xl -z-10"></div>
          <div className="p-3 rounded-full bg-[#f0fdf4] text-[#22c55e]">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-[#8b8680] uppercase font-bold tracking-[0.15em]">In Stock</p>
            <p className="text-2xl font-bold text-[#2d2a26] tracking-tight">{inStockCount}</p>
          </div>
        </div>

        {/* Low Stock */}
        <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-[#e8e4df]/60 flex items-center gap-4">
          <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#f59e0b]/5 rounded-2xl -z-10"></div>
          <div className="p-3 rounded-full bg-[#fef3c7] text-[#f59e0b]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-[#8b8680] uppercase font-bold tracking-[0.15em]">Low Stock</p>
            <p className="text-2xl font-bold text-[#2d2a26] tracking-tight">{lowStockCount}</p>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-[#e8e4df]/60 flex items-center gap-4">
          <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#ef4444]/5 rounded-2xl -z-10"></div>
          <div className="p-3 rounded-full bg-[#fef2f2] text-[#ef4444]">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-[#8b8680] uppercase font-bold tracking-[0.15em]">Out of Stock</p>
            <p className="text-2xl font-bold text-[#2d2a26] tracking-tight">{outOfStockCount}</p>
          </div>
        </div>
      </div>

      {/* Container Tracking Stat */}
      {containerItemsCount > 0 && (
        <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-[#d4a574]/40 flex items-center gap-4">
          <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10"></div>
          <div className="p-3 rounded-full bg-[#f5f0eb] text-[#d4a574]">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-[#8b8680] uppercase font-bold tracking-[0.15em]">📦 With Containers</p>
            <p className="text-2xl font-bold text-[#2d2a26] tracking-tight">{containerItemsCount}</p>
          </div>
        </div>
      )}
    </div>
  )
}
