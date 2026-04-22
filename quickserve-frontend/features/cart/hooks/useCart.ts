/**
 * useCart Hook with Backend Sync
 *
 * Cart operations using localStorage as backup and backend for persistence.
 * Falls back to localStorage if backend is unavailable.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Product } from '@/types';
import type { CartItem, QRSession } from '../types/cart.types';
import { CART_CONFIG } from '@/config/constants';
import { cartService } from '@/lib/api/services/cartService';
import type {
  IndividualCartItem,
  IndividualCartItemCreate,
  GroupCartItemCreate,
} from '@/types/order.types';
import { useGroupStore } from '@/features/groups/store/groupStore';
import { useSession } from '@/contexts/SessionContext';
import { groupCartService } from '@/lib/api/services/orderService';

const CART_STORAGE_KEY = 'quickserve-cart';
const QR_SESSION_KEY = 'qr_session';
const CART_UPDATE_EVENT = 'cart-update';

/**
 * Dispatch cart update event to notify listeners
 */
function dispatchCartUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CART_UPDATE_EVENT));
  }
}

/**
 * Local cart state structure
 */
interface LocalCartState {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  tableContext: {
    qrCode: string;
    tableNumber: number;
    sessionToken?: string;
    sessionId?: string;
    tableId?: number;
  } | null;
}

/**
 * Generate unique cart item ID based on product and customizations
 */
function generateCartItemId(
  productId: number | string,
  customizations: CartItem['customizations']
): string {
  const sizeKey = customizations.sizeKey || 'default';
  const addonKeys = customizations.addons
    ?.map((a) => `${a.id}-${a.quantity}`)
    .sort()
    .join('|') || 'none';

  return `${productId}-${sizeKey}-${addonKeys}`;
}

/**
 * Calculate item total price
 */
function calculateItemTotal(
  basePrice: number,
  quantity: number,
  customizations: CartItem['customizations']
): number {
  let itemPrice = basePrice;

  // Add size price
  if (customizations.sizePrice) {
    itemPrice += customizations.sizePrice;
  }

  // Add addons price
  if (customizations.addons) {
    customizations.addons.forEach((addon) => {
      itemPrice += (addon.price_formatted || addon.price) * (addon.quantity || 1);
    });
  }

  return itemPrice * quantity;
}

/**
 * Read cart from localStorage
 */
function readCartFromStorage(): LocalCartState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.state || parsed;
  } catch (error) {
    console.error('Failed to read cart from storage:', error);
    return null;
  }
}

/**
 * Write cart to localStorage
 */
function writeCartToStorage(cart: LocalCartState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ state: cart }));
    dispatchCartUpdate();
  } catch (error) {
    console.error('Failed to write cart to storage:', error);
  }
}

/**
 * Calculate cart totals
 */
function calculateTotals(items: CartItem[]): { subtotal: number; tax: number; total: number; itemCount: number } {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = subtotal * 0; // No tax for now
  const total = subtotal + tax;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { subtotal, tax, total, itemCount };
}

/**
 * Convert local cart item to backend cart item format
 */
function localToBackendCartItem(item: CartItem): IndividualCartItemCreate {
  return {
    menu_item_id: typeof item.productId === 'string' ? parseInt(item.productId, 10) : item.productId,
    quantity: item.quantity,
    size_key: item.customizations.sizeKey,
    size_label: item.customizations.size,
    size_price: item.customizations.sizePrice,
    addons: item.customizations.addons?.map(addon => ({
      id: addon.id,
      name: addon.name,
      price: addon.price,
      quantity: addon.quantity,
    })),
    special_instructions: undefined, // Could add this to cart item if needed
  };
}

/**
 * Convert backend cart item to local cart item format
 */
