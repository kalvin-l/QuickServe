'use client'

import React from 'react'
import { List, Users } from 'lucide-react'

export type OrderFilterType = 'all' | 'active' | 'completed' | 'cancelled'
export type ViewModeType = 'flat' | 'grouped'

interface OrderFiltersProps {
  activeFilter: OrderFilterType
  onFilterChange: (filter: OrderFilterType) => void
  counts?: {
    all: number
    active: number
    completed: number
    cancelled: number
    groupSessions?: number
  }
  viewMode?: ViewModeType
  onViewModeChange?: (mode: ViewModeType) => void
  hasGroupOrders?: boolean
}

const FILTERS: Array<{
  key: OrderFilterType
  label: string
}> = [
  { key: 'all', label: 'All Orders' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default function OrderFilters({
  activeFilter,
  onFilterChange,
  counts,
  viewMode = 'flat',
  onViewModeChange,
  hasGroupOrders = false,
}: OrderFiltersProps) {
  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      {hasGroupOrders && onViewModeChange && (
        <div className="flex items-center justify-end">
          <div className="inline-flex items-center gap-1 bg-[#f5f0eb] rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('flat')}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                ${viewMode === 'flat'
                  ? 'bg-white text-[#2d2a26] shadow-sm'
                  : 'text-[#8b8680] hover:text-[#5c5752]'
                }
              `}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => onViewModeChange('grouped')}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                ${viewMode === 'grouped'
                  ? 'bg-white text-[#2d2a26] shadow-sm'
                  : 'text-[#8b8680] hover:text-[#5c5752]'
                }
              `}
            >
              <Users className="w-3.5 h-3.5" />
              Grouped
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs - Scrollable on mobile */}
      <div className="flex items-center gap-1 border-b border-[#e8e4df]/60 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key
          const count = counts?.[filter.key] ?? 0

          return (
            <button
              key={filter.key}
              onClick={() => onFilterChange(filter.key)}
              className={`
                relative flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all duration-200 shrink-0 whitespace-nowrap
                ${isActive
                  ? 'text-[#2d2a26]'
                  : 'text-[#8b8680] hover:text-[#5c5752]'
                }
              `}
            >
              <span>{filter.label}</span>
              <span
                className={`
                  text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                  ${isActive
                    ? 'bg-[#d4a574] text-white'
                    : 'bg-[#f5f0eb] text-[#8b8680]'
                  }
                `}
              >
                {count > 99 ? '99+' : count}
              </span>

              {/* Active indicator */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4a574] rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function calculateFilterCounts(
  totalOrders: number,
  activeOrders: number,
  completedOrders: number,
  cancelledOrders: number,
  groupSessions?: number
) {
  return {
    all: totalOrders,
    active: activeOrders,
    completed: completedOrders,
    cancelled: cancelledOrders,
    groupSessions: groupSessions ?? 0,
  }
}
