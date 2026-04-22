/**
 * LocalStorage Order History Hook
 * Manages offline order history persistence
 */

import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Order } from '@/types/order.types'
import type {
  StoredOrder,
  StoredOrderItem,
  StoredOrderPayment,
  OrderHistoryFilters,
  OrderHistoryStats,
} from '../types/orderHistory.types'
import { orderKeys } from '@/lib/api/queries/useOrders'
import { customerMenuService } from '@/lib/api/services/customerMenuService'

const STORAGE_KEY = 'quickserve-order-history'
const CLEAR_TIMESTAMP_KEY = 'quickserve-order-history-cleared'
const CURRENT_SESSION_KEY = 'quickserve-order-session'
const MAX_HISTORY_SIZE = 50 // Limit history to prevent storage issues

/**
 * Set the current session ID for order filtering
 */
export function setCurrentOrderSession(sessionDbId: number | null): void {
  if (typeof window === 'undefined') return
  if (sessionDbId) {
    localStorage.setItem(CURRENT_SESSION_KEY, sessionDbId.toString())
  } else {
    localStorage.removeItem(CURRENT_SESSION_KEY)
  }
}

/**
 * Get the current session ID for order filtering
 */
function getCurrentOrderSession(): number | null {
  if (typeof window === 'undefined') return null
  const sessionId = localStorage.getItem(CURRENT_SESSION_KEY)
  return sessionId ? parseInt(sessionId, 10) : null
}

/**
 * Get the timestamp when history was last cleared
 */
function getClearTimestamp(): number | null {
  if (typeof window === 'undefined') return null
  const timestamp = localStorage.getItem(CLEAR_TIMESTAMP_KEY)
  return timestamp ? parseInt(timestamp, 10) : null
}

/**
 * Check if an order was created before the last clear
 */
function isOrderBeforeClear(orderCreatedAt: string | null): boolean {
  if (!orderCreatedAt) return false
  const clearTimestamp = getClearTimestamp()
  if (!clearTimestamp) return false
  return new Date(orderCreatedAt).getTime() < clearTimestamp
}

/**
 * Convert Order to StoredOrder format for localStorage
 * @param existingImages - Map of menu_item_id to existing image URL (to avoid re-fetching)
 */
async function toStoredOrder(order: Order, existingImages?: Map<number, string>): Promise<StoredOrder> {
  // Use existing images if available, otherwise fetch from backend
  const imageCache = existingImages || new Map<number, string>()

  // Fetch product images only for items not in cache
  const itemsWithImages = await Promise.all(
    (order.items || []).map(async (item) => {
      // Use cached image if available
      if (imageCache.has(item.menu_item_id)) {
        return {
          id: item.id,
          menu_item_id: item.menu_item_id,
          item_name: item.item_name,
          item_image: imageCache.get(item.menu_item_id) || '',
          quantity: item.quantity,
          size_label: item.size_label,
          temperature: item.temperature,
          item_total: item.item_total,
          item_total_in_pesos: item.item_total_in_pesos,
          special_instructions: item.special_instructions,
        }
      }

      // Fetch from backend only if not cached
      let imageUrl = ''
      try {
        const product = await customerMenuService.getProduct(item.menu_item_id)
        imageUrl = product?.image || product?.image_url || ''
        // Cache the image for future use
        imageCache.set(item.menu_item_id, imageUrl)
      } catch {
        // If backend fetch fails, continue without image
      }

      return {
        id: item.id,
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        item_image: imageUrl,
        quantity: item.quantity,
        size_label: item.size_label,
        temperature: item.temperature,
        item_total: item.item_total,
        item_total_in_pesos: item.item_total_in_pesos,
        special_instructions: item.special_instructions,
      }
    })
  )

  return {
    id: order.id,
    order_number: order.order_number,
    table_number: order.table_number,
    table_session_id: order.table_session_id,
    group_session_id: order.group_session_id,
    participant_id: order.participant_id,
    order_type: order.order_type,
    status: order.status,
    customer_name: order.customer_name,
    subtotal: order.subtotal,
    subtotal_in_pesos: order.subtotal_in_pesos,
    tax: order.tax,
    total: order.total,
    total_in_pesos: order.total_in_pesos,
    items: itemsWithImages,
    payment: order.payment ? {
      method: order.payment.method,
      status: order.payment.status,
      amount: order.payment.amount,
      amount_in_pesos: order.payment.amount_in_pesos,
    } : undefined,
    notes: order.notes,
    created_at: order.created_at || new Date().toISOString(),
    updated_at: order.updated_at,
    stored_at: new Date().toISOString(),
  }
}

