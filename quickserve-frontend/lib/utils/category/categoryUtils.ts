/**
 * Category Utilities
 * Consolidated category information, icons, and descriptions
 */

export interface CategoryInfo {
  id: string
  name: string
  icon: string
}

// Category map for ID-based lookups
const CATEGORY_MAP: Record<string, CategoryInfo> = {
  'hot-drinks': {
    id: 'hot-drinks',
    name: 'Hot Drinks',
    icon: 'fa-mug-hot',
  },
  'cold-drinks': {
    id: 'cold-drinks',
    name: 'Cold Drinks',
    icon: 'fa-glass-whiskey',
  },
  coffee: {
    id: 'coffee',
    name: 'Coffee',
    icon: 'fa-mug-hot',
  },
  tea: {
    id: 'tea',
    name: 'Tea',
    icon: 'fa-leaf',
  },
  pastries: {
    id: 'pastries',
    name: 'Pastries',
    icon: 'fa-bread-slice',
  },
  desserts: {
    id: 'desserts',
    name: 'Desserts',
    icon: 'fa-ice-cream',
  },
  sandwiches: {
    id: 'sandwiches',
    name: 'Sandwiches',
    icon: 'fa-hamburger',
  },
  'uncategorized': {
    id: 'uncategorized',
    name: 'Uncategorized',
    icon: 'fa-utensils',
  },
}

// Icon map for name-based lookups (supports various formats)
const ICON_MAP: Record<string, string> = {
  'hot drinks': 'fa-mug-hot',
  'cold drinks': 'fa-glass-water',
  'coffee': 'fa-mug-hot',
  'tea': 'fa-leaf',
  'pastries': 'fa-bread-slice',
  'sandwiches': 'fa-utensils',
  'desserts': 'fa-cookie-bite',
  'beverages': 'fa-glass-water',
  'food': 'fa-utensils',
  'snacks': 'fa-cookie',
  'specialty coffee': 'fa-coffee',
  'tea & infusions': 'fa-leaf',
  'test': 'fa-flask',
}

// Description map for category names
const DESCRIPTION_MAP: Record<string, string> = {
  'hot drinks': 'Warm and comforting beverages',
  'cold drinks': 'Refreshing cold beverages',
  'coffee': 'Premium coffee selections',
  'tea': 'Fine tea selections',
  'pastries': 'Freshly baked goods',
  'sandwiches': 'Delicious sandwiches',
  'desserts': 'Sweet treats and desserts',
  'beverages': 'Refreshing drinks',
  'food': 'Delicious food options',
  'snacks': 'Quick bites and snacks',
  'specialty coffee': 'Premium specialty coffee',
  'tea & infusions': 'Relaxing tea and infusions',
}

/**
 * Get category info by ID
 * @param categoryId - Category ID (e.g., 'hot-drinks', 'coffee')
 * @returns CategoryInfo object
 */
export function getCategoryInfo(categoryId: string): CategoryInfo {
  return CATEGORY_MAP[categoryId] || CATEGORY_MAP['uncategorized']
}

/**
 * Get category icon by ID (returns FontAwesome icon class only)
 * @param categoryId - Category ID
 * @returns FontAwesome icon class (e.g., 'fa-mug-hot')
 */
export function getCategoryIconById(categoryId: string): string {
  return getCategoryInfo(categoryId).icon
}

/**
 * Get category icon by name (returns full FontAwesome class string)
 * @param categoryName - Category name (e.g., 'Hot Drinks', 'Coffee')
 * @returns Full FontAwesome class string (e.g., 'fas fa-mug-hot')
 */
export function getCategoryIcon(categoryName: string): string {
  const icon = ICON_MAP[categoryName?.toLowerCase()] || 'fa-coffee'
  return `fas ${icon}`
}

/**
 * Get category name by ID
 * @param categoryId - Category ID
 * @returns Category name
 */
export function getCategoryName(categoryId: string): string {
  return getCategoryInfo(categoryId).name
}

/**
 * Get category description by name
 * @param categoryName - Category name
 * @returns Category description
 */
export function getCategoryDescription(categoryName: string): string {
  return DESCRIPTION_MAP[categoryName?.toLowerCase()] || `Browse our ${categoryName} selection`
}

/**
 * Get all categories (excluding uncategorized)
 * @returns Array of CategoryInfo objects
 */
export function getAllCategories(): CategoryInfo[] {
  return Object.values(CATEGORY_MAP).filter((c) => c.id !== 'uncategorized')
}
