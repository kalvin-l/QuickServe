/**
 * Inventory React Query Hooks
 * Custom hooks for inventory data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '@/lib/api/services/inventoryService'
import type {
  InventoryItem,
  InventoryStats,
  StockAdjustment,
  InventoryFilters,
  LowStockReport,
  BulkRestockResponse,
  CreateInventoryItemInput,
} from '@/types/inventory'

// ============================================================================
// Query Keys Factory
// ============================================================================

/**
 * Query keys for inventory queries
 */
export const inventoryKeys = {
  all: ['inventory'] as const,
  items: (params?: Record<string, any>) => ['inventory', 'items', params] as const,
  item: (id: number) => ['inventory', 'item', id] as const,
  lowStock: (params?: Record<string, any>) => ['inventory', 'low-stock', params] as const,
  stats: ['inventory', 'stats'] as const,
  categories: ['inventory', 'categories'] as const,
  units: ['inventory', 'units'] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch inventory items with filters and pagination
 */
export function useInventoryItems(params: {
  search?: string
  category_id?: number
  stock_status?: string
  unit_type?: string
  page?: number
  page_size?: number
} = {}) {
  return useQuery({
    queryKey: inventoryKeys.items(params),
    queryFn: () => inventoryService.getInventoryItems(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook to fetch a single inventory item
 */
export function useInventoryItem(itemId: number, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.item(itemId),
    queryFn: () => inventoryService.getInventoryItem(itemId),
    enabled: enabled && !!itemId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch low stock items
 */
export function useLowStockItems(params: {
  threshold?: number
  category_id?: number
} = {}, options?: {
  refetchInterval?: number
  enabled?: boolean
}) {
  return useQuery({
    queryKey: inventoryKeys.lowStock(params),
    queryFn: () => inventoryService.getLowStockItems(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: options?.refetchInterval || false,
    enabled: options?.enabled ?? true,
  })
}

/**
 * Hook to fetch inventory statistics
 */
export function useInventoryStats(options?: {
  refetchInterval?: number
  enabled?: boolean
}) {
  return useQuery({
    queryKey: inventoryKeys.stats,
    queryFn: () => inventoryService.getInventoryStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: options?.refetchInterval || false,
    enabled: options?.enabled ?? true,
  })
}

/**
 * Hook to fetch inventory categories
 */
export function useInventoryCategories() {
  return useQuery({
    queryKey: inventoryKeys.categories,
    queryFn: () => inventoryService.getInventoryCategories(),
    staleTime: 1000 * 60 * 10, // 10 minutes - categories rarely change
  })
}

/**
 * Hook to fetch stock units
 */
export function useStockUnits() {
  return useQuery({
    queryKey: inventoryKeys.units,
    queryFn: () => inventoryService.getStockUnits(),
    staleTime: 1000 * 60 * 60, // 1 hour - units are static
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a new inventory item
 */
export function useCreateInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateInventoryItemInput) =>
      inventoryService.createInventoryItem(data),
    onSuccess: () => {
      // Invalidate all inventory-related queries
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stats })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories })
    },
  })
}

/**
 * Hook to update an existing inventory item
 */
export function useUpdateInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: Partial<CreateInventoryItemInput> }) =>
      inventoryService.updateInventoryItem(itemId, data),
    onSuccess: (_, variables) => {
      // Invalidate all inventory-related queries
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.item(variables.itemId) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stats })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories })
    },
  })
}

/**
 * Hook to adjust stock quantity
 */
export function useAdjustStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, adjustment }: { itemId: number; adjustment: StockAdjustment }) =>
      inventoryService.adjustStock(itemId, adjustment),
    onSuccess: () => {
      // Invalidate all inventory-related queries
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() })
    },
  })
}

/**
 * Hook to restock an item
 */
export function useRestockItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity?: number }) =>
      inventoryService.restockItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() })
    },
  })
}

/**
 * Hook to bulk restock multiple items
 */
export function useBulkRestock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemIds, quantity }: { itemIds: number[]; quantity?: number }) =>
      inventoryService.bulkRestock(itemIds, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() })
    },
  })
}

/**
 * Hook to set stock levels
 */
export function useSetStockLevels() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      itemId,
      params
    }: {
      itemId: number
      params: {
        stock_quantity: number
        low_stock_threshold?: number
        reorder_level?: number
        reorder_quantity?: number
      }
    }) => inventoryService.setStockLevels(itemId, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.item(variables.itemId) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stats() })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() })
    },
  })
}

// ============================================================================
// Compound Hooks
// ============================================================================

/**
 * Hook that combines inventory items with stats
 * Useful for pages that need both data
 */
export function useInventoryData(params: {
  search?: string
  category_id?: number
  stock_status?: string
  unit_type?: string
  page?: number
  page_size?: number
} = {}, options?: {
  refetchInterval?: number
}) {
  const itemsQuery = useInventoryItems(params)
  const statsQuery = useInventoryStats({
    refetchInterval: options?.refetchInterval
  })

  return {
    items: itemsQuery.data?.items ?? [],
    total: itemsQuery.data?.total ?? 0,
    totalPages: itemsQuery.data?.total_pages ?? 0,
    stats: statsQuery.data,
    isLoading: itemsQuery.isLoading || statsQuery.isLoading,
    error: itemsQuery.error || statsQuery.error,
    refetch: () => {
      itemsQuery.refetch()
      statsQuery.refetch()
    },
  }
}

/**
 * Hook for low stock alerting
 * Returns low stock items with auto-refresh
 */
export function useLowStockAlert(refreshInterval: number = 1000 * 60 * 5) {
  const lowStockQuery = useLowStockItems({}, {
    refetchInterval: refreshInterval
  })

  return {
    lowStockItems: lowStockQuery.data?.items ?? [],
    lowStockCount: lowStockQuery.data?.total_count ?? 0,
    categories: lowStockQuery.data?.categories ?? {},
    isLoading: lowStockQuery.isLoading,
    error: lowStockQuery.error,
  }
}
