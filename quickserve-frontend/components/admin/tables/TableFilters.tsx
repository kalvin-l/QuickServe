'use client'

import { Search, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterConfig {
  id: string
  label: string
  type: 'search' | 'select' | 'multiselect'
  placeholder?: string
  options?: FilterOption[]
  value?: string | string[]
}

interface TableFiltersProps {
  filters: FilterConfig[]
  onFilterChange: (filters: Record<string, string | string[]>) => void
  onClearFilters?: () => void
  className?: string
}

export function TableFilters({
  filters,
  onFilterChange,
  onClearFilters,
  className,
}: TableFiltersProps) {
  const [localFilters, setLocalFilters] = useState<Record<string, string | string[]>>({})

  const handleFilterChange = (filterId: string, value: string | string[]) => {
    const newFilters = { ...localFilters, [filterId]: value }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleClearFilters = () => {
    setLocalFilters({})
    onClearFilters?.()
  }

  const hasActiveFilters = Object.values(localFilters).some(
    (value) => value !== '' && value?.length !== 0
  )

  return (
    <div className={cn('flex flex-wrap items-center gap-3 mb-4', className)}>
      {filters.map((filter) => (
        <div key={filter.id} className="flex items-center">
          {filter.type === 'search' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={filter.placeholder || 'Search...'}
                value={(localFilters[filter.id] as string) || ''}
                onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
          )}

          {filter.type === 'select' && (
            <select
              value={(localFilters[filter.id] as string) || ''}
              onChange={(e) => handleFilterChange(filter.id, e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{filter.label}</option>
              {filter.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {filter.type === 'multiselect' && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                multiple
                value={(localFilters[filter.id] as string[]) || []}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, (opt) => opt.value)
                  handleFilterChange(filter.id, values)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                size={1}
              >
                {filter.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ))}

      {hasActiveFilters && onClearFilters && (
        <button
          onClick={handleClearFilters}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
          Clear filters
        </button>
      )}
    </div>
  )
}
