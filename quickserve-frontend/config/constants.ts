/**
 * Application-wide constants
 */

// Currency configuration
export const CURRENCY = {
  CODE: 'PHP',
  SYMBOL: '₱',
  LOCALE: 'en-PH',
} as const;

// Product size options
export const PRODUCT_SIZES = {
  SMALL: { name: 'Small', multiplier: 1 },
  MEDIUM: { name: 'Medium', multiplier: 1.2 },
  LARGE: { name: 'Large', multiplier: 1.4 },
  XLARGE: { name: 'Extra Large', multiplier: 1.6 },
} as const;

// Size price differentials (single source of truth)
export const SIZE_PRICES: Record<string, number> = {
  'Small': 0,
  'Medium': 0.50,
  'Large': 1.00,
  'Extra Large': 1.50,
  'Regular': 0,
  'XS': 0,
  'S': 0.25,
  'M': 0.50,
  'L': 0.75,
  'XL': 1.00,
} as const;

// Product temperatures
export const PRODUCT_TEMPERATURES = {
  HOT: 'Hot',
  ICED: 'Iced',
  BLENDED: 'Blended',
} as const;

// Addon categories
export const ADDON_CATEGORIES = {
  MILK: 'Milk',
  EXTRAS: 'Extras',
  TOPPINGS: 'Toppings',
  SYRUPS: 'Syrups',
  SWEETENERS: 'Sweeteners',
} as const;

// Cart configuration
export const CART_CONFIG = {
  MIN_ORDER_AMOUNT: 5,
  MAX_QUANTITY_PER_ITEM: 99,
} as const;

// UI Configuration
export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 3000,
  MODAL_ANIMATION_DURATION: 200,
} as const;

// Feature flags (for future use)
export const FEATURES = {
  ENABLE_FAVORITES: true,
  ENABLE_RATINGS: true,
  ENABLE_RECOMMENDATIONS: false,
  ENABLE_LOYALTY_PROGRAM: false,
} as const;
