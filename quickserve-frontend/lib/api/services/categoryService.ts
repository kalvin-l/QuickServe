/**
 * Category Service
 * Handles all category API calls to FastAPI backend
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../endpoints'

// Types
export interface Category {
  id: number
  name: string
  scope: string
  created_at: string
  updated_at: string
}

export interface CategoryForSelect {
  value: string
  label: string
}

export interface CreateCategoryInput {
  name: string
  scope?: string
}

export interface UpdateCategoryInput {
  name?: string
  scope?: string
}

/**
 * Category Service Class
 */
class CategoryService {
  /**
   * Get all categories
   */
  async getCategories(scope?: string): Promise<{ categories: Category[]; total: number }> {
    const queryParams = new URLSearchParams()
    if (scope) queryParams.set('scope', scope)

    const queryString = queryParams.toString()
    const endpoint = `${API_ENDPOINTS.CATEGORIES}${queryString ? `?${queryString}` : ''}`

    return apiClient.get<{ categories: Category[]; total: number }>(endpoint)
  }

  /**
   * Get categories formatted for select dropdown
   */
  async getCategoriesForSelect(scope = 'menu'): Promise<CategoryForSelect[]> {
    const endpoint = `${API_ENDPOINTS.CATEGORIES}/list?scope=${scope}`
    return apiClient.get<CategoryForSelect[]>(endpoint)
  }

  /**
   * Get single category by ID
   */
  async getCategory(id: number): Promise<Category> {
    return apiClient.get<Category>(`${API_ENDPOINTS.CATEGORIES}/${id}`)
  }

  /**
   * Create new category
   */
  async createCategory(data: CreateCategoryInput): Promise<Category> {
    return apiClient.post<Category>(API_ENDPOINTS.CATEGORIES, data)
  }

  /**
   * Update category
   */
  async updateCategory(id: number, data: UpdateCategoryInput): Promise<Category> {
    return apiClient.put<Category>(`${API_ENDPOINTS.CATEGORIES}/${id}`, data)
  }

  /**
   * Delete category
   */
  async deleteCategory(id: number): Promise<void> {
    return apiClient.delete<void>(`${API_ENDPOINTS.CATEGORIES}/${id}`)
  }
}

// Export singleton instance
export const categoryService = new CategoryService()
