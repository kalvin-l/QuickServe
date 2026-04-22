/**
 * UI Utilities
 * Tailwind CSS class merging and other UI helpers
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with proper precedence.
 * Combines clsx for conditional class handling and tailwind-merge
 * for proper Tailwind class conflict resolution.
 *
 * @param inputs - Class values (strings, arrays, objects)
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
