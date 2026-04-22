'use client'

import { useState, useCallback } from 'react'

export interface UseOrderFiltersReturn {
  /** Currently active tab */
  activeTab: string
  /** Currently active status filter */
  activeStatus: string
  /** Current search query */
  searchQuery: string
  /** Handler for tab change - resets page to 1 */
  handleTabChange: (tab: string) => void
  /** Handler for status change - resets page to 1 */
  handleStatusChange: (status: string) => void
  /** Handler for search change - resets page to 1 */
  handleSearchChange: (query: string) => void
}

/**
 * Hook for managing order filter state (tab, status, search)
 * All filter handlers reset pagination to page 1
 */
export function useOrderFilters(): UseOrderFiltersReturn {
  const [activeTab, setActiveTab] = useState('all')
  const [activeStatus, setActiveStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
    // Note: setPageTo1 is handled by the parent component
  }, [])

  const handleStatusChange = useCallback((status: string) => {
    setActiveStatus(status)
    // Note: setPageTo1 is handled by the parent component
  }, [])

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    // Note: setPageTo1 is handled by the parent component
  }, [])

  return {
    activeTab,
    activeStatus,
    searchQuery,
    handleTabChange,
    handleStatusChange,
    handleSearchChange,
  }
}
