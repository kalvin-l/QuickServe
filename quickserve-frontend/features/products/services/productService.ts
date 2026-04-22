/**
 * Product Service
 *
 * Business logic for product operations
 * When connecting to backend, this will use the API client
 */

import type { Product, Category } from '@/types';
import { products as mockProducts, categories as mockCategories } from '@/data';

/**
 * Product Service
 */
export class ProductService {
  /**
   * Get all products
   * TODO: Replace with API call when backend is ready
   */
  static async getAllProducts(): Promise<Product[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    return mockProducts;
  }

  /**
   * Get product by ID
   */
  static async getProductById(id: number | string): Promise<Product | undefined> {
    const products = await this.getAllProducts();
    return products.find((p) => p.id === id);
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(categoryId: string): Promise<Product[]> {
    const products = await this.getAllProducts();
    if (categoryId === 'all') {
      return products;
    }
    return products.filter((p) => p.category === categoryId);
  }

  /**
   * Get featured products
   */
  static async getFeaturedProducts(): Promise<Product[]> {
    const products = await this.getAllProducts();
    return products.filter((p) => p.featured);
  }

  /**
   * Get popular products
   */
  static async getPopularProducts(): Promise<Product[]> {
    const products = await this.getAllProducts();
    return products.filter((p) => p.popular);
  }

  /**
   * Search products
   */
  static async searchProducts(query: string): Promise<Product[]> {
    const products = await this.getAllProducts();
    const lowerQuery = query.toLowerCase();

    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery) ||
        p.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get all categories
   */
  static async getAllCategories(): Promise<Category[]> {
    return mockCategories;
  }

  /**
   * Filter products by multiple criteria
   */
  static async filterProducts(filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    temperature?: string;
    availableOnly?: boolean;
  }): Promise<Product[]> {
    let products = await this.getAllProducts();

    if (filters.category && filters.category !== 'all') {
      products = products.filter((p) => p.category === filters.category);
    }

    if (filters.minPrice !== undefined) {
      products = products.filter((p) => p.price >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      products = products.filter((p) => p.price <= filters.maxPrice!);
    }

    if (filters.tags && filters.tags.length > 0) {
      products = products.filter((p) =>
        filters.tags!.some((tag) => p.tags.includes(tag))
      );
    }

    if (filters.temperature) {
      products = products.filter((p) => p.temperature === filters.temperature);
    }

    if (filters.availableOnly) {
      products = products.filter((p) => p.available);
    }

    return products;
  }

  /**
   * Get size options for a product
   */
  static getSizeOptions(product: Product): Array<{ id: string; name: string; price: number }> {
    const labels = product.size_labels || ['Small', 'Medium', 'Large'];

    return labels.map((label, index) => {
      const key = label.toLowerCase().replace(/\s+/g, '_');
      return {
        id: key,
        name: label,
        price: this.getSizePrice(label),
      };
    });
  }

  /**
   * Get price for a size
   */
  static getSizePrice(size: string): number {
    const sizePrices: Record<string, number> = {
      'Small': 0,
      'Medium': 0.50,
      'Large': 1.00,
      'Regular': 0,
      'XS': 0,
      'S': 0.25,
      'M': 0.50,
      'L': 0.75,
      'XL': 1.00,
    };

    return sizePrices[size] || 0;
  }

  /**
   * Group addons by category
   */
  static groupAddonsByCategory(product: Product): Record<string, typeof product.addons> {
    const addons = product.addons || [];
    const groups: Record<string, typeof product.addons> = {};

    addons.forEach((addon: any) => {
      if (!addon.available) return;

      const category = addon.category || 'Extras';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category]!.push(addon);
    });

    return groups;
  }

  /**
   * Check if product has customizations
   */
  static hasCustomizations(product: Product): boolean {
    return !!(
      (product.size_labels && product.size_labels.length > 1) ||
      (product.addons && product.addons.length > 0)
    );
  }
}
