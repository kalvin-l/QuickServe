'use client'

import { useState, useCallback } from 'react'

export interface UseOrderPaginationReturn {
  /** Current page number */
  currentPage: number
  /** Number of items per page */
  pageSize: number
  /** Handler for page change */
  handlePageChange: (page: number) => void
  /** Handler for page size change - resets to page 1 */
  handlePageSizeChange: (size: number) => void
  /** Reset to page 1 */
  resetPage: () => void
}

/**
 * Hook for managing order pagination state
 */
export function useOrderPagination(): UseOrderPaginationReturn {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }, [])

  const resetPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  return {
    currentPage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    resetPage,
  }
}
