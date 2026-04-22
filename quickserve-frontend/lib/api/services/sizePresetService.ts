/**
 * Size Preset Service
 *
 * Handles API calls for size preset management
 */

import { apiClient } from '../client'

export interface SizePreset {
  id: number
  name: string
  description: string | null
  preset_id: string
  labels: string[]
  is_default: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SizePresetSelectOption {
  value: string
  label: string
  labels: string[]
}

export interface SizePresetCreate {
  name: string
  description?: string
  preset_id: string
  labels: string[]
  is_default: boolean
  is_active: boolean
  sort_order: number
}

export interface SizePresetUpdate {
  name?: string
  description?: string
  preset_id?: string
  labels?: string[]
  is_default?: boolean
  is_active?: boolean
  sort_order?: number
}

export interface SizePresetListResponse {
  presets: SizePreset[]
  total: number
}

/**
 * Size Preset Service Class
 */
class SizePresetService {
  private readonly basePath = '/size-presets'

  /**
   * Get all size presets
   */
  async getSizePresets(activeOnly: boolean = true): Promise<SizePresetListResponse> {
    const params = new URLSearchParams()
    if (activeOnly) {
      params.append('active_only', 'true')
    }

    const queryString = params.toString()
    const response = await apiClient.get<SizePresetListResponse>(
      `${this.basePath}${queryString ? `?${queryString}` : ''}`
    )
    return response
  }

  /**
   * Get size presets as select options (for dropdowns)
   */
  async getSizePresetOptions(activeOnly: boolean = true): Promise<SizePresetSelectOption[]> {
    const params = new URLSearchParams()
    if (activeOnly) {
      params.append('active_only', 'true')
    }

    const queryString = params.toString()
    const response = await apiClient.get<SizePresetSelectOption[]>(
      `${this.basePath}/select-options${queryString ? `?${queryString}` : ''}`
    )
    return response
  }

  /**
   * Get a single size preset by ID
   */
  async getSizePreset(id: number): Promise<SizePreset> {
    const response = await apiClient.get<SizePreset>(`${this.basePath}/${id}`)
    return response
  }

  /**
   * Create a new size preset
   */
  async createSizePreset(data: SizePresetCreate): Promise<SizePreset> {
    const response = await apiClient.post<SizePreset>(this.basePath, data)
    return response
  }

  /**
   * Update an existing size preset
   */
  async updateSizePreset(id: number, data: SizePresetUpdate): Promise<SizePreset> {
    const response = await apiClient.put<SizePreset>(`${this.basePath}/${id}`, data)
    return response
  }

  /**
   * Delete a size preset
   */
  async deleteSizePreset(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`)
  }

  /**
   * Get size preset options formatted for FormSelect component
   */
  async getForSelect(activeOnly: boolean = true): Promise<Array<{ value: string; label: string }>> {
    const options = await this.getSizePresetOptions(activeOnly)
    return options.map(opt => ({
      value: opt.value,
      label: opt.label
    }))
  }

  /**
   * Get labels for a specific preset by preset_id
   */
  async getLabelsForPreset(presetId: string): Promise<string[]> {
    const presets = await this.getSizePresets(true)
    const preset = presets.presets.find(p => p.preset_id === presetId)
    return preset?.labels || ['Small', 'Medium', 'Large']
  }
}

// Export singleton instance
export const sizePresetService = new SizePresetService()