function backendToLocalCartItem(item: IndividualCartItem): CartItem {
  return {
    id: item.id,
    productId: item.menu_item_id,
    name: item.item_name,
    image: item.item_image || '',
    price: item.base_price,
    quantity: item.quantity,
    customizations: {
      size: item.size_label,
      sizeKey: item.size_key,
      sizePrice: item.size_price,
      addons: item.addons?.map(addon => ({
        ...addon,
        totalPrice: addon.price * addon.quantity,
      })),
    },
    totalPrice: item.item_total,
  };
}

/**
 * Get cart ID from storage
 */
function getCartId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.cartId || null;
  } catch {
    return null;
  }
}

/**
 * Save cart ID to storage
 */
function saveCartId(cartId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    parsed.cartId = cartId;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.error('Failed to save cart ID:', error);
  }
}

/**
 * useCart Hook Return Type
 */
export interface UseCartReturn {
  // State
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  isEmpty: boolean;
  isLoading: boolean;
  isSynced: boolean;

  // Actions
  addToCart: (product: Product, quantity?: number, customizations?: CartItem['customizations']) => Promise<{ success: boolean; error?: string }>;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  incrementQuantity: (itemId: string) => void;
  decrementQuantity: (itemId: string) => void;
  clearCart: () => void;
  getItemById: (itemId: string) => CartItem | undefined;

  // Derived
  formattedTotal: string;
  formattedSubtotal: string;
  meetsMinimumOrder: boolean;

  // Session
  getQRSession: () => QRSession | null;
  setTableContext: (qrCode: string, tableNumber: number, sessionToken?: string, sessionId?: string, tableId?: number) => void;

  // Group Context (always false in simplified version)
  isGroupCart: boolean;
}

/**
 * useCart Hook
 */
