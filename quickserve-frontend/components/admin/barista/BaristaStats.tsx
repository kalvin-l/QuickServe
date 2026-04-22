'use client'

import { Receipt, Blend, CheckCircle, AlertTriangle } from 'lucide-react'

interface BaristaStatsProps {
  stats: {
    queued: number
    preparing: number
    ready: number
    overdue: number
  }
}

export default function BaristaStats({ stats }: BaristaStatsProps) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 gap-1.5 sm:gap-3 mb-3 sm:mb-6 shrink-0">
      {/* Queued */}
      <div className="relative bg-white rounded-lg sm:rounded-xl border border-[#e8e4df]/60 p-2 sm:p-4">
        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-lg sm:rounded-xl -z-10"></div>
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-medium text-[#8b8680] uppercase tracking-wide truncate">
              <span className="sm:hidden">Queued</span>
              <span className="hidden sm:inline">To Prep</span>
            </p>
            <p className="text-xl sm:text-2xl font-bold text-[#2d2a26] mt-0.5 sm:mt-1">{stats.queued}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#f5f0eb] rounded-lg flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-[#8b8680]" />
          </div>
        </div>
      </div>

      {/* Preparing */}
      <div className="relative bg-white rounded-lg sm:rounded-xl border border-[#e8e4df]/60 p-2 sm:p-4">
        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#f59e0b]/5 rounded-lg sm:rounded-xl -z-10"></div>
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-medium text-[#8b8680] uppercase tracking-wide truncate">Active</p>
            <p className="text-xl sm:text-2xl font-bold text-[#2d2a26] mt-0.5 sm:mt-1">{stats.preparing}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#fef3c7] rounded-lg flex items-center justify-center shrink-0">
            <Blend className="w-4 h-4 sm:w-5 sm:h-5 text-[#f59e0b]" />
          </div>
        </div>
      </div>

      {/* Ready */}
      <div className="relative bg-white rounded-lg sm:rounded-xl border border-[#e8e4df]/60 p-2 sm:p-4">
        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#22c55e]/5 rounded-lg sm:rounded-xl -z-10"></div>
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-medium text-[#8b8680] uppercase tracking-wide truncate">Ready</p>
            <p className="text-xl sm:text-2xl font-bold text-[#2d2a26] mt-0.5 sm:mt-1">{stats.ready}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#f0fdf4] rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#22c55e]" />
          </div>
        </div>
      </div>

      {/* Overdue */}
      <div className="relative bg-white rounded-lg sm:rounded-xl border border-[#e8e4df]/60 p-2 sm:p-4">
        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#ef4444]/5 rounded-lg sm:rounded-xl -z-10"></div>
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-medium text-[#8b8680] uppercase tracking-wide truncate">Late</p>
            <p className="text-xl sm:text-2xl font-bold text-[#ef4444] mt-0.5 sm:mt-1">{stats.overdue}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#fef2f2] rounded-lg flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-[#ef4444]" />
          </div>
        </div>
      </div>
    </div>
  )
}
