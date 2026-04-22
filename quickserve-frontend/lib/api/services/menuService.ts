/**
 * Menu Service
 * Handles all menu item API calls to FastAPI backend
 */

import { apiClient } from '../client'
import { API_ENDPOINTS } from '../endpoints'

// Types
export interface MenuItem {
  id: number
  name: string
  description: string
  category_id: number | null
  price: number
  price_in_pesos: number
  temperature: 'Hot' | 'Cold' | 'Both' | null
  prep_time: string | null
  size_labels: Record<string, string> | null
  featured: boolean
  popular: boolean
  available: boolean
  image_path: string | null
  image_url: string | null
  notes: string | null
  status: 'draft' | 'published' | 'archived'
  category: {
    id: number
    name: string
  } | null
  addons: Array<{
    id: number
    name: string
    price: number
    price_in_pesos: number
    category: string
  }>
  created_at: string
  updated_at: string
}

export interface MenuItemsResponse {
  items: MenuItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface AddonGroup {
  category: string
  addons: Addon[]
}

export interface Addon {
  id: number
  name: string
  price: number
  price_in_pesos: number
  category: string
  available: boolean
}

export interface MenuItemsParams {
  search?: string
  category_id?: number
  available_only?: boolean
  featured_only?: boolean
  popular_only?: boolean
  status?: string
  exclude_inventory?: boolean
  page?: number
  page_size?: number
}

export interface CreateMenuItemInput {
  name: string
  description?: string
  category_id?: number | null
  price: number
  temperature?: 'Hot' | 'Cold' | 'Both' | null
  prep_time?: string | null
  size_labels?: Record<string, string> | null
  featured?: boolean
  popular?: boolean
  available?: boolean
  notes?: string | null
  status?: 'draft' | 'published' | 'archived'
  addon_ids?: number[]
  // Inventory fields
  stock_quantity?: number
  stock_unit?: string
  low_stock_threshold?: number
  reorder_level?: number
  reorder_quantity?: number
}

export interface UpdateMenuItemInput {
  name?: string
  description?: string
  category_id?: number | null
  price?: number
  temperature?: 'Hot' | 'Cold' | 'Both' | null
  prep_time?: string | null
  size_labels?: Record<string, string> | null
  featured?: boolean
  popular?: boolean
  available?: boolean
  notes?: string | null
  status?: 'draft' | 'published' | 'archived'
  addon_ids?: number[]
}

/**
 * Menu Service Class
 */
class MenuService {
  /**
   * Get all menu items with filters and pagination
   */
  async getMenuItems(params: MenuItemsParams = {}): Promise<MenuItemsResponse> {
    const queryParams = new URLSearchParams()

    if (params.search) queryParams.set('search', params.search)
    if (params.category_id) queryParams.set('category_id', params.category_id.toString())
    if (params.available_only) queryParams.set('available_only', 'true')
    if (params.featured_only) queryParams.set('featured_only', 'true')
    if (params.popular_only) queryParams.set('popular_only', 'true')
    if (params.status) queryParams.set('status', params.status)
    // Default to excluding inventory items (price=0) unless explicitly disabled
    if (params.exclude_inventory !== false) queryParams.set('exclude_inventory', 'true')
    if (params.page) queryParams.set('page', params.page.toString())
    if (params.page_size) queryParams.set('page_size', params.page_size.toString())

    const queryString = queryParams.toString()
    const endpoint = `${API_ENDPOINTS.MENU}${queryString ? `?${queryString}` : ''}`

    return apiClient.get<MenuItemsResponse>(endpoint)
  }

  /**
   * Get single menu item by ID
   */
  async getMenuItem(id: number): Promise<MenuItem> {
    return apiClient.get<MenuItem>(API_ENDPOINTS.MENU_ITEM(id))
  }

  /**
   * Create new menu item
   */
  async createMenuItem(data: CreateMenuItemInput): Promise<MenuItem> {
    return apiClient.post<MenuItem>(API_ENDPOINTS.MENU, data)
  }

  /**
   * Update menu item
   */
  async updateMenuItem(id: number, data: UpdateMenuItemInput): Promise<MenuItem> {
    return apiClient.put<MenuItem>(API_ENDPOINTS.MENU_ITEM(id), data)
  }

  /**
   * Delete menu item (soft delete)
   */
  async deleteMenuItem(id: number): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.MENU_ITEM(id))
  }

  /**
   * Toggle menu item availability
   */
  async toggleAvailability(id: number): Promise<MenuItem> {
    return apiClient.patch<MenuItem>(API_ENDPOINTS.MENU_TOGGLE_AVAILABILITY(id), {})
  }

  /**
   * Upload image for menu item
   */
  async uploadImage(id: number, file: File): Promise<MenuItem> {
    const formData = new FormData()
    formData.append('file', file)

    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}${API_ENDPOINTS.MENU_UPLOAD_IMAGE(id)}`

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(error.detail || 'Failed to upload image')
    }

    return response.json()
  }

  /**
   * Get all addons (grouped by category)
   */
  async getAddons(availableOnly = true): Promise<AddonGroup[]> {
    const endpoint = `${API_ENDPOINTS.MENU_ADDONS}?available_only=${availableOnly}`
    return apiClient.get<AddonGroup[]>(endpoint)
  }
}

// Export singleton instance
export const menuService = new MenuService()
