/**
 * Order React Query Hooks
 * React Query hooks for order operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { orderService, paymentService, groupCartService } from '../services/orderService';
import type {
  Order,
  OrderListResponse,
  CreateOrderRequest,
  OrderStatus,
  OrderType,
  KitchenQueueResponse,
  GroupOrdersResponse,
  CalculateTotalResponse,
  Payment,
  ReceiptData,
  GroupCart,
  GroupCartItem,
  GroupCartItemCreate,
  GroupCartItemUpdate,
  GroupCheckoutRequest,
  OrderItemCreate,
} from '@/types/order.types';

// ============== Query Keys ==============

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: number) => [...orderKeys.details(), id] as const,
  byNumber: (orderNumber: string) => [...orderKeys.all, 'number', orderNumber] as const,
  kitchen: () => [...orderKeys.all, 'kitchen'] as const,
  group: (groupId: number) => [...orderKeys.all, 'group', groupId] as const,
};

export const paymentKeys = {
  all: ['payments'] as const,
  detail: (id: number) => [...paymentKeys.all, 'detail', id] as const,
  byOrder: (orderId: number) => [...paymentKeys.all, 'order', orderId] as const,
  receipt: (paymentId: number) => [...paymentKeys.all, 'receipt', paymentId] as const,
};

export const groupCartKeys = {
  all: ['groupCart'] as const,
  cart: (groupId: string) => [...groupCartKeys.all, groupId] as const,
};

// ============== Order Hooks ==============

/**
 * Get orders with optional filters
 */
export function useOrders(params?: {
  status?: OrderStatus;
  order_type?: OrderType;
  table_id?: number;
  group_session_id?: number;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: orderKeys.list(params || {}),
    queryFn: () => orderService.getOrders(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get a single order by ID
 */
export function useOrder(orderId: number | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(orderId!),
    queryFn: () => orderService.getOrder(orderId!),
    enabled: !!orderId,
  });
}

/**
 * Get a single order by order number
 */
export function useOrderByNumber(orderNumber: string | undefined) {
  return useQuery({
    queryKey: orderKeys.byNumber(orderNumber!),
    queryFn: () => orderService.getOrderByNumber(orderNumber!),
    enabled: !!orderNumber,
  });
}

/**
 * Get kitchen queue
 */
export function useKitchenQueue() {
  return useQuery({
    queryKey: orderKeys.kitchen(),
    queryFn: () => orderService.getKitchenQueue(),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
  });
}

/**
 * Get orders for a group session
 */
export function useGroupOrders(groupSessionId: number | undefined) {
  return useQuery({
    queryKey: orderKeys.group(groupSessionId!),
    queryFn: () => orderService.getGroupOrders(groupSessionId!),
    enabled: !!groupSessionId,
  });
}

/**
 * Create a new order
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderRequest) => orderService.createOrder(data),
    onSuccess: (order) => {
      // Invalidate order lists
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.kitchen() });

      toast.success(`Order ${order.order_number} created successfully!`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create order: ${error.message}`);
    },
  });
}

/**
 * Update order status
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: OrderStatus }) =>
      orderService.updateOrderStatus(orderId, status),
    onSuccess: (order) => {
      // Update cache
      queryClient.setQueryData(orderKeys.detail(order.id), order);

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.kitchen() });

      toast.success(`Order status updated to ${order.status}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

/**
 * Cancel an order
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => orderService.cancelOrder(orderId),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.kitchen() });

      toast.success('Order cancelled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel order: ${error.message}`);
    },
  });
}

/**
 * Calculate order total (preview)
 */
export function useCalculateTotal() {
  return useMutation({
    mutationFn: (items: OrderItemCreate[]) => orderService.calculateTotal(items),
  });
}

// ============== Payment Hooks ==============

/**
 * Get payment by ID
 */
export function usePayment(paymentId: number | undefined) {
  return useQuery({
    queryKey: paymentKeys.detail(paymentId!),
    queryFn: () => paymentService.getPayment(paymentId!),
    enabled: !!paymentId,
  });
}

/**
 * Get payment for an order
 */
export function usePaymentByOrder(orderId: number | undefined) {
  return useQuery({
    queryKey: paymentKeys.byOrder(orderId!),
    queryFn: () => paymentService.getPaymentByOrder(orderId!),
    enabled: !!orderId,
  });
}

/**
 * Get receipt for a payment
 */
export function useReceipt(paymentId: number | undefined) {
  return useQuery({
    queryKey: paymentKeys.receipt(paymentId!),
    queryFn: () => paymentService.getReceipt(paymentId!),
    enabled: !!paymentId,
  });
}

/**
 * Retry a failed payment
 */
export function useRetryPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, newMethod }: { paymentId: number; newMethod?: string }) =>
      paymentService.retryPayment(paymentId, newMethod),
    onSuccess: (payment) => {
      queryClient.setQueryData(paymentKeys.detail(payment.id), payment);
      queryClient.invalidateQueries({ queryKey: paymentKeys.byOrder(payment.order_id) });

      if (payment.status === 'completed') {
        toast.success('Payment successful!');
      } else {
        toast.error('Payment failed. Please try again.');
      }
    },
    onError: (error: Error) => {
      toast.error(`Payment retry failed: ${error.message}`);
    },
  });
}