/**
 * Get all stored orders from localStorage
 */
export function getStoredOrders(): StoredOrder[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []

    const orders = JSON.parse(data) as StoredOrder[]

    // Sort by created_at descending (newest first)
    return orders.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  } catch (error) {
    console.error('[OrderHistory] Failed to parse stored orders:', error)
    return []
  }
}

/**
 * Save order to localStorage history
 * Only saves orders that belong to the current session
 */
export async function saveOrderToHistory(order: Order): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false
  }

  // CRITICAL: Only save orders that belong to the current session
  // This prevents orders from other devices from being saved
  const currentSessionId = getCurrentOrderSession()
  if (currentSessionId !== null && order.table_session_id !== currentSessionId) {
    // Order belongs to a different session, don't save it
    return false
  }

  // Check if this is a new order (not an update to existing)
  const history = getStoredOrders()
  const isNewOrder = !history.some(o => o.id === order.id)

  // For new orders, clear the clear timestamp so they get saved
  if (isNewOrder) {
    localStorage.removeItem(CLEAR_TIMESTAMP_KEY)
  }

  // Skip if order was created before the last clear (only for updates)
  if (!isNewOrder && isOrderBeforeClear(order.created_at || null)) {
    return false
  }

  try {
    // Build image cache from existing orders to avoid re-fetching
    const imageCache = new Map<number, string>()
    for (const existingOrder of history) {
      for (const item of existingOrder.items) {
        if (item.item_image && item.menu_item_id) {
          imageCache.set(item.menu_item_id, item.item_image)
        }
      }
    }

    // Check if order already exists
    const existingIndex = history.findIndex(o => o.id === order.id)

    const storedOrder = await toStoredOrder(order, imageCache)

    if (existingIndex >= 0) {
      // Preserve existing images for items that don't have new images
      const existingOrder = history[existingIndex]
      const existingItemImages = new Map(
        existingOrder.items.map(item => [item.menu_item_id, item.item_image])
      )

      // Merge images: prefer new images, fall back to existing
      storedOrder.items = storedOrder.items.map(item => ({
        ...item,
        item_image: item.item_image || existingItemImages.get(item.menu_item_id) || ''
      }))

      // Update existing order
      history[existingIndex] = storedOrder
    } else {
      // Add new order to beginning
      history.unshift(storedOrder)
    }

    // Limit history size
    const trimmed = history.slice(0, MAX_HISTORY_SIZE)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))

    return true
  } catch (error) {
    console.error('[OrderHistory] Failed to save order:', error)
    return false
  }
}

/**
 * Remove order from localStorage history
 */
