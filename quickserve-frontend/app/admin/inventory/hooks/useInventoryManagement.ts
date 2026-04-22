/**
 * Inventory Management Hook
 * Custom hook for inventory page state and operations
 */

import { useState, useCallback, useMemo } from 'react'
import { useInventoryItems, useInventoryStats, useAdjustStock, useRestockItem, useBulkRestock } from '@/lib/api/queries/useInventory'
import type { InventoryItem, InventoryFilters, StockAdjustment } from '@/types/inventory'

/**
 * View mode for inventory display
 */
export type ViewMode = 'table' | 'grid'

/**
 * Pagination state
 */
export interface PaginationState {
  currentPage: number
  itemsPerPage: number
}

/**
 * Return type for useInventoryManagement hook
 */
export interface UseInventoryManagementReturn {
  // Data
  items: InventoryItem[]
  stats?: {
    total_items: number
    in_stock_count: number
    low_stock_count: number
    out_of_stock_count: number
    total_value: number
    categories: Array<{ name: string; count: number }>
  }
  selectedItem: InventoryItem | null
  total: number
  totalPages: number

  // UI State
  filters: InventoryFilters
  pagination: PaginationState
  viewMode: ViewMode
  isLoading: boolean
  error: unknown
  showAdjustModal: boolean
  showRestockModal: boolean
  showViewDetailsModal: boolean

  // Pagination
  canGoToNextPage: boolean
  canGoToPreviousPage: boolean
  itemsPerPage: number

  // Actions
  setViewMode: (mode: ViewMode) => void
  updateFilters: (updates: Partial<InventoryFilters>) => void
  clearFilters: () => void
  nextPage: () => void
  previousPage: () => void
  goToPage: (page: number) => void
  openAdjustModal: (item: InventoryItem) => void
  openRestockModal: (item: InventoryItem) => void
  openViewDetailsModal: (item: InventoryItem) => void
  closeModals: () => void
  handleAdjustStock: (itemId: number, adjustment: StockAdjustment) => Promise<void>
  handleRestockItem: (itemId: number, quantity?: number) => Promise<void>
  handleBulkRestock: (itemIds: number[]) => Promise<void>
  refetch: () => void
}

/**
 * Inventory management hook
 * Manages inventory page state, filtering, pagination, and operations
 */