export function useCart(): UseCartReturn {
  const [cart, setCart] = useState<LocalCartState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendCartId, setBackendCartId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Get session and group info for group cart routing
  // We'll use direct Zustand store access to avoid hook ordering issues
  const currentGroup = useGroupStore((state) => state.currentGroup);
  const { participant } = useSession();

  // Load cart on mount and listen for updates
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true);

      // First, try to load from backend if we have a session token
      const sessionToken = getQRSession()?.token;
      const savedCartId = getCartId();

      if (sessionToken && savedCartId) {
        try {
          // Try to fetch from backend
          const backendCart = await cartService.getCart(savedCartId);

          // Convert backend items to local format
          const localItems = backendCart.items.map(backendToLocalCartItem);
          const totals = calculateTotals(localItems);

          const newCartState: LocalCartState = {
            items: localItems,
            ...totals,
            tableContext: {
              qrCode: sessionToken,
              tableNumber: backendCart.table_id || 0,
              sessionToken: backendCart.session_token,
            },
          };

          setCart(newCartState);
          setBackendCartId(backendCart.cart_id);
          writeCartToStorage(newCartState);
          setIsOnline(true);
          setIsLoading(false);
          return;
        } catch (error) {
          console.warn('Failed to load cart from backend, using local storage:', error);
          setIsOnline(false);
        }
      } else if (sessionToken && !savedCartId) {
        // We have a session but no cart ID, try to get cart by session
        try {
          const backendCart = await cartService.getCartBySession(sessionToken);

          // Convert backend items to local format
          const localItems = backendCart.items.map(backendToLocalCartItem);
          const totals = calculateTotals(localItems);

          const newCartState: LocalCartState = {
            items: localItems,
            ...totals,
            tableContext: {
              qrCode: sessionToken,
              tableNumber: backendCart.table_id || 0,
              sessionToken: backendCart.session_token,
            },
          };

          setCart(newCartState);
          setBackendCartId(backendCart.cart_id);
          saveCartId(backendCart.cart_id);
          writeCartToStorage(newCartState);
          setIsOnline(true);
          setIsLoading(false);
          return;
        } catch (error) {
          console.warn('Failed to load cart by session, using local storage:', error);
          setIsOnline(false);
        }
      }

      // Fallback to localStorage
      const cartData = readCartFromStorage();
      setCart(cartData || { items: [], subtotal: 0, tax: 0, total: 0, itemCount: 0, tableContext: null });
      setIsLoading(false);
    };

    loadCart();

    // Listen for cart updates from other tabs/components
    const handleUpdate = () => {
      loadCart();
    };

    window.addEventListener(CART_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(CART_UPDATE_EVENT, handleUpdate);
  }, []);

  // Derived state
  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const tax = cart?.tax || 0;
  const total = cart?.total || 0;
  const itemCount = cart?.itemCount || 0;
  const isEmpty = items.length === 0;

  /**
   * Add to cart with backend sync and group cart routing
   */
  const addToCart = useCallback(async (
    product: Product,
    quantity: number = 1,
    customizations: CartItem['customizations'] = {}
  ): Promise<{ success: boolean; error?: string }> => {
    // Check if in group mode
    const isGroupMode = currentGroup?.payment_type === 'host_pays_all';

    if (isGroupMode && currentGroup) {
      // Add to group cart instead of just localStorage
      try {
        // Get participant info from localStorage
        let participantInfo = { id: undefined, uuid: undefined, name: 'Guest' };
        if (typeof window !== 'undefined') {
          try {
            const participantStr = localStorage.getItem('tableParticipant');
            console.log('[useCart] participantStr from localStorage:', participantStr);
            if (participantStr) {
              const participant = JSON.parse(participantStr);
              console.log('[useCart] Parsed participant data:', participant);
              // Store both the UUID (participant_id string) and the integer ID (id)
              participantInfo = {
                id: participant.id,  // Integer ID from SessionParticipant.id
                uuid: participant.participant_id,  // UUID string from SessionParticipant.participant_id
                name: 'Guest', // Default fallback
              };
              console.log('[useCart] Extracted participant IDs - id (int):', participantInfo.id, 'uuid (str):', participantInfo.uuid);
            } else {
              console.log('[useCart] No participant found in localStorage, using Guest');
            }
          } catch (e) {
            console.error('[useCart] Error parsing participant data:', e);
            // Silently continue with default participant info
          }
        }

        // Get participant name from group members if available
        console.log('[useCart] currentGroup:', currentGroup);
        console.log('[useCart] currentGroup.members:', currentGroup?.members);
        console.log('[useCart] participantInfo.id (integer to match):', participantInfo.id);

        if (participantInfo.id && currentGroup?.members) {
          console.log('[useCart] Searching for member with participant_id:', participantInfo.id);
          console.log('[useCart] Available members:', currentGroup.members.map((m: any) => ({ id: m.id, participant_id: m.participant_id, name: m.name })));
          const matchingMember = currentGroup.members.find(
            (member: any) => member.participant_id === participantInfo.id
          );
          console.log('[useCart] matchingMember:', matchingMember);
          if (matchingMember?.name) {
            participantInfo.name = matchingMember.name;
            console.log('[useCart] ✓ Found participant name from group members:', participantInfo.name);
          } else {
            console.log('[useCart] ✗ No matching member found or member has no name');
          }
        } else {
          console.log('[useCart] ✗ Cannot get participant name - participantInfo.id:', participantInfo.id, 'members exist:', !!currentGroup?.members);
        }

        console.log('[useCart] Final participantInfo:', participantInfo);

        // Get session_id from localStorage for permission verification
        let sessionId = '';
        if (typeof window !== 'undefined') {
          try {
            const tableSessionStr = localStorage.getItem('tableSession');
            const qrSessionStr = localStorage.getItem('qr_session');
            console.log('[useCart] tableSessionStr:', tableSessionStr);
            console.log('[useCart] qrSessionStr:', qrSessionStr);
            if (tableSessionStr) {
              const tableSession = JSON.parse(tableSessionStr);
              sessionId = tableSession.session_id || '';
            } else if (qrSessionStr) {
              const qrSession = JSON.parse(qrSessionStr);
              sessionId = qrSession.sessionId || '';
            }
            console.log('[useCart] sessionId:', sessionId);
          } catch (e) {
            console.error('[useCart] Failed to get session_id:', e);
          }
        }

        const groupCartItem: GroupCartItemCreate = {
          session_id: sessionId,
          menu_item_id: typeof product.id === 'number' ? product.id : parseInt(String(product.id)),
          participant_id: participantInfo.id,
          participant_name: participantInfo.name,
          quantity,
          size_key: customizations.sizeKey,
          size_label: customizations.size,
          size_price: customizations.sizePrice || 0,
          temperature: undefined, // CartItem doesn't support temperature
          addons: customizations.addons?.map(addon => ({
            id: typeof addon.id === 'number' ? addon.id : parseInt(String(addon.id)),
            name: addon.name,
            price: addon.price,
            quantity: addon.quantity || 1,
          })),
        };

        console.log('[useCart] groupCartItem to send:', groupCartItem);

        // Add to group cart via API
        try {
          await groupCartService.addItem(currentGroup.group_id, groupCartItem);
          console.log('[useCart] Item added to group cart successfully:', groupCartItem);
        } catch (apiError: any) {
          // Log error but continue with localStorage as fallback
          console.error('[useCart] Failed to add item to group cart:', apiError?.message || apiError);
          // Continue with localStorage as fallback so user can still order
        }
      } catch (error) {
        // Continue with localStorage as fallback
        console.error('[useCart] Group cart error, falling back to localStorage:', error);
      }
    }

    const cartItemId = generateCartItemId(product.id, customizations);
    const currentCart = readCartFromStorage() || { items: [], subtotal: 0, tax: 0, total: 0, itemCount: 0, tableContext: null };

    const existingItemIndex = currentCart.items.findIndex((item) => item.id === cartItemId);

    let updatedItems: CartItem[];
    let newItem: CartItem | undefined;

    if (existingItemIndex > -1) {
      // Update existing item quantity
      updatedItems = currentCart.items.map((item, index) =>
        index === existingItemIndex
          ? {
              ...item,
              quantity: item.quantity + quantity,
              totalPrice: calculateItemTotal(
                item.price,
                item.quantity + quantity,
                customizations
              ),
            }
          : item
      );
    } else {
      // Add new item
      newItem = {
        id: cartItemId,
        productId: product.id,
        name: product.name,
        description: product.description,
        image: product.image || product.image_url || '',
        price: product.price,
        quantity,
        customizations,
        totalPrice: calculateItemTotal(product.price, quantity, customizations),
      };
      console.log('[Cart] Adding new item to cart:', {
        cartItemId,
        productId: product.id,
        name: product.name,
        image: product.image || product.image_url || '',
        product_image: product.image,
        product_image_url: product.image_url,
        final_image: product.image || product.image_url || ''
      });
      updatedItems = [...currentCart.items, newItem];
    }

    // Recalculate totals
    const totals = calculateTotals(updatedItems);
    const updatedCart: LocalCartState = {
      items: updatedItems,
      ...totals,
      tableContext: currentCart.tableContext,
    };

    // Always update local state first (optimistic update)
    writeCartToStorage(updatedCart);
    setCart(updatedCart);

    // Try to sync with backend if we have a cart ID
    if (backendCartId && isOnline) {
      try {
        const backendItem = localToBackendCartItem(newItem || updatedItems[existingItemIndex]);

        if (existingItemIndex > -1 && newItem === undefined) {
          // Update existing item on backend
          await cartService.updateItem(backendCartId, cartItemId, {
            quantity: updatedItems[existingItemIndex].quantity,
          });
        } else {
          // Add new item to backend
          await cartService.addItem(backendCartId, backendItem);
        }

        setIsOnline(true);
      } catch (error) {
        console.warn('Failed to sync add to cart with backend:', error);
        setIsOnline(false);
        // Local state already updated, so we continue
      }
    } else if (isOnline && !backendCartId && getQRSession()?.token) {
      // Try to sync entire cart if we don't have a cart ID but are online
      try {
        const sessionToken = getQRSession()?.token;
        if (sessionToken) {
          const backendItems = updatedItems.map(localToBackendCartItem);
          const syncedCart = await cartService.syncCart(sessionToken, backendItems);
          setBackendCartId(syncedCart.cart_id);
          saveCartId(syncedCart.cart_id);
          setIsOnline(true);
        }
      } catch (error) {
        console.warn('Failed to sync cart with backend:', error);
        setIsOnline(false);
      }
    }

    return { success: true };
  }, [backendCartId, isOnline, currentGroup]);

  /**
   * Remove from cart with backend sync
   */
  const removeFromCart = useCallback(async (itemId: string) => {
    // Check if user is allowed to remove items in group mode
    const isGroupMode = currentGroup?.payment_type === 'host_pays_all';
    if (isGroupMode) {
      // Get session_id to check if user is host
      let sessionId = '';
      if (typeof window !== 'undefined') {
        try {
          const tableSessionStr = localStorage.getItem('tableSession');
          const qrSessionStr = localStorage.getItem('qr_session');
          if (tableSessionStr) {
            const tableSession = JSON.parse(tableSessionStr);
            sessionId = tableSession.session_id || '';
          } else if (qrSessionStr) {
            const qrSession = JSON.parse(qrSessionStr);
            sessionId = qrSession.sessionId || '';
          }
        } catch (e) {
          console.error('[useCart] Failed to get session_id:', e);
        }
      }

      // CORRECT: Compare participant ID (unique per device) not session ID (shared by all devices at table)
      const isHost = currentGroup?.host_participant_id === participant?.id;
      if (!isHost) {
        console.warn('[useCart] Participants cannot remove items in host-pays-all mode');
        return; // Silently ignore - button should be disabled anyway
      }
    }

    const currentCart = readCartFromStorage();
    if (!currentCart) return;

    const updatedItems = currentCart.items.filter((item) => item.id !== itemId);
    const totals = calculateTotals(updatedItems);
    const updatedCart: LocalCartState = {
      items: updatedItems,
      ...totals,
      tableContext: currentCart.tableContext,
    };

    // Always update local state first (optimistic update)
    writeCartToStorage(updatedCart);
    setCart(updatedCart);

    // Try to sync with backend if we have a cart ID
    if (backendCartId && isOnline) {
      try {
        await cartService.removeItem(backendCartId, itemId);
        setIsOnline(true);
      } catch (error) {
        console.warn('Failed to sync remove from cart with backend:', error);
        setIsOnline(false);
        // Local state already updated, so we continue
      }
    }
  }, [backendCartId, isOnline, currentGroup]);

  /**
   * Update quantity with backend sync
   */
  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    // Check if user is allowed to update items in group mode
    const isGroupMode = currentGroup?.payment_type === 'host_pays_all';
    if (isGroupMode) {
      // Get session_id to check if user is host
      let sessionId = '';
      if (typeof window !== 'undefined') {
        try {
          const tableSessionStr = localStorage.getItem('tableSession');
          const qrSessionStr = localStorage.getItem('qr_session');
          if (tableSessionStr) {
            const tableSession = JSON.parse(tableSessionStr);
            sessionId = tableSession.session_id || '';
          } else if (qrSessionStr) {
            const qrSession = JSON.parse(qrSessionStr);
            sessionId = qrSession.sessionId || '';
          }
        } catch (e) {
          console.error('[useCart] Failed to get session_id:', e);
        }
      }

      // CORRECT: Compare participant ID (unique per device) not session ID (shared by all devices at table)
      const isHost = currentGroup?.host_participant_id === participant?.id;
      if (!isHost) {
        console.warn('[useCart] Participants cannot update quantities in host-pays-all mode');
        return; // Silently ignore - button should be disabled anyway
      }
    }

    if (quantity < 1) {
      await removeFromCart(itemId);
      return;
    }

    const currentCart = readCartFromStorage();
    if (!currentCart) return;

    const updatedItems = currentCart.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            quantity,
            totalPrice: calculateItemTotal(item.price, quantity, item.customizations),
          }
        : item
    );

    const totals = calculateTotals(updatedItems);
    const updatedCart: LocalCartState = {
      items: updatedItems,
      ...totals,
      tableContext: currentCart.tableContext,
    };

    // Always update local state first (optimistic update)
    writeCartToStorage(updatedCart);
    setCart(updatedCart);

    // Try to sync with backend if we have a cart ID
    if (backendCartId && isOnline) {
      try {
        await cartService.updateItem(backendCartId, itemId, { quantity });
        setIsOnline(true);
      } catch (error) {
        console.warn('Failed to sync update quantity with backend:', error);
        setIsOnline(false);
        // Local state already updated, so we continue
      }
    }
  }, [backendCartId, isOnline, removeFromCart, currentGroup]);

  /**
   * Increment quantity
   */
  const incrementQuantity = useCallback((itemId: string) => {
    const currentCart = readCartFromStorage();
    if (!currentCart) return;

    const item = currentCart.items.find((i) => i.id === itemId);
    if (item && item.quantity < CART_CONFIG.MAX_QUANTITY_PER_ITEM) {
      updateQuantity(itemId, item.quantity + 1);
    }
  }, [updateQuantity]);

  /**
   * Decrement quantity
   */
  const decrementQuantity = useCallback((itemId: string) => {
    const currentCart = readCartFromStorage();
    if (!currentCart) return;

    const item = currentCart.items.find((i) => i.id === itemId);
    if (item && item.quantity > 1) {
      updateQuantity(itemId, item.quantity - 1);
    } else if (item) {
      removeFromCart(itemId);
    }
  }, [updateQuantity, removeFromCart]);

  /**
   * Clear cart with backend sync
   */
  const clearCart = useCallback(async () => {
    // Check if user is allowed to clear cart in group mode
    const isGroupMode = currentGroup?.payment_type === 'host_pays_all';
    if (isGroupMode) {
      // Get session_id to check if user is host
      let sessionId = '';
      if (typeof window !== 'undefined') {
        try {
          const tableSessionStr = localStorage.getItem('tableSession');
          const qrSessionStr = localStorage.getItem('qr_session');
          if (tableSessionStr) {
            const tableSession = JSON.parse(tableSessionStr);
            sessionId = tableSession.session_id || '';
          } else if (qrSessionStr) {
            const qrSession = JSON.parse(qrSessionStr);
            sessionId = qrSession.sessionId || '';
          }
        } catch (e) {
          console.error('[useCart] Failed to get session_id:', e);
        }
      }

      // CORRECT: Compare participant ID (unique per device) not session ID (shared by all devices at table)
      const isHost = currentGroup?.host_participant_id === participant?.id;
      if (!isHost) {
        console.warn('[useCart] Participants cannot clear cart in host-pays-all mode');
        return; // Silently ignore - button should be hidden anyway
      }
    }

    // Always update local state first (optimistic update)
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CART_STORAGE_KEY);
    const emptyCart = { items: [], subtotal: 0, tax: 0, total: 0, itemCount: 0, tableContext: null };
    setCart(emptyCart);

    // Try to sync with backend if we have a cart ID
    if (backendCartId && isOnline) {
      try {
        await cartService.clearCart(backendCartId);
        setIsOnline(true);
      } catch (error) {
        console.warn('Failed to sync clear cart with backend:', error);
        setIsOnline(false);
        // Local state already updated, so we continue
      }
    }
  }, [backendCartId, isOnline, currentGroup]);

  /**
   * Get item by ID
   */
  const getItemById = useCallback((itemId: string) => {
    return items.find((item) => item.id === itemId);
  }, [items]);

  /**
   * Check if meets minimum order
   */
  const meetsMinimumOrder = subtotal >= 5;

  /**
   * Get QR session
   */
  const getQRSession = useCallback((): QRSession | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(QR_SESSION_KEY);
      if (!stored) return null;
      const session = JSON.parse(stored);
      return {
        token: session.token,
        tableNumber: session.tableNumber,
        sessionId: session.sessionId,
        tableId: session.tableId,
      };
    } catch {
      return null;
    }
  }, []);

  /**
   * Set table context with optional session token and table ID
   */
  const setTableContext = useCallback((qrCode: string, tableNumber: number, sessionToken?: string, sessionId?: string, tableId?: number) => {
    const currentCart = readCartFromStorage() || { items: [], subtotal: 0, tax: 0, total: 0, itemCount: 0, tableContext: null };
    const updatedCart: LocalCartState = {
      ...currentCart,
      tableContext: { qrCode, tableNumber, sessionToken, sessionId, tableId },
    };
    writeCartToStorage(updatedCart);
    setCart(updatedCart);
  }, []);

  return {
    // State
    items,
    subtotal,
    tax,
    total,
    itemCount,
    isEmpty,
    isLoading,
    isSynced: !!backendCartId && isOnline,

    // Actions
    addToCart,
    removeFromCart,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    getItemById,

    // Derived
    formattedTotal: `₱${total.toFixed(2)}`,
    formattedSubtotal: `₱${subtotal.toFixed(2)}`,
    meetsMinimumOrder,

    // Session
    getQRSession,
    setTableContext,

    // Group Context
    isGroupCart: (function() {
      if (typeof window === 'undefined') return false;
      try {
        const { currentGroup } = useGroupStore.getState();
        return currentGroup?.payment_type === 'host_pays_all';
      } catch {
        return false;
      }
    })(),
  };
}

