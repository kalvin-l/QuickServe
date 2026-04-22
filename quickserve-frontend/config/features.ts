/**
 * Feature flags configuration
 * Toggle features on/off without code changes
 */

export const FEATURE_FLAGS = {
  // Cart & Ordering
  ENABLE_CART: true,
  ENABLE_FAVORITES: true,
  ENABLE_QUICK_ADD: true,

  // User Features
  ENABLE_USER_ACCOUNTS: false,
  ENABLE_ORDER_HISTORY: false,
  ENABLE_SAVED_ADDRESSES: false,

  // Social Features
  ENABLE_RATINGS: true,
  ENABLE_REVIEWS: false,
  ENABLE_SHARING: false,

  // Promotions
  ENABLE_PROMOTIONS: true,
  ENABLE_DISCOUNT_CODES: false,
  ENABLE_LOYALTY_PROGRAM: false,

  // Advanced Features
  ENABLE_RECOMMENDATIONS: false,
  ENABLE_SCHEDULED_ORDERS: false,
  ENABLE_GIFT_CARDS: false,
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}
