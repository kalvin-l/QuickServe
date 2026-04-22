/**
 * Addon Service
 *
 * Handles API calls for addon management
 */

import { apiClient } from '../client'

export interface Addon {
  id: number
  name: string
  description: string | null
  price: number
  price_in_pesos: number
  category: string
  available: boolean
  max_quantity: number
  created_at: string
  updated_at: string
}

export interface AddonCreate {
  name: string
  description?: string
  price: number
  category?: string
  available?: boolean
  max_quantity?: number
}

export interface AddonUpdate {
  name?: string
  description?: string
  price?: number
  category?: string
  available?: boolean
  max_quantity?: number
}

export interface AddonListResponse {
  addons: Addon[]
  total: number
}

/**
 * Addon Service Class
 */
class AddonService {
  private readonly basePath = '/addons'

  /**
   * Get all addons
   */
  async getAddons(availableOnly: boolean = true): Promise<AddonListResponse> {
    const params = new URLSearchParams()
    if (availableOnly) {
      params.append('available_only', 'true')
    }

    const queryString = params.toString()
    const response = await apiClient.get<AddonListResponse>(
      `${this.basePath}${queryString ? `?${queryString}` : ''}`
    )
    return response
  }

  /**
   * Get a single addon by ID
   */
  async getAddon(id: number): Promise<Addon> {
    const response = await apiClient.get<Addon>(`${this.basePath}/${id}`)
    return response
  }

  /**
   * Create a new addon
   */
  async createAddon(data: AddonCreate): Promise<Addon> {
    const response = await apiClient.post<Addon>(this.basePath, data)
    return response
  }

  /**
   * Update an existing addon
   */
  async updateAddon(id: number, data: AddonUpdate): Promise<Addon> {
    const response = await apiClient.put<Addon>(`${this.basePath}/${id}`, data)
    return response
  }

  /**
   * Delete an addon
   */
  async deleteAddon(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`)
  }
}

// Export singleton instance
export const addonService = new AddonService()
