/**
 * Inventory API Service
 * Handles all inventory-related API calls
 */

import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  InventoryItem,
  InventoryStats,
  StockAdjustment,
  InventoryListResponse,
  LowStockReport,
  BulkRestockResponse,
  CreateInventoryItemInput,
} from '@/types/inventory'

/**
 * Inventory API Service
 */
class InventoryService {
  /**
   * Get inventory items with filters and pagination
   */
  async getInventoryItems(params: {
    search?: string
    category_id?: number
    stock_status?: string
    unit_type?: string
    page?: number
    page_size?: number
  } = {}): Promise<InventoryListResponse> {
    const queryParams = new URLSearchParams()

    if (params.search) queryParams.set('search', params.search)
    if (params.category_id !== undefined) queryParams.set('category_id', String(params.category_id))
    if (params.stock_status) queryParams.set('stock_status', params.stock_status)
    if (params.unit_type) queryParams.set('unit_type', params.unit_type)
    if (params.page) queryParams.set('page', String(params.page))
    if (params.page_size) queryParams.set('page_size', String(params.page_size))

    const queryString = queryParams.toString()
    const endpoint = `${API_ENDPOINTS.INVENTORY_ITEMS}${queryString ? `?${queryString}` : ''}`

    return apiClient.get<InventoryListResponse>(endpoint)
  }

  /**
   * Get a single inventory item by ID
   */
  async getInventoryItem(itemId: number): Promise<InventoryItem> {
    return apiClient.get<InventoryItem>(API_ENDPOINTS.INVENTORY_ITEM(itemId))
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(params: {
    threshold?: number
    category_id?: number
  } = {}): Promise<LowStockReport> {
    const queryParams = new URLSearchParams()

    if (params.threshold !== undefined) {
      queryParams.set('threshold', String(params.threshold))
    }
    if (params.category_id !== undefined) {
      queryParams.set('category_id', String(params.category_id))
    }

    const queryString = queryParams.toString()
    const endpoint = `${API_ENDPOINTS.INVENTORY_LOW_STOCK}${queryString ? `?${queryString}` : ''}`

    return apiClient.get<LowStockReport>(endpoint)
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats(): Promise<InventoryStats> {
    return apiClient.get<InventoryStats>(API_ENDPOINTS.INVENTORY_STATS)
  }

  /**
   * Get categories for inventory filtering (inventory scope)
   */
  async getInventoryCategories(): Promise<{ value: string; label: string }[]> {
    // Use category service with inventory scope to separate from menu categories
    const { categoryService } = await import('./categoryService')
    return categoryService.getCategoriesForSelect('inventory')
  }

  /**
   * Get available stock units
   */
  async getStockUnits(): Promise<{
    count: Array<{ value: string; label: string; type: string }>
    volume: Array<{ value: string; label: string; type: string }>
    weight: Array<{ value: string; label: string; type: string }>
  }> {
    return apiClient.get(API_ENDPOINTS.INVENTORY_UNITS)
  }

  /**
   * Create a new inventory item
   */
  async createInventoryItem(data: CreateInventoryItemInput): Promise<InventoryItem> {
    return apiClient.post<InventoryItem>(API_ENDPOINTS.INVENTORY_ITEMS, data)
  }

  /**
   * Update an existing inventory item
   */
  async updateInventoryItem(itemId: number, data: Partial<CreateInventoryItemInput>): Promise<InventoryItem> {
    return apiClient.put<InventoryItem>(API_ENDPOINTS.INVENTORY_ITEM(itemId), data)
  }

  /**
   * Delete an inventory item
   */
  async deleteInventoryItem(itemId: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(API_ENDPOINTS.INVENTORY_ITEM(itemId))
  }

  /**
   * Adjust stock quantity for an item
   */
  async adjustStock(
    itemId: number,
    adjustment: StockAdjustment
  ): Promise<InventoryItem> {
    return apiClient.patch<InventoryItem>(
      API_ENDPOINTS.INVENTORY_ADJUST_STOCK(itemId),
      adjustment
    )
  }

  /**
   * Restock an item to its reorder_quantity level or custom amount
   */
  async restockItem(
    itemId: number,
    quantity?: number
  ): Promise<InventoryItem> {
    const queryParams = quantity !== undefined ? `?quantity=${quantity}` : ''
    return apiClient.post<InventoryItem>(
      `${API_ENDPOINTS.INVENTORY_RESTOCK(itemId)}${queryParams}`
    )
  }

  /**
   * Bulk restock multiple items
   */
  async bulkRestock(itemIds: number[], quantity?: number): Promise<BulkRestockResponse> {
    return apiClient.post<BulkRestockResponse>(
      API_ENDPOINTS.INVENTORY_BULK_RESTOCK,
      { item_ids: itemIds, quantity }
    )
  }

  /**
   * Set stock levels for an item
   */
  async setStockLevels(
    itemId: number,
    params: {
      stock_quantity: number
      low_stock_threshold?: number
      reorder_level?: number
      reorder_quantity?: number
    }
  ): Promise<InventoryItem> {
    const queryParams = new URLSearchParams()
    queryParams.set('stock_quantity', String(params.stock_quantity))
    if (params.low_stock_threshold !== undefined) {
      queryParams.set('low_stock_threshold', String(params.low_stock_threshold))
    }
    if (params.reorder_level !== undefined) {
      queryParams.set('reorder_level', String(params.reorder_level))
    }
    if (params.reorder_quantity !== undefined) {
      queryParams.set('reorder_quantity', String(params.reorder_quantity))
    }

    return apiClient.put<InventoryItem>(
      `${API_ENDPOINTS.INVENTORY_SET_STOCK_LEVELS(itemId)}?${queryParams.toString()}`
    )
  }
}

// Export singleton instance
export const inventoryService = new InventoryService()
