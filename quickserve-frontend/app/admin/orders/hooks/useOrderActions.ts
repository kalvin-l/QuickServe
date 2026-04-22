'use client'

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Order, OrderStatus } from '@/types/order.types'
import { useUpdateOrderStatus, useConfirmCashPayment } from '@/lib/api/queries/useOrders'

export interface UseOrderActionsReturn {
  /** Update order status */
  handleUpdateStatus: (orderId: number, newStatus: OrderStatus) => Promise<void>
  /** Confirm pending cash payment */
  handleConfirmPayment: (paymentId: number) => Promise<void>
  /** Open order details modal */
  openOrderDetails: (order: Order) => void
  /** Close order details modal */
  closeOrderDetails: () => void
  /** Selected order for modal */
  selectedOrder: Order | null
  /** Modal visibility state */
  showOrderModal: boolean
}

/**
 * Hook for order action handlers
 * Wraps mutation calls and modal state management
 */
export function useOrderActions(): UseOrderActionsReturn {
  const queryClient = useQueryClient()
  const updateStatusMutation = useUpdateOrderStatus()
  const confirmPaymentMutation = useConfirmCashPayment()

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)

  const handleUpdateStatus = useCallback(async (orderId: number, newStatus: OrderStatus) => {
    await updateStatusMutation.mutateAsync({ orderId, status: newStatus })
    // Refetch orders to get latest data
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] })
  }, [updateStatusMutation, queryClient])

  const handleConfirmPayment = useCallback(async (paymentId: number) => {
    await confirmPaymentMutation.mutateAsync(paymentId)
    // Refetch orders to get latest data
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] })
  }, [confirmPaymentMutation, queryClient])

  const openOrderDetails = useCallback((order: Order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
  }, [])

  const closeOrderDetails = useCallback(() => {
    setShowOrderModal(false)
    setSelectedOrder(null)
  }, [])

  return {
    handleUpdateStatus,
    handleConfirmPayment,
    openOrderDetails,
    closeOrderDetails,
    selectedOrder,
    showOrderModal,
  }
}
