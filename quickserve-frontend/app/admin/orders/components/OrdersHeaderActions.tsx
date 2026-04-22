'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Search, Coffee, RefreshCw } from 'lucide-react'

export interface OrdersHeaderActionsProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onRefresh: () => void
}

/**
 * Header actions for Orders page
 * Contains search input, and action buttons (Barista Queue, Refresh)
 */
export default function OrdersHeaderActions({ searchQuery, onSearchChange, onRefresh }: OrdersHeaderActionsProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4 mb-6">
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <input
            type="search"
            placeholder="Search by order #, table, or item..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-[#faf9f7] text-[#2d2a26] placeholder:text-[#8b8680]/60 focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 w-64 text-sm transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8680]" />
        </div>

        {/* Action Buttons */}
        <button
          onClick={() => router.push('/admin/barista')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f59e0b] text-white font-medium hover:bg-[#d97706] transition-all"
        >
          <Coffee className="w-4 h-4" />
          <span>Barista Queue</span>
        </button>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2d2a26] text-white font-medium hover:bg-[#3d3a36] transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  )
}
