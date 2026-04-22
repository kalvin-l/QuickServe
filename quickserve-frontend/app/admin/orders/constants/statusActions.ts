import type { OrderStatus } from '@/types/order.types'

export interface StatusAction {
  label: string
  nextStatus: OrderStatus
}

/**
 * Map order status to the next action that should be available
 * Used for the primary action button in the order details modal
 */
export const statusActions: Record<OrderStatus, StatusAction | null> = {
  pending: { label: 'Confirm Order', nextStatus: 'confirmed' },
  confirmed: { label: 'Start Preparing', nextStatus: 'preparing' },
  preparing: { label: 'Mark Ready', nextStatus: 'ready' },
  ready: { label: 'Serve', nextStatus: 'served' },
  served: null,
  cancelled: null,
}
