/**
 * Pagination Component
 * Reusable pagination UI component
 */

'use client'

import React, { useMemo } from 'react'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  onPageChange: (page: number) => void
  pageSize?: number
  total?: number
  showInfo?: boolean
}

export default function Pagination({
  currentPage,
  totalPages,
  hasNext,
  hasPrev,
  onPageChange,
  pageSize,
  total,
  showInfo = true,
}: PaginationProps) {
  // Generate page numbers to show
  const pages = useMemo(() => {
    const range: (number | string)[] = []
    const showAround = 2 // Show 2 pages before/after current

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || // Always show first page
        i === totalPages || // Always show last page
        (i >= currentPage - showAround && i <= currentPage + showAround) // Show around current
      ) {
        range.push(i)
      } else if (range[range.length - 1] !== '...') {
        range.push('...')
      }
    }

    return range
  }, [currentPage, totalPages])

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border border-gray-200 rounded-lg">
      {/* Info text (optional) */}
      {showInfo && (
        <div className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
          {total !== undefined && pageSize !== undefined && (
            <span className="ml-2">
              ({total} total items)
            </span>
          )}
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrev}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
          aria-label="Previous page"
        >
          <i className="fas fa-chevron-left text-xs"></i>
          <span className="text-sm font-medium">Previous</span>
        </button>

        {/* Page numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((page, i) => (
            page === '...' ? (
              <span
                key={`ellipsis-${i}`}
                className="px-2 text-gray-400"
                aria-hidden="true"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={`min-w-[2.5rem] px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  page === currentPage
                    ? 'bg-[#ec7813] text-white shadow-sm'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                aria-label={`Go to page ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            )
          ))}
        </div>

        {/* Mobile page indicator */}
        <div className="sm:hidden text-sm text-gray-600 px-2">
          {currentPage} / {totalPages}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
          aria-label="Next page"
        >
          <span className="text-sm font-medium">Next</span>
          <i className="fas fa-chevron-right text-xs"></i>
        </button>
      </div>
    </div>
  )
}

/**
 * Simple page size selector component
 */
export interface PageSizeSelectorProps {
  pageSize: number
  onPageSizeChange: (size: number) => void
  options?: number[]
}

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  options = [12, 24, 48, 96],
}: PageSizeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Show:</span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#ec7813]"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size} per page
          </option>
        ))}
      </select>
    </div>
  )
}
