/**
 * Cart Feature Types
 */

import type { Product, Addon } from '@/types';

/**
 * Cart item representing a product in the cart with customizations
 */
export interface CartItem {
  id: string; // Unique cart item ID (not product ID)
  productId: number | string;
  name: string;
  description?: string;
  image: string;
  price: number; // Base price
  quantity: number;
  customizations: {
    size?: string;
    sizeKey?: string;
    sizePrice?: number;
    addons?: CartAddon[];
  };
  totalPrice: number; // Price including customizations * quantity
}

/**
 * Addon in cart with quantity
 */
export interface CartAddon extends Addon {
  quantity: number;
  totalPrice: number;
}

/**
 * Table context for orders
 */
export interface TableContext {
  qrCode: string;
  tableNumber: number;
  sessionToken?: string;
  sessionId?: string;
  tableId?: number;
}

/**
 * QR session data stored in localStorage
 */
export interface QRSession {
  token: string;
  tableNumber: number;
  sessionId: string;
  tableId: number;
}

/**
 * Cart state structure
 */
export interface CartState {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  tableContext: TableContext | null;
}

/**
 * Cart store with Zustand
 */
export interface CartStore extends CartState {
  // Actions
  addItem: (product: Product, quantity: number, customizations: CartItem['customizations']) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  incrementItem: (itemId: string) => void;
  decrementItem: (itemId: string) => void;
  getItemById: (itemId: string) => CartItem | undefined;
  setTableContext: (qrCode: string, tableNumber: number, sessionToken?: string, sessionId?: string, tableId?: number) => void;
  clearTableContext: () => void;
  getQRSession: () => QRSession | null;
  // Computed
  calculateTotals: () => void;
}

/**
 * Cart item input for adding to cart
 */
export interface AddToCartInput {
  product: Product;
  quantity: number;
  customizations: {
    size?: string;
    sizeKey?: string;
    sizePrice?: number;
    addons?: Addon[];
  };
}
