/**
 * Format Utilities
 * Common formatting functions for prices, slugs, etc.
 */

/**
 * Format price to Philippine Peso
 * @param price - Price in number
 * @returns Formatted price string (e.g., "₱123.45")
 */
export function formatPrice(price: number): string {
  return `₱${Number(price).toFixed(2)}`
}

/**
 * Convert a string to URL-friendly slug
 * @param str - String to slugify
 * @returns URL-friendly slug string
 */
export function slugify(str: string): string {
  if (!str) return ''
  return str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