/**
 * Selector hooks for optimized re-renders
 * These are proper React hooks to avoid hydration mismatches
 */
export function useCartItems() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    // Read on mount
    const cart = readCartFromStorage();
    setItems(cart?.items || []);

    // Listen for cart updates
    const handleUpdate = () => {
      const updatedCart = readCartFromStorage();
      setItems(updatedCart?.items || []);
    };

    window.addEventListener(CART_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(CART_UPDATE_EVENT, handleUpdate);
  }, []);

  return items;
}

export function useCartTotal() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // Read on mount
    const cart = readCartFromStorage();
    setTotal(cart?.total || 0);

    // Listen for cart updates
    const handleUpdate = () => {
      const updatedCart = readCartFromStorage();
      setTotal(updatedCart?.total || 0);
    };

    window.addEventListener(CART_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(CART_UPDATE_EVENT, handleUpdate);
  }, []);

  return total;
}

export function useCartItemCount() {
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    // Read on mount
    const cart = readCartFromStorage();
    setItemCount(cart?.itemCount || 0);

    // Listen for cart updates
    const handleUpdate = () => {
      const updatedCart = readCartFromStorage();
      setItemCount(updatedCart?.itemCount || 0);
    };

    window.addEventListener(CART_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(CART_UPDATE_EVENT, handleUpdate);
  }, []);

  return itemCount;
}

/**
 * useIsGroupCart Hook
 * Reactive hook to detect if user is in group mode
 */
export function useIsGroupCart() {
  const [isGroupCart, setIsGroupCart] = useState(false);
  const currentGroup = useGroupStore((state) => state.currentGroup);

  useEffect(() => {
    setIsGroupCart(currentGroup?.payment_type === 'host_pays_all');
  }, [currentGroup?.payment_type]);

  return isGroupCart;
}
