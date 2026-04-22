/**
 * Shared Utilities
 * Re-exports all utility functions for cleaner imports
 *
 * This provides backward compatibility with existing imports
 * while organizing utilities into logical modules.
 */

// UI Utilities
export { cn } from './ui'

// Format Utilities
export {
  formatPrice,
  slugify,
  getPhilippinesTime,
  toPhilippinesTime,
  parseDate,
  formatTimeAgo,
  formatTime,
  formatDate,
  formatDateTime,
  formatFullDateTime,
  getPhilippinesTimezoneInfo,
} from './format'

// Device Utilities
export {
  getOrCreateDeviceId,
  getDeviceName,
  clearDeviceInfo,
  getDeviceInfo,
  persistCart,
  restoreCart,
  clearCartBackup,
  getCartBackupInfo,
  getCartBackupTimeRemaining,
} from './device'

// Category Utilities
export {
  getCategoryInfo,
  getCategoryIconById,
  getCategoryIcon,
  getCategoryName,
  getCategoryDescription,
  getAllCategories,
} from './category'

// Re-export types
export type { CartBackup } from './device'
export type { CategoryInfo } from './category'

/**
 * @deprecated Use import from './category' directly
 * Get time-based greeting (Philippines Time)
 */
export function getGreeting(): string {
  // Get current hour in Philippines timezone
  const now = new Date()
  const philippinesHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' })).getHours()

  if (philippinesHour < 12) return 'Good Morning'
  if (philippinesHour < 17) return 'Good Afternoon'
  return 'Good Evening'
}
