'use client'

import { LayoutGrid, List } from 'lucide-react'
import { ViewMode } from '../hooks/useMenuManagement'

interface MenuStatusBarProps {
  totalItems: number
  filteredItems: number
  searchQuery: string
  categoryFilter: string
  availabilityFilter: 'all' | 'available' | 'unavailable' | 'featured' | 'popular'
  categoryName?: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function MenuStatusBar({
  totalItems,
  filteredItems,
  searchQuery,
  categoryFilter,
  availabilityFilter,
  categoryName,
  viewMode,
  onViewModeChange,
}: MenuStatusBarProps) {
  const isFiltering =
    searchQuery || categoryFilter !== 'all' || availabilityFilter !== 'all'

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="text-sm text-[#5c5752]">
        {!isFiltering ? (
          <span>Showing all {totalItems} items</span>
        ) : (
          <span>
            Showing {filteredItems} of {totalItems} items
            {searchQuery && (
              <span className="font-medium text-[#d4a574]">
                {' '}
                for &quot;{searchQuery}&quot;
              </span>
            )}
            {categoryFilter !== 'all' && (
              <span className="font-medium"> in {categoryName}</span>
            )}
            {availabilityFilter !== 'all' && (
              <span className="font-medium">
                {' '}
                (
                {availabilityFilter === 'available'
                  ? 'available only'
                  : 'out of stock only'}
                )
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <select className="px-3 py-1.5 rounded-lg border border-[#e8e4df]/60 bg-white text-sm text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all">
          <option>Sort by: Name</option>
          <option>Sort by: Price</option>
          <option>Sort by: Popular</option>
          <option>Sort by: Recent</option>
        </select>
        <div className="flex items-center gap-1 border border-[#e8e4df]/60 rounded-xl p-1">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-[#d4a574] text-white'
                : 'text-[#8b8680] hover:bg-[#faf9f7]'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'table'
                ? 'bg-[#d4a574] text-white'
                : 'text-[#8b8680] hover:bg-[#faf9f7]'
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
