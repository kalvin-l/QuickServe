/**
 * API Endpoint Definitions
 *
 * Centralized endpoint definitions for FastAPI backend
 * Base URL: http://localhost:8000/api
 */

export const API_ENDPOINTS = {
  // Menu Items
  MENU: '/menu',
  MENU_ITEM: (id: string | number) => `/menu/${id}`,
  MENU_TOGGLE_AVAILABILITY: (id: string | number) => `/menu/${id}/toggle-availability`,
  MENU_UPLOAD_IMAGE: (id: string | number) => `/menu/${id}/image`,

  // Menu Lists
  MENU_ADDONS: '/menu/addons/list',

  // Categories (standalone CRUD)
  CATEGORIES: '/categories',
  CATEGORY_BY_ID: (id: string | number) => `/categories/${id}`,

  // Addons (standalone CRUD - future)
  ADDONS: '/addons',
  ADDON_BY_ID: (id: string | number) => `/addons/${id}`,

  // Orders (future)
  ORDERS: '/orders',
  ORDER_BY_ID: (id: string | number) => `/orders/${id}`,

  // Cart
  CART: '/cart',
  CART_BY_SESSION: (sessionToken: string) => `/cart/session/${sessionToken}`,
  CART_BY_ID: (cartId: string) => `/cart/${cartId}`,
  CART_ITEMS: (cartId: string) => `/cart/${cartId}/items`,
  CART_ITEM: (cartId: string, itemId: string) => `/cart/${cartId}/items/${itemId}`,
  CART_CLEAR: (cartId: string) => `/cart/${cartId}/clear`,
  CART_SYNC: '/cart/sync',

  // Tables (future)
  TABLES: '/tables',
  TABLE_BY_ID: (id: string | number) => `/tables/${id}`,
  TABLE_QR_VALIDATE: '/tables/validate-qr',
  TABLE_REGENERATE_QR: (id: string | number) => `/tables/${id}/regenerate-qr`,
  TABLE_UPDATE_STATUS: (id: string | number) => `/tables/${id}/status`,
  TABLE_BY_LOCATION: (location: string) => `/tables/location/${location}`,
  TABLE_STATS: '/tables/stats/summary',

  // Groups (future)
  GROUPS: '/groups',
  GROUP_BY_ID: (id: string | number) => `/groups/${id}`,
  GROUP_JOIN: (id: string | number) => `/groups/${id}/join`,

  // Auth (future)
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REGISTER: '/auth/register',
  USER_PROFILE: '/user/profile',

  // Inventory
  INVENTORY: '/inventory',
  INVENTORY_ITEMS: '/inventory/items',
  INVENTORY_ITEM: (id: string | number) => `/inventory/items/${id}`,
  INVENTORY_ADJUST_STOCK: (id: string | number) => `/inventory/items/${id}/stock`,
  INVENTORY_RESTOCK: (id: string | number) => `/inventory/items/${id}/restock`,
  INVENTORY_SET_STOCK_LEVELS: (id: string | number) => `/inventory/items/${id}/stock-levels`,
  INVENTORY_LOW_STOCK: '/inventory/low-stock',
  INVENTORY_STATS: '/inventory/stats',
  INVENTORY_CATEGORIES: '/inventory/categories',
  INVENTORY_UNITS: '/inventory/units',
  INVENTORY_BULK_RESTOCK: '/inventory/bulk-restock',

  // Recipes/Ingredients
  RECIPES: '/recipes',
  RECIPE_INGREDIENTS: (menuItemId: string | number) => `/recipes/menu-items/${menuItemId}/ingredients`,
  RECIPE_INGREDIENT: (ingredientId: string | number) => `/recipes/ingredients/${ingredientId}`,
  RECIPE_CHECK_INVENTORY: (menuItemId: string | number) => `/recipes/menu-items/${menuItemId}/check-inventory`,
  RECIPE_DEDUCT_INVENTORY: (menuItemId: string | number) => `/recipes/menu-items/${menuItemId}/deduct-inventory`,
  ALL_RECIPES: '/recipes/all-recipes',
} as const;
