'use client'

import { Search, X, Filter, ChevronDown, RefreshCw, Plus } from 'lucide-react'

interface MenuFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  categoryFilter: string
  onCategoryChange: (value: string) => void
  availabilityFilter: 'all' | 'available' | 'unavailable' | 'featured' | 'popular'
  onAvailabilityChange: (value: 'all' | 'available' | 'unavailable' | 'featured' | 'popular') => void
  categories: Array<{ id: string; label: string; value: string }>
  onRefresh?: () => void
  onAddItem?: () => void
}

export function MenuFilters({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  availabilityFilter,
  onAvailabilityChange,
  categories,
  onRefresh,
  onAddItem,
}: MenuFiltersProps) {
  const clearSearch = () => {
    onSearchChange('')
  }

  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
      {/* Left side - Search and Category */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
        {/* Search */}
        <div className="relative">
          <input
            type="search"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-[#faf9f7] text-[#2d2a26] placeholder:text-[#8b8680]/60 focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 w-64 text-sm transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8680]" />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b8680] hover:text-[#5c5752] transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="pl-10 pr-8 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-[#faf9f7] text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 appearance-none cursor-pointer w-48 text-sm transition-all"
          >
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8680] pointer-events-none" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8b8680] pointer-events-none" />
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#faf9f7] transition-all"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        {onAddItem && (
          <button
            onClick={onAddItem}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2d2a26] text-white font-medium hover:bg-[#3d3a36] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        )}
      </div>
    </div>
  )
}
