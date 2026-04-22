import type { OrderStatus } from '@/types/order.types'

/**
 * Map backend status to UI status
 * Backend uses: pending, confirmed, preparing, ready, served, cancelled
 * UI uses: received, confirmed, preparing, ready, served, cancelled
 */
export const STATUS_MAP: Record<string, string> = {
  pending: 'received',
  confirmed: 'confirmed',
  preparing: 'preparing',
  ready: 'ready',
  served: 'served',
  cancelled: 'cancelled',
}

/**
 * Reverse map UI status to backend status
 */
export const REVERSE_STATUS_MAP: Record<string, OrderStatus> = {
  received: 'pending',
  confirmed: 'confirmed',
  preparing: 'preparing',
  ready: 'ready',
  served: 'served',
  cancelled: 'cancelled',
}