export function useInventoryManagement(): UseInventoryManagementReturn {
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    category: '',
    stockStatus: 'all',
    unitType: 'all',
    containerTracking: 'all',
  })
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 20,
  })
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false)

  // Build query params from filters
  const queryParams = useMemo(() => ({
    search: filters.search || undefined,
    category_id: filters.category ? parseInt(filters.category) : undefined,
    stock_status: filters.stockStatus === 'all' ? undefined : filters.stockStatus,
    unit_type: filters.unitType === 'all' ? undefined : filters.unitType,
    page: pagination.currentPage,
    page_size: pagination.itemsPerPage,
  }), [filters, pagination])

  // Fetch data
  const { data: inventoryData, isLoading, error, refetch } = useInventoryItems(queryParams)
  const { data: stats } = useInventoryStats()

  // Mutations
  const adjustStockMutation = useAdjustStock()
  const restockMutation = useRestockItem()
  const bulkRestockMutation = useBulkRestock()

  // Actions
  const handleAdjustStock = useCallback(async (itemId: number, adjustment: StockAdjustment) => {
    await adjustStockMutation.mutateAsync({ itemId, adjustment })
  }, [adjustStockMutation])

  const handleRestockItem = useCallback(async (itemId: number, quantity?: number) => {
    await restockMutation.mutateAsync({ itemId, quantity })
  }, [restockMutation])

  const handleBulkRestock = useCallback(async (itemIds: number[]) => {
    await bulkRestockMutation.mutateAsync({ itemIds })
  }, [bulkRestockMutation])

  // Filter handlers
  const updateFilters = useCallback((updates: Partial<InventoryFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }))
    setPagination(prev => ({ ...prev, currentPage: 1 })) // Reset to page 1
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      category: '',
      stockStatus: 'all',
      unitType: 'all',
      containerTracking: 'all',
    })
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }, [])

  // Pagination handlers
  const nextPage = useCallback(() => {
    setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))
  }, [])

  const previousPage = useCallback(() => {
    setPagination(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))
  }, [])

  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
  }, [])

  // Modal handlers
  const openAdjustModal = useCallback((item: InventoryItem) => {
    setSelectedItem(item)
    setShowAdjustModal(true)
  }, [])

  const openRestockModal = useCallback((item: InventoryItem) => {
    setSelectedItem(item)
    setShowRestockModal(true)
  }, [])

  const openViewDetailsModal = useCallback((item: InventoryItem) => {
    setSelectedItem(item)
    setShowViewDetailsModal(true)
  }, [])

  const closeModals = useCallback(() => {
    setSelectedItem(null)
    setShowAdjustModal(false)
    setShowRestockModal(false)
    setShowViewDetailsModal(false)
  }, [])

  // Computed values
  const items = inventoryData?.items ?? []
  const total = inventoryData?.total ?? 0
  const totalPages = inventoryData?.total_pages ?? 0

  const filteredItems = useMemo(() => {
    let result = items

    // Apply container tracking filter (client-side)
    if (filters.containerTracking === 'with_containers') {
      result = result.filter(item => item.container_type !== null && item.container_type !== undefined)
    } else if (filters.containerTracking === 'without_containers') {
      result = result.filter(item => !item.container_type || item.container_type === '')
    }

    return result
  }, [items, filters.containerTracking])

  // Container items count (from all items, not filtered)
  const containerItemsCount = useMemo(() => {
    return items.filter(item => item.container_type !== null && item.container_type !== undefined && item.container_type !== '').length
  }, [items])

  const canGoToNextPage = pagination.currentPage < totalPages
  const canGoToPreviousPage = pagination.currentPage > 1

  return {
    // Data
    items: filteredItems,
    stats,
    selectedItem,
    total,
    totalPages,
    containerItemsCount,

    // UI State
    filters,
    pagination,
    viewMode,
    isLoading,
    error,
    showAdjustModal,
    showRestockModal,
    showViewDetailsModal,

    // Pagination
    canGoToNextPage,
    canGoToPreviousPage,
    itemsPerPage: pagination.itemsPerPage,

    // Actions
    setViewMode,
    updateFilters,
    clearFilters,
    nextPage,
    previousPage,
    goToPage,
    openAdjustModal,
    openRestockModal,
    openViewDetailsModal,
    closeModals,
    handleAdjustStock,
    handleRestockItem,
    handleBulkRestock,
    refetch,
  }
}

/**
 * Inventory filters hook
 * Manages filter state with URL sync support (optional)
 */
export function useInventoryFilters(initialFilters?: Partial<InventoryFilters>) {
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    category: '',
    stockStatus: 'all',
    unitType: 'all',
    ...initialFilters,
  })

  const updateFilter = useCallback(<K extends keyof InventoryFilters>(
    key: K,
    value: InventoryFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const updateFilters = useCallback((updates: Partial<InventoryFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      category: '',
      stockStatus: 'all',
      unitType: 'all',
    })
  }, [])

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.search ||
      filters.category ||
      filters.stockStatus !== 'all' ||
      filters.unitType !== 'all'
    )
  }, [filters])

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    hasActiveFilters,
  }
}

/**
 * Inventory pagination hook
 * Manages pagination state
 */
export function useInventoryPagination(initialPage: number = 1, initialItemsPerPage: number = 20) {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage)

  const nextPage = useCallback(() => {
    setCurrentPage(prev => prev + 1)
  }, [])

  const previousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }, [])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, page))
  }, [])

  const reset = useCallback(() => {
    setCurrentPage(1)
  }, [])

  return {
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    nextPage,
    previousPage,
    goToPage,
    reset,
  }
}
