/**
 * Inventory Filters Component
 * Search, category, status, unit type, and container tracking filters for inventory page
 */

'use client'

import { Search, RefreshCw, Package, Plus, Box } from 'lucide-react'

interface InventoryFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  categoryFilter: string
  onCategoryChange: (value: string) => void
  stockStatusFilter: string
  onStockStatusChange: (value: string) => void
  unitTypeFilter: string
  onUnitTypeChange: (value: string) => void
  containerFilter: string
  onContainerChange: (value: string) => void
  categories: { value: string; label: string }[]
  onRefresh: () => void
  onBulkRestock: () => void
  onCreate?: () => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  lowStockCount?: number
}

export function InventoryFilters({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  stockStatusFilter,
  onStockStatusChange,
  unitTypeFilter,
  onUnitTypeChange,
  containerFilter,
  onContainerChange,
  categories,
  onRefresh,
  onBulkRestock,
  onCreate,
  hasActiveFilters,
  onClearFilters,
  lowStockCount,
}: InventoryFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8680]" />
          <input
            type="search"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-white text-[#2d2a26] placeholder:text-[#8b8680] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all w-64"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-white text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all"
        >
          {categories.map((category, index) => (
            <option key={`${category.value}-${index}`} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>

        {/* Stock Status Filter */}
        <select
          value={stockStatusFilter}
          onChange={(e) => onStockStatusChange(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-white text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all"
        >
          <option value="all">All Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>

        {/* Unit Type Filter */}
        <select
          value={unitTypeFilter}
          onChange={(e) => onUnitTypeChange(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-white text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all"
        >
          <option value="all">All Units</option>
          <option value="count">Count (pcs, pack, box)</option>
          <option value="volume">Volume (ml, l, gal)</option>
          <option value="weight">Weight (g, kg, oz, lb)</option>
        </select>

        {/* Container Tracking Filter */}
        <select
          value={containerFilter}
          onChange={(e) => onContainerChange(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-white text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all"
        >
          <option value="all">All Items</option>
          <option value="with_containers">📦 With Containers</option>
          <option value="without_containers">📦 No Containers</option>
        </select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-white text-[#5c5752] hover:bg-[#faf9f7] transition-all text-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Low Stock Badge */}
        {lowStockCount !== undefined && lowStockCount > 0 && (
          <div className="px-3 py-2 rounded-lg bg-[#fef3c7] text-[#f59e0b] flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">{lowStockCount} Low Stock</span>
          </div>
        )}

        {/* Create Item Button */}
        {onCreate && (
          <button
            onClick={onCreate}
            className="px-4 py-2.5 rounded-xl bg-[#d4a574] text-white hover:bg-[#c49a6b] transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Item</span>
          </button>
        )}

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-white text-[#5c5752] hover:bg-[#faf9f7] transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {/* Bulk Restock Button */}
        <button
          onClick={onBulkRestock}
          className="px-4 py-2.5 rounded-xl bg-[#22c55e] text-white hover:bg-[#16a34a] transition-all flex items-center gap-2"
        >
          <Package className="w-4 h-4" />
          <span>Bulk Restock</span>
        </button>
      </div>
    </div>
  )
}
