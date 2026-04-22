/**
 * Product Utility Functions
 */

import type { Product, Addon } from '@/types';
import { ProductService } from '../services/productService';

/**
 * Calculate total price with customizations
 */
export function calculateProductPrice(
  product: Product,
  size?: string,
  addons?: Addon[]
): number {
  let total = product.price;

  // Add size price
  if (size) {
    total += ProductService.getSizePrice(size);
  }

  // Add addons price
  if (addons && addons.length > 0) {
    addons.forEach((addon) => {
      const addonPrice = addon.price_formatted || addon.price;
      const addonQty = addon.quantity || 1;
      total += addonPrice * addonQty;
    });
  }

  return total;
}

/**
 * Format product name with size
 */
export function formatProductName(product: Product, size?: string): string {
  if (!size) return product.name;
  return `${product.name} (${size})`;
}

/**
 * Get product availability status
 */
export function getProductStatus(product: Product): {
  available: boolean;
  text: string;
  color: string;
} {
  if (!product.available) {
    return {
      available: false,
      text: 'Out of Stock',
      color: 'bg-red-100 text-red-700',
    };
  }

  return {
    available: true,
    text: 'Available',
    color: 'bg-green-100 text-green-700',
  };
}

/**
 * Get rating display text
 */
export function getRatingDisplay(product: Product): string {
  if (!product.rating) return '';
  return `${product.rating.toFixed(1)} (${product.reviewCount || 0} reviews)`;
}

/**
 * Check if product is new (based on some criteria)
 */
export function isNewProduct(product: Product): boolean {
  // This is a placeholder - implement based on your needs
  // For example, check if product was created within last 30 days
  return product.badge?.text === 'New';
}

/**
 * Get product image URL with fallback
 */
export function getProductImage(product: Product): string {
  return product.image || product.image_url || '/images/placeholder-product.jpg';
}

/**
 * Truncate product description
 */
export function truncateDescription(description: string, maxLength: number = 100): string {
  if (description.length <= maxLength) return description;
  return description.slice(0, maxLength).trim() + '...';
}
