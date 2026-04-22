/**
 * Individual Cart API Service
 * API calls for individual cart operations
 */

import { apiClient } from '../client';
import type {
  IndividualCart,
  IndividualCartItem,
  IndividualCartItemCreate,
  IndividualCartItemUpdate,
  CartSyncRequest,
} from '@/types/order.types';

const CART_BASE = '/cart';

// ============== Individual Cart Service ==============

export const cartService = {
  /**
   * Get or create cart for session
   */
  getCartBySession: async (sessionToken: string): Promise<IndividualCart> => {
    return apiClient.get<IndividualCart>(`${CART_BASE}/session/${sessionToken}`);
  },

  /**
   * Get cart by ID
   */
  getCart: async (cartId: string): Promise<IndividualCart> => {
    return apiClient.get<IndividualCart>(`${CART_BASE}/${cartId}`);
  },

  /**
   * Add item to cart
   */
  addItem: async (cartId: string, item: IndividualCartItemCreate): Promise<IndividualCartItem> => {
    return apiClient.post<IndividualCartItem>(`${CART_BASE}/${cartId}/items`, item);
  },

  /**
   * Update item in cart
   */
  updateItem: async (cartId: string, itemId: string, data: IndividualCartItemUpdate): Promise<IndividualCartItem> => {
    return apiClient.patch<IndividualCartItem>(`${CART_BASE}/${cartId}/items/${itemId}`, data);
  },

  /**
   * Remove item from cart
   */
  removeItem: async (cartId: string, itemId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`${CART_BASE}/${cartId}/items/${itemId}`);
  },

  /**
   * Clear all items from cart
   */
  clearCart: async (cartId: string): Promise<{ success: boolean; items_removed: number }> => {
    return apiClient.post<{ success: boolean; items_removed: number }>(`${CART_BASE}/${cartId}/clear`, {});
  },

  /**
   * Sync local cart to server (used for initial sync or after offline changes)
   */
  syncCart: async (sessionToken: string, items: IndividualCartItemCreate[]): Promise<IndividualCart> => {
    return apiClient.post<IndividualCart>(`${CART_BASE}/sync`, {
      session_token: sessionToken,
      items,
    } as CartSyncRequest);
  },
};

export default cartService;
