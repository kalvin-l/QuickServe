/**
 * Order API Service
 * API calls for order operations
 */

import { apiClient } from '../client';
import type {
  Order,
  OrderListResponse,
  CreateOrderRequest,
  OrderStatusUpdateRequest,
  CalculateTotalRequest,
  CalculateTotalResponse,
  KitchenQueueResponse,
  GroupOrdersResponse,
  Payment,
  ReceiptData,
  GroupCart,
  GroupCartItem,
  GroupCartItemCreate,
  GroupCartItemUpdate,
  GroupCheckoutRequest,
  OrderStatus,
  OrderType,
} from '@/types/order.types';

const ORDERS_BASE = '/orders';
const PAYMENTS_BASE = '/payments';
const GROUPS_BASE = '/groups';

// ============== Order Service ==============

export const orderService = {
  /**
   * Create a new order
   */
  createOrder: async (data: CreateOrderRequest): Promise<Order> => {
    return apiClient.post<Order>(ORDERS_BASE, data);
  },

  /**
   * Get orders with optional filters
   */
  getOrders: async (params?: {
    status?: OrderStatus;
    order_type?: OrderType;
    table_id?: number;
    group_session_id?: number;
    page?: number;
    page_size?: number;
  }): Promise<OrderListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.order_type) queryParams.append('order_type', params.order_type);
    if (params?.table_id) queryParams.append('table_id', params.table_id.toString());
    if (params?.group_session_id) queryParams.append('group_session_id', params.group_session_id.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    const query = queryParams.toString();
    return apiClient.get<OrderListResponse>(`${ORDERS_BASE}${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single order by ID
   */
  getOrder: async (orderId: number): Promise<Order> => {
    return apiClient.get<Order>(`${ORDERS_BASE}/${orderId}`);
  },

  /**
   * Get a single order by order number
   */
  getOrderByNumber: async (orderNumber: string): Promise<Order> => {
    return apiClient.get<Order>(`${ORDERS_BASE}/number/${orderNumber}`);
  },

  /**
   * Update order status
   */
  updateOrderStatus: async (orderId: number, status: OrderStatus): Promise<Order> => {
    return apiClient.patch<Order>(`${ORDERS_BASE}/${orderId}/status`, { status });
  },

  /**
   * Cancel an order
   */
  cancelOrder: async (orderId: number): Promise<Order> => {
    return apiClient.post<Order>(`${ORDERS_BASE}/${orderId}/cancel`, {});
  },

  /**
   * Get kitchen queue (orders in pending, confirmed, preparing, ready status)
   */
  getKitchenQueue: async (): Promise<KitchenQueueResponse> => {
    return apiClient.get<KitchenQueueResponse>(`${ORDERS_BASE}/kitchen/queue`);
  },

  /**
   * Get all orders for a group session
   */
  getGroupOrders: async (groupSessionId: number): Promise<GroupOrdersResponse> => {
    return apiClient.get<GroupOrdersResponse>(`${ORDERS_BASE}/group/${groupSessionId}`);
  },

  /**
   * Calculate order total before submission (preview)
   */
  calculateTotal: async (items: CalculateTotalRequest['items']): Promise<CalculateTotalResponse> => {
    return apiClient.post<CalculateTotalResponse>(`${ORDERS_BASE}/calculate-total`, { items });
  },
};

// ============== Payment Service ==============

export const paymentService = {
  /**
   * Get payment by ID
   */
  getPayment: async (paymentId: number): Promise<Payment> => {
    return apiClient.get<Payment>(`${PAYMENTS_BASE}/${paymentId}`);
  },

  /**
   * Get payment by reference
   */
  getPaymentByReference: async (paymentReference: string): Promise<Payment> => {
    return apiClient.get<Payment>(`${PAYMENTS_BASE}/reference/${paymentReference}`);
  },

  /**
   * Get payment for an order
   */
  getPaymentByOrder: async (orderId: number): Promise<Payment> => {
    return apiClient.get<Payment>(`${PAYMENTS_BASE}/order/${orderId}`);
  },

  /**
   * Get receipt for a payment
   */
  getReceipt: async (paymentId: number): Promise<ReceiptData> => {
    return apiClient.get<ReceiptData>(`${PAYMENTS_BASE}/${paymentId}/receipt`);
  },

  /**
   * Retry a failed payment
   */
  retryPayment: async (paymentId: number, newMethod?: string): Promise<Payment> => {
    return apiClient.post<Payment>(`${PAYMENTS_BASE}/${paymentId}/retry`,
      newMethod ? { method: newMethod } : {}
    );
  },

  /**
   * Confirm a cash payment
   */
  confirmCashPayment: async (paymentId: number): Promise<Payment> => {
    return apiClient.post<Payment>(`${PAYMENTS_BASE}/${paymentId}/confirm-cash`, {});
  },
};

// ============== Group Cart Service ==============

export const groupCartService = {
  /**
   * Get group cart
   */
  getCart: async (groupId: string): Promise<GroupCart> => {
    console.log('[groupCartService.getCart] Fetching cart for groupId:', groupId);
    const result = await apiClient.get<GroupCart>(`${GROUPS_BASE}/${groupId}/cart`);
    console.log('[groupCartService.getCart] Response:', result);
    // Log each item's image data
    if (result.items && Array.isArray(result.items)) {
      result.items.forEach((item, index) => {
        console.log(`[groupCartService.getCart] Item ${index}:`, {
          id: item.id,
          item_name: item.item_name,
          item_image: item.item_image,
          participant_name: item.participant_name,
        });
      });
    }
    return result;
  },

  /**
   * Add item to group cart
   */
  addItem: async (groupId: string, item: GroupCartItemCreate): Promise<GroupCartItem> => {
    console.log('[groupCartService.addItem] Adding item to cart:', { groupId, item });
    const result = await apiClient.post<GroupCartItem>(`${GROUPS_BASE}/${groupId}/cart/items`, item);
    console.log('[groupCartService.addItem] Response:', result);
    return result;
  },

  /**
   * Update item in group cart
   */
  updateItem: async (groupId: string, itemId: number, data: GroupCartItemUpdate): Promise<GroupCartItem> => {
    return apiClient.patch<GroupCartItem>(`${GROUPS_BASE}/${groupId}/cart/items/${itemId}`, data);
  },

  /**
   * Remove item from group cart
   */
  removeItem: async (groupId: string, itemId: number, sessionId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`${GROUPS_BASE}/${groupId}/cart/items/${itemId}?session_id=${sessionId}`);
  },

  /**
   * Clear all items from group cart
   */
  clearCart: async (groupId: string, sessionId: string): Promise<{ success: boolean; items_removed: number }> => {
    return apiClient.post<{ success: boolean; items_removed: number }>(`${GROUPS_BASE}/${groupId}/cart/clear?session_id=${sessionId}`, {});
  },

  /**
   * Checkout group cart (host pays all)
   */
  checkout: async (groupId: string, data: GroupCheckoutRequest): Promise<Order> => {
    return apiClient.post<Order>(`${GROUPS_BASE}/${groupId}/checkout`, data);
  },
};

export default orderService;
