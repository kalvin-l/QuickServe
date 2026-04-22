'use client'

import { Skeleton } from './Skeleton'

export interface TableSkeletonProps {
  rows?: number
  columns?: number
  responsiveColumns?: { sm?: number; md?: number; lg?: number }
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  responsiveColumns
}: TableSkeletonProps) {
  // Determine columns based on screen size
  const smCols = responsiveColumns?.sm || Math.min(columns, 2)
  const mdCols = responsiveColumns?.md || Math.min(columns, 3)
  const lgCols = responsiveColumns?.lg || columns

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-10 sm:h-12" />
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="border-b border-gray-200 dark:border-gray-700 p-2 sm:p-3 md:p-4">
            {/* Mobile: Stacked layout */}
            <div className="flex flex-col sm:hidden gap-2">
              {Array.from({ length: smCols }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-16 shrink-0" variant="text" size="sm" />
                  <Skeleton className="h-3 flex-1" variant="text" size="sm" />
                </div>
              ))}
            </div>
            {/* Tablet+ */}
            <div className="hidden sm:flex items-center space-x-2 md:space-x-4">
              {Array.from({ length: mdCols }).map((_, j) => (
                <Skeleton key={j} className="h-3 md:h-4 flex-1" variant="text" size={j === 0 ? 'sm' : 'md'} />
              ))}
              {/* Desktop: show additional columns */}
              {Array.from({ length: lgCols - mdCols }).map((_, j) => (
                <Skeleton key={`lg-${j}`} className="hidden lg:block h-4 flex-1" variant="text" />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Pagination - Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-2 py-3 sm:py-4">
        <Skeleton className="h-3 w-32 sm:w-48" variant="text" size="sm" />
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <Skeleton className="h-8 w-16 sm:w-20" variant="rounded" />
          <Skeleton className="h-8 w-12 sm:w-16" variant="rounded" />
        </div>
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-5 space-y-3">
      {/* Image - Responsive height */}
      <Skeleton
        className="h-32 sm:h-40 md:h-48 w-full rounded-md"
        variant="rounded"
      />
      {/* Title */}
      <Skeleton className="h-5 sm:h-6 w-3/4 max-w-45 sm:max-w-60" variant="text" size="lg" />
      {/* Subtitle */}
      <Skeleton className="h-3 sm:h-4 w-1/2 max-w-30" variant="text" size="sm" />
      {/* Action button */}
      <Skeleton className="h-8 sm:h-9 md:h-10 w-full sm:w-auto mt-4" variant="button" />
    </div>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Product Image - Responsive height based on screen */}
      <Skeleton
        className="h-36 sm:h-44 md:h-48 lg:h-52 w-full"
        variant="rectangular"
      />
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Product Name */}
        <Skeleton className="h-5 w-3/4 max-w-35 sm:max-w-45" variant="text" size="md" />
        {/* Description Lines */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" variant="text" size="sm" />
          <Skeleton className="h-3 w-2/3 max-w-25" variant="text" size="sm" />
        </div>
        {/* Price and Add Button */}
        <div className="flex items-center justify-between pt-2 sm:pt-3">
          <Skeleton className="h-5 sm:h-6 w-12 sm:w-14 md:w-16" variant="text" size="md" />
          <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full" variant="circular" size="md" />
        </div>
      </div>
    </div>
  )
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          {/* Label */}
          <Skeleton className="h-4 w-20 sm:w-24 md:w-32" variant="text" size="sm" />
          {/* Input Field */}
          <Skeleton className="h-9 sm:h-10 w-full" variant="rounded" />
        </div>
      ))}
      {/* Submit Button */}
      <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 w-full sm:w-28 md:w-32" variant="button" />
        <Skeleton className="h-10 w-full sm:w-24 hidden sm:block" variant="button" />
      </div>
    </div>
  )
}
