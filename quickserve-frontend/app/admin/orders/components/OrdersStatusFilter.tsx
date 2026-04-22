'use client'

import React from 'react'

export interface OrdersStatusFilterProps {
  activeStatus: string
  onStatusChange: (status: string) => void
}

/**
 * Status filter pills for Orders page
 * Options: All, Received, Preparing, Ready
 */
export default function OrdersStatusFilter({ activeStatus, onStatusChange }: OrdersStatusFilterProps) {
  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
      <button
        onClick={() => onStatusChange('all')}
        className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all ${
          activeStatus === 'all'
            ? 'bg-[#d4a574] text-white'
            : 'bg-[#f5f0eb] text-[#5c5752] hover:bg-[#ebe5de]'
        }`}
      >
        All
      </button>
      <button
        onClick={() => onStatusChange('received')}
        className={`px-4 py-2 rounded-full whitespace-nowrap transition-all flex items-center gap-2 ${
          activeStatus === 'received'
            ? 'bg-[#d4a574] text-white'
            : 'bg-[#f5f0eb] text-[#5c5752] hover:bg-[#ebe5de]'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
        Received
      </button>
      <button
        onClick={() => onStatusChange('preparing')}
        className={`px-4 py-2 rounded-full whitespace-nowrap transition-all flex items-center gap-2 ${
          activeStatus === 'preparing'
            ? 'bg-[#d4a574] text-white'
            : 'bg-[#f5f0eb] text-[#5c5752] hover:bg-[#ebe5de]'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse"></span>
        Preparing
      </button>
      <button
        onClick={() => onStatusChange('ready')}
        className={`px-4 py-2 rounded-full whitespace-nowrap transition-all flex items-center gap-2 ${
          activeStatus === 'ready'
            ? 'bg-[#d4a574] text-white'
            : 'bg-[#f5f0eb] text-[#5c5752] hover:bg-[#ebe5de]'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-[#a855f7]"></span>
        Ready
      </button>
    </div>
  )
}
