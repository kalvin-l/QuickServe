/**
 * Cart Feature Barrel Export
 *
 * Simplified cart implementation using localStorage directly.
 */

export { useCart, useCartItems, useCartTotal, useCartItemCount } from './hooks/useCart';
export type { CartItem, CartAddon, CartState, AddToCartInput } from './types/cart.types';