export function removeOrderFromHistory(orderId: number): boolean {
  if (typeof window === 'undefined') return false

  try {
    const history = getStoredOrders()
    const filtered = history.filter(o => o.id !== orderId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('[OrderHistory] Failed to remove order:', error)
    return false
  }
}

/**
 * Clear all order history
 */
export function clearOrderHistory(): boolean {
  if (typeof window === 'undefined') return false

  try {
    localStorage.removeItem(STORAGE_KEY)
    // Store timestamp of when history was cleared
    localStorage.setItem(CLEAR_TIMESTAMP_KEY, Date.now().toString())
    return true
  } catch (error) {
    console.error('[OrderHistory] Failed to clear history:', error)
    return false
  }
}

/**
 * Get order history statistics
 */
export function getOrderHistoryStats(): OrderHistoryStats {
  const orders = getStoredOrders()

  const totalOrders = orders.length
  const totalSpent = orders.reduce((sum, o) => sum + o.total_in_pesos, 0)
  const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0

  // Count item frequency
  const itemCounts = new Map<string, number>()
  orders.forEach(order => {
    order.items.forEach(item => {
      const count = itemCounts.get(item.item_name) || 0
      itemCounts.set(item.item_name, count + item.quantity)
    })
  })

  const mostOrderedItems = Array.from(itemCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    totalOrders,
    totalSpent,
    averageOrderValue,
    mostOrderedItems,
  }
}

/**
 * Hook for managing order history
 */
export function useOrderHistory(filters?: OrderHistoryFilters) {
  const [orders, setOrders] = useState<StoredOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const queryClient = useQueryClient()

  // Helper to apply filters to stored orders (defined early so it can be used in effects)
  const applyFilters = useCallback((storedOrders: StoredOrder[]): StoredOrder[] => {
    let filtered = storedOrders

    // Apply session filter - only show orders from current session
    if (filters?.sessionId != null && filters.sessionId !== '') {
      const sessionIdNum = typeof filters.sessionId === 'string'
        ? parseInt(filters.sessionId, 10)
        : filters.sessionId
      if (!isNaN(sessionIdNum)) {
        filtered = filtered.filter(o => o.table_session_id === sessionIdNum)
      }
    }

    // Apply status filter
    if (filters?.status && filters.status !== 'all') {
      switch (filters.status) {
        case 'active':
          filtered = filtered.filter(o =>
            ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
          )
          break
        case 'completed':
          filtered = filtered.filter(o => o.status === 'served')
          break
        case 'cancelled':
          filtered = filtered.filter(o => o.status === 'cancelled')
          break
      }
    }

    // Apply search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(o =>
        o.order_number.toLowerCase().includes(searchLower) ||
        o.items.some(item => item.item_name.toLowerCase().includes(searchLower))
      )
    }

    return filtered
  }, [filters?.sessionId, filters?.status, filters?.search])

  // Load orders on mount
  useEffect(() => {
    setOrders(applyFilters(getStoredOrders()))
    setIsLoading(false)
  }, [applyFilters])

  // Save order to history
  const saveOrder = useCallback(async (order: Order) => {
    const success = await saveOrderToHistory(order)
    if (success) {
      setOrders(applyFilters(getStoredOrders()))
      // Also update React Query cache for consistency
      queryClient.setQueryData(orderKeys.detail(order.id), order)
    }
    return success
  }, [queryClient, applyFilters])

  // Update existing order in history
  const updateOrder = useCallback(async (order: Order) => {
    const success = await saveOrderToHistory(order)
    if (success) {
      setOrders(applyFilters(getStoredOrders()))
      // Also update React Query cache for consistency
      queryClient.setQueryData(orderKeys.detail(order.id), order)
    }
    return success
  }, [queryClient, applyFilters])

  // Remove order from history
  const removeOrder = useCallback((orderId: number) => {
    const success = removeOrderFromHistory(orderId)
    if (success) {
      setOrders(applyFilters(getStoredOrders()))
    }
    return success
  }, [applyFilters])

  // Clear all history
  const clearHistory = useCallback(() => {
    const success = clearOrderHistory()
    if (success) {
      setOrders([])
    }
    return success
  }, [])

  // Get statistics
  const getStats = useCallback((): OrderHistoryStats => {
    return getOrderHistoryStats()
  }, [])

  // Get active orders
  const getActiveOrders = useCallback(() => {
    return orders.filter(o =>
      ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
    )
  }, [orders])

  // Get completed orders
  const getCompletedOrders = useCallback(() => {
    return orders.filter(o => o.status === 'served')
  }, [orders])

  // Get cancelled orders
  const getCancelledOrders = useCallback(() => {
    return orders.filter(o => o.status === 'cancelled')
  }, [orders])

  return {
    orders,
    isLoading,
    saveOrder,
    updateOrder,
    removeOrder,
    clearHistory,
    getStats,
    getActiveOrders,
    getCompletedOrders,
    getCancelledOrders,
  }
}
