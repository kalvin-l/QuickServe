/**
 * Customer Order History Types
 * Types for localStorage-based order history persistence
 */

import type { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '@/types/order.types'

/**
 * Order item stored in history (simplified, no circular refs)
 */
export interface StoredOrderItem {
  id: number
  menu_item_id: number  // Product ID for looking up product details (image, etc.)
  item_name: string
  item_image?: string  // Store image URL directly for display
  quantity: number
  size_label?: string
  temperature?: string
  item_total: number
  item_total_in_pesos: number
  special_instructions?: string
}

/**
 * Payment info stored in history
 */
export interface StoredOrderPayment {
  method: PaymentMethod
  status: PaymentStatus
  amount: number
  amount_in_pesos: number
  payment_reference?: string
}

/**
 * Complete order stored in localStorage
 * This is a simplified version of Order type that can be safely stored
 */
export interface StoredOrder {
  // Order identifiers
  id: number
  order_number: string
  table_number?: number
  table_session_id?: number
  group_session_id?: number
  participant_id?: number

  // Order type
  order_type: OrderType
  status: OrderStatus

  // Customer info
  customer_name?: string

  // Amounts
  subtotal: number
  subtotal_in_pesos: number
  tax: number
  total: number
  total_in_pesos: number

  // Items
  items: StoredOrderItem[]

  // Payment
  payment?: StoredOrderPayment

  // Notes
  notes?: string

  // Timestamps
  created_at: string
  updated_at?: string

  // Metadata for offline storage
  stored_at: string
}

/**
 * Filter options for order history
 */
export interface OrderHistoryFilters {
  status?: 'all' | 'active' | 'completed' | 'cancelled'
  search?: string
  sessionId?: string | number  // Filter by session ID to show only current session's orders
}

/**
 * Order history statistics
 */
export interface OrderHistoryStats {
  totalOrders: number
  totalSpent: number
  averageOrderValue: number
  mostOrderedItems: Array<{ name: string; count: number }>
}

/**
 * Order status with label and color for UI
 */
export interface OrderStatusConfig {
  key: OrderStatus
  label: string
  color: string
  bgColor: string
  icon: string
}

/**
 * Order status step for timeline
 */
export interface OrderStatusStep {
  status: OrderStatus
  label: string
  icon: string
  completed: boolean
  current: boolean
}
