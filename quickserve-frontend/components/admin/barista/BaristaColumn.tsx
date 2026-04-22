'use client'

import { LucideIcon } from 'lucide-react'

interface BaristaColumnProps {
  title: string
  count: number
  icon: LucideIcon
  countColor?: string
  isGrid?: boolean
  children: React.ReactNode
}

export default function BaristaColumn({
  title,
  count,
  icon: Icon,
  countColor = 'bg-[#e8e4df] text-[#5c5752]',
  isGrid = false,
  children
}: BaristaColumnProps) {
  return (
    <div className="flex flex-col min-h-0">
      {/* Column Header */}
      <div className="bg-white rounded-t-lg sm:rounded-t-xl border border-[#e8e4df]/60 border-b-0 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#8b8680] shrink-0" />
          <h2 className="font-bold text-sm sm:text-base text-[#2d2a26] truncate">{title}</h2>
        </div>
        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold ${countColor} shrink-0`}>
          {count}
        </span>
      </div>

      {/* Column Content */}
      <div className={`flex-1 bg-white rounded-b-lg sm:rounded-b-xl border border-[#e8e4df]/60 overflow-y-auto ${
        isGrid
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 p-2 sm:p-3'
          : 'space-y-2 sm:space-y-3 p-2 sm:p-3'
      }`}>
        {children}
      </div>
    </div>
  )
}
