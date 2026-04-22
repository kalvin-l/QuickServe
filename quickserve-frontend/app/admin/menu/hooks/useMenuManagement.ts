/**
 * Menu Management Hook
 * Uses FastAPI backend for all menu operations
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  useMenuItems,
  useCategories,
  useDeleteMenuItem,
  useToggleAvailability,
  type MenuItem,
  type MenuItemsParams,
} from '@/lib/api/queries/useMenu'

export type ViewMode = 'grid' | 'table'
export type AvailabilityFilter = 'all' | 'available' | 'unavailable' | 'featured' | 'popular'

interface MenuFilters {
  search: string
  category: string
  availability: AvailabilityFilter
}

interface PaginationState {
  currentPage: number
  itemsPerPage: number
}

export function useMenuManagement() {
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [filters, setFilters] = useState<MenuFilters>({
    search: '',
    category: '',
    availability: 'all',
  })
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10,
  })
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Build query params from filters
  const queryParams: MenuItemsParams = useMemo(() => {
    const params: MenuItemsParams = {
      page: pagination.currentPage,
      page_size: viewMode === 'table' ? 10 : 6,
    }

    if (filters.search) params.search = filters.search
    if (filters.category && filters.category !== 'all') {
      params.category_id = parseInt(filters.category)
    }
    if (filters.availability === 'available') {
      params.available_only = true
    }
    if (filters.availability === 'featured') {
      params.featured_only = true
    }
    if (filters.availability === 'popular') {
      params.popular_only = true
    }

    return params
  }, [filters, pagination.currentPage, viewMode])

  // Fetch menu items
  const {
    data: menuData,
    isLoading,
    error,
  } = useMenuItems(queryParams)

  const products = menuData?.items || []
  const totalItems = menuData?.total || 0
  const totalPages = menuData?.total_pages || 1

  // Fetch categories
  const { data: categoriesData } = useCategories()

  // Mutations
  const deleteMutation = useDeleteMenuItem()
  const toggleMutation = useToggleAvailability()

  // Transform categories for select
  const categories = useMemo(() => {
    const cats = categoriesData?.categories || []

    // Add "All Categories" option
    const allOption = {
      id: 'all',
      value: 'all',
      label: 'All Categories',
    }

    return [
      allOption,
      ...cats.map((cat: any) => ({
        id: cat.id,
        value: String(cat.id),
        label: cat.name,
      })),
    ]
  }, [categoriesData])

  // Calculate statistics from current products
  // NOTE: Since API uses pagination, these stats are for the current page only
  // For accurate total stats, consider adding a separate stats endpoint
  const menuStats = useMemo(() => {
    return {
      total: products.length,
      available: products.filter((p) => p.available).length,
      outOfStock: products.filter((p) => !p.available).length,
      featured: products.filter((p) => p.featured).length,
      popular: products.filter((p) => p.popular).length,
    }
  }, [products])

  // Filtered products (already filtered by API, but can add client-side filtering if needed)
  const filteredProducts = useMemo(() => {
    return products
  }, [products])

  // Paginated products (already paginated by API)
  const paginatedProducts = useMemo(() => {
    return filteredProducts
  }, [filteredProducts])

  // Pagination
  const itemsPerPage = pagination.itemsPerPage
  const canGoToNextPage = pagination.currentPage < totalPages
  const canGoToPreviousPage = pagination.currentPage > 1

  // Actions
  const updateFilters = useCallback((updates: Partial<MenuFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }))
    setPagination((prev) => ({ ...prev, currentPage: 1 })) // Reset to page 1
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      category: '',
      availability: 'all',
    })
    setPagination((prev) => ({ ...prev, currentPage: 1 }))
  }, [])

  const handleViewDetails = useCallback((item: MenuItem) => {
    setSelectedItem(item)
    setShowModal(true)
  }, [])

  const handleEdit = useCallback((itemId: string | number) => {
    // Navigate to edit page
    if (!itemId) {
      alert('Error: Menu item ID is missing')
      return
    }
    window.location.href = `/admin/menu/edit/${itemId}`
  }, [])

  const handleToggleAvailability = useCallback(async (item: MenuItem) => {
    try {
      await toggleMutation.mutateAsync(item.id)
      toast.success(
        item.available
          ? `"${item.name}" marked as unavailable`
          : `"${item.name}" is now available`
      )
    } catch (error) {
      console.error('Failed to toggle availability:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to toggle availability')
    }
  }, [toggleMutation])

  const handleDelete = useCallback(async (item: MenuItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return
    }

    try {
      await deleteMutation.mutateAsync(item.id)
      setShowModal(false)
      toast.success(`"${item.name}" deleted successfully`)
    } catch (error) {
      console.error('Failed to delete item:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete item')
    }
  }, [deleteMutation])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setSelectedItem(null)
  }, [])

  // Pagination actions
  const nextPage = useCallback(() => {
    if (canGoToNextPage) {
      setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))
    }
  }, [canGoToNextPage])

  const previousPage = useCallback(() => {
    if (canGoToPreviousPage) {
      setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))
    }
  }, [canGoToPreviousPage])

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: page }))
    }
  }, [totalPages])

  return {
    // Data
    products,
    filteredProducts,
    paginatedProducts,
    categories,
    selectedItem,
    totalItems,
    menuStats,

    // State
    viewMode,
    filters,
    pagination,
    showModal,
    isLoading,
    error,

    // Computed
    itemsPerPage,
    totalPages,
    canGoToNextPage,
    canGoToPreviousPage,

    // Actions
    setViewMode,
    updateFilters,
    clearFilters,
    handleViewDetails,
    handleEdit,
    handleToggleAvailability,
    handleDelete,
    closeModal,
    nextPage,
    previousPage,
    goToPage,
  }
}
