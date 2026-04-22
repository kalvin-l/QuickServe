'use client'

import { useMemo } from 'react'
import type { Order } from '@/types/order.types'
import { REVERSE_STATUS_MAP } from '../constants/statusMaps'

export interface UseOrderFiltersAndSortProps {
  /** All orders to filter */
  orders: Order[]
  /** Active tab filter */
  activeTab: string
  /** Active status filter */
  activeStatus: string
  /** Search query */
  searchQuery: string
}

export interface UseOrderFiltersAndSortReturn {
  /** Filtered orders */
  filteredOrders: Order[]
  /** Order statistics */
  stats: {
    pending: number
    kitchen: number
    ready: number
    served: number
  }
}

/**
 * Hook for filtering and sorting orders
 * Returns filtered orders and computed statistics
 */
export function useOrderFiltersAndSort({
  orders,
  activeTab,
  activeStatus,
  searchQuery,
}: UseOrderFiltersAndSortProps): UseOrderFiltersAndSortReturn {
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === 'kitchen') {
        if (!['pending', 'confirmed', 'preparing'].includes(order.status)) return false
      } else if (activeTab === 'individual') {
        if (order.order_type !== 'individual') return false
      } else if (activeTab === 'group') {
        if (!['group_split', 'group_host'].includes(order.order_type)) return false
      }

      // Status filter
      if (activeStatus !== 'all') {
        const backendStatus = REVERSE_STATUS_MAP[activeStatus]
        if (order.status !== backendStatus) return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchFields = [
          order.order_number,
          order.table_number?.toString(),
          order.customer_name,
          order.items?.map(i => i.item_name).join(' ')
        ].filter(Boolean).join(' ').toLowerCase()

        return searchFields.includes(query)
      }

      return true
    })
  }, [orders, activeTab, activeStatus, searchQuery])

  const stats = useMemo(() => ({
    pending: orders.filter((o) => o.status === 'pending').length,
    kitchen: orders.filter((o) => ['pending', 'confirmed', 'preparing'].includes(o.status)).length,
    ready: orders.filter((o) => o.status === 'ready').length,
    served: orders.filter((o) => o.status === 'served').length
  }), [orders])

  return {
    filteredOrders,
    stats,
  }
}