/**
 * Confirm a cash payment
 */
export function useConfirmCashPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: number) => paymentService.confirmCashPayment(paymentId),
    onSuccess: (payment) => {
      queryClient.setQueryData(paymentKeys.detail(payment.id), payment);
      queryClient.invalidateQueries({ queryKey: paymentKeys.byOrder(payment.order_id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });

      toast.success('Payment confirmed');
    },
    onError: (error: Error) => {
      toast.error(`Confirmation failed: ${error.message}`);
    },
  });
}

// ============== Group Cart Hooks ==============

/**
 * Get group cart
 */
export function useGroupCart(groupId: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: groupCartKeys.cart(groupId!),
    queryFn: () => groupCartService.getCart(groupId!),
    enabled: !!groupId,
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 30 * 1000, // Poll every 30 seconds (WebSocket handles real-time updates)
    refetchIntervalInBackground: true, // Continue polling when tab is in background
  });
}

/**
 * Add item to group cart
 */
export function useAddToGroupCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, item }: { groupId: string; item: GroupCartItemCreate }) =>
      groupCartService.addItem(groupId, item),
    onSuccess: (data, variables) => {
      console.log('[useAddToGroupCart] Item added successfully, invalidating cart query');
      queryClient.invalidateQueries({ queryKey: groupCartKeys.cart(variables.groupId) });
      toast.success('Item added to group cart');
    },
    onError: (error: Error) => {
      console.error('[useAddToGroupCart] Failed to add item:', error);
      toast.error(`Failed to add item: ${error.message}`);
    },
  });
}

/**
 * Update item in group cart
 */
export function useUpdateGroupCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, itemId, data }: { groupId: string; itemId: number; data: GroupCartItemUpdate }) =>
      groupCartService.updateItem(groupId, itemId, data),
    onSuccess: (_, variables) => {
      console.log('[useUpdateGroupCartItem] Item updated successfully, invalidating cart query');
      queryClient.invalidateQueries({ queryKey: groupCartKeys.cart(variables.groupId) });
    },
    onError: (error: Error) => {
      console.error('[useUpdateGroupCartItem] Failed to update item:', error);
      toast.error(`Failed to update item: ${error.message}`);
    },
  });
}

/**
 * Remove item from group cart
 */
export function useRemoveFromGroupCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, itemId, sessionId }: { groupId: string; itemId: number; sessionId: string }) =>
      groupCartService.removeItem(groupId, itemId, sessionId),
    onSuccess: (_, variables) => {
      console.log('[useRemoveFromGroupCart] Item removed successfully, invalidating cart query');
      queryClient.invalidateQueries({ queryKey: groupCartKeys.cart(variables.groupId) });
      toast.success('Item removed from cart');
    },
    onError: (error: Error) => {
      console.error('[useRemoveFromGroupCart] Failed to remove item:', error);
      toast.error(`Failed to remove item: ${error.message}`);
    },
  });
}

/**
 * Clear group cart
 */
export function useClearGroupCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, sessionId }: { groupId: string; sessionId: string }) =>
      groupCartService.clearCart(groupId, sessionId),
    onSuccess: (_, variables) => {
      console.log('[useClearGroupCart] Cart cleared successfully, invalidating cart query');
      queryClient.invalidateQueries({ queryKey: groupCartKeys.cart(variables.groupId) });
      toast.success('Cart cleared');
    },
    onError: (error: Error) => {
      console.error('[useClearGroupCart] Failed to clear cart:', error);
      toast.error(`Failed to clear cart: ${error.message}`);
    },
  });
}

/**
 * Checkout group cart (host pays all)
 */
export function useGroupCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: GroupCheckoutRequest }) =>
      groupCartService.checkout(groupId, data),
    onSuccess: (order, variables) => {
      // Clear group cart cache
      queryClient.invalidateQueries({ queryKey: groupCartKeys.cart(variables.groupId) });

      // Invalidate order lists
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.kitchen() });

      toast.success(`Order ${order.order_number} created successfully!`);
    },
    onError: (error: Error) => {
      toast.error(`Checkout failed: ${error.message}`);
    },
  });
}
