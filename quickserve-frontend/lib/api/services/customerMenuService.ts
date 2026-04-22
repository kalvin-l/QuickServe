/**
 * Customer Menu Service
 * Transforms backend MenuItem data to frontend Product type
 */

import { menuService } from './menuService'
import type { MenuItem } from './menuService'
import type { Product } from '@/types'

/**
 * Transform backend MenuItem to frontend Product type
 */
export function transformMenuItemToProduct(menuItem: MenuItem): Product {
  // Build image URL - normalize Windows backslashes to forward slashes
  // Note: Images are served directly from backend root, not /api path
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000'
  const normalizedPath = menuItem.image_path?.replace(/\\/g, '/')
  const imageUrl = normalizedPath
    ? `${apiBaseUrl}/${normalizedPath}`
    : '/images/placeholder.jpg'

  // Build tags array
  const tags: string[] = []
  if (menuItem.temperature) tags.push(menuItem.temperature)
  if (menuItem.featured) tags.push('Featured')
  if (menuItem.popular) tags.push('Popular')

  // Build badge
  const badge = menuItem.featured
    ? { text: 'Featured', color: 'bg-blue-500' }
    : null

  // Build status
  const status = {
    text: menuItem.available ? 'Available' : 'Unavailable',
    color: menuItem.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
  }

  // Transform size_labels from object to array
  // Backend structure: { preset: "2", labels: ["Small", "Large"] }
  const sizeLabels = Array.isArray(menuItem.size_labels?.labels)
    ? menuItem.size_labels.labels
    : (menuItem.size_labels && Object.values(menuItem.size_labels).find(v => Array.isArray(v))) as string[] | undefined
      || ['Small', 'Medium', 'Large']

  // Transform addons
  const addons = menuItem.addons?.map(addon => ({
    id: addon.id,
    name: addon.name,
    description: '',
    price: addon.price_in_pesos,
    price_formatted: addon.price_in_pesos,
    category: addon.category,
    available: true,
    max_quantity: 3
  })) || []

  return {
    id: menuItem.id,
    name: menuItem.name,
    description: menuItem.description || '',
    price: menuItem.price_in_pesos,
    price_formatted: menuItem.price_in_pesos,
    image: imageUrl,
    image_url: normalizedPath,
    category: menuItem.category?.name || 'uncategorized',
    rating: 4.5,
    reviewCount: 0,
    badge,
    status,
    tags,
    size_labels: sizeLabels,
    available: menuItem.available,
    featured: menuItem.featured,
    popular: menuItem.popular,
    temperature: menuItem.temperature || undefined,
    addons
  }
}

/**
 * Customer Menu Service Class
 */
class CustomerMenuService {
  /**
   * Get featured products - only items marked as featured
   */
  async getFeaturedProducts(limit = 6) {
    const response = await menuService.getMenuItems({
      featured_only: true,
      available_only: true,
      page_size: limit
    })
    return response.items.map(transformMenuItemToProduct)
  }

  /**
   * Get popular products - only items marked as popular
   */
  async getPopularProducts(limit = 8) {
    const response = await menuService.getMenuItems({
      available_only: true,
      page_size: limit
    })

    // Only return items marked as popular
    return response.items
      .filter(item => item.popular)
      .slice(0, limit)
      .map(transformMenuItemToProduct)
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: number, page = 1, pageSize = 12) {
    const response = await menuService.getMenuItems({
      category_id: categoryId,
      available_only: true,
      page,
      page_size: pageSize
    })
    return {
      products: response.items.map(transformMenuItemToProduct),
      total: response.total,
      page: response.page,
      totalPages: response.total_pages
    }
  }

  /**
   * Get all products with filters
   */
  async getAllProducts(params: {
    search?: string
    category_id?: number
    page?: number
    page_size?: number
  }) {
    const response = await menuService.getMenuItems({
      ...params,
      available_only: true
    })
    return {
      products: response.items.map(transformMenuItemToProduct),
      total: response.total,
      page: response.page,
      totalPages: response.total_pages
    }
  }

  /**
   * Get single product by ID
   */
  async getProduct(id: number) {
    const menuItem = await menuService.getMenuItem(id)
    return transformMenuItemToProduct(menuItem)
  }
}

// Export singleton instance
export const customerMenuService = new CustomerMenuService()
