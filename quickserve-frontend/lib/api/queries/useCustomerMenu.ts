/**
 * React Query Hooks for Customer Menu
 * Customer-specific hooks for fetching menu data
 */

import { useQuery } from '@tanstack/react-query'
import { customerMenuService } from '../services/customerMenuService'
import { categoryService } from '../services/categoryService'
import { getCategoryIcon } from '@/lib/utils'
import type { Category } from '@/types'

// Query keys
export const customerMenuKeys = {
  all: ['customer', 'menu'] as const,
  featured: (limit?: number) => ['customer', 'menu', 'featured', limit] as const,
  popular: (limit?: number) => ['customer', 'menu', 'popular', limit] as const,
  products: (params?: any) => ['customer', 'menu', 'products', params] as const,
  categories: ['customer', 'categories'] as const,
}

/**
 * Hook to fetch featured products
 */
export function useFeaturedProducts(limit = 6) {
  return useQuery({
    queryKey: customerMenuKeys.featured(limit),
    queryFn: () => customerMenuService.getFeaturedProducts(limit),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

/**
 * Hook to fetch popular products
 */
export function usePopularProducts(limit = 8) {
  return useQuery({
    queryKey: customerMenuKeys.popular(limit),
    queryFn: () => customerMenuService.getPopularProducts(limit),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

/**
 * Hook to fetch all products with filters
 */
export function useCustomerProducts(params: {
  category_id?: number
  search?: string
  page?: number
  page_size?: number
}) {
  return useQuery({
    queryKey: customerMenuKeys.products(params),
    queryFn: () => customerMenuService.getAllProducts(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch products by category
 */
export function useCategoryProducts(categoryId: number, page = 1, pageSize = 12) {
  return useQuery({
    queryKey: ['customer', 'menu', 'category', categoryId, page, pageSize],
    queryFn: () => customerMenuService.getProductsByCategory(categoryId, page, pageSize),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!categoryId,
  })
}

/**
 * Hook to fetch single product
 */
export function useCustomerProduct(id: number) {
  return useQuery({
    queryKey: ['customer', 'menu', 'product', id],
    queryFn: () => customerMenuService.getProduct(id),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!id,
  })
}

/**
 * Hook to fetch categories with transformation
 */
export function useCustomerCategories() {
  return useQuery({
    queryKey: customerMenuKeys.categories,
    queryFn: async (): Promise<Category[]> => {
      const { categories } = await categoryService.getCategories('menu')

      // Transform backend Category to frontend Category type
      return [
        {
          id: 'all',
          name: 'All Items',
          active: true,
          description: 'View all menu items',
          icon: 'fas fa-utensils'
        },
        ...categories.map(cat => ({
          id: String(cat.id),
          name: cat.name,
          active: false,
          description: `${cat.name} items`,
          icon: `fas ${getCategoryIcon(cat.name)}`
        }))
      ]
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}
