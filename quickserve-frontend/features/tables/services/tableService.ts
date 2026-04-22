/**
 * Table Service
 * API client for table operations
 */

import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  Table,
  TableCreate,
  TableUpdate,
  PaginatedTableResponse,
  TableListParams,
  TableStats,
  QRCodeValidationRequest,
  QRCodeValidationResponse,
  QRCodeRegenerateResponse,
  QRCodeDownloadRequest,
  AccessCodeValidationRequest,
  AccessCodeValidationResponse,
  ScanAnalytics,
  QRExpirationUpdate,
} from '../types/table'

class TableService {
  /**
   * Get all tables with pagination and filters
   */
  async getAll(params?: TableListParams): Promise<PaginatedTableResponse> {
    const queryParams = new URLSearchParams()

    if (params?.page !== undefined) queryParams.set('page', String(params.page))
    if (params?.page_size !== undefined) queryParams.set('page_size', String(params.page_size))
    if (params?.location) queryParams.set('location', params.location)
    if (params?.status) queryParams.set('status', params.status)
    if (params?.is_active !== undefined) queryParams.set('is_active', String(params.is_active))
    if (params?.sort_by) queryParams.set('sort_by', params.sort_by)
    if (params?.order) queryParams.set('order', params.order)

    const query = queryParams.toString()
    const url = query ? `${API_ENDPOINTS.TABLES}?${query}` : API_ENDPOINTS.TABLES

    return apiClient.get<PaginatedTableResponse>(url)
  }

  /**
   * Get a single table by ID
   */
  async getById(id: number): Promise<Table> {
    return apiClient.get<Table>(API_ENDPOINTS.TABLE_BY_ID(id))
  }

  /**
   * Create a new table
   */
  async create(data: TableCreate): Promise<Table> {
    return apiClient.post<Table>(API_ENDPOINTS.TABLES, data)
  }

  /**
   * Update an existing table
   */
  async update(id: number, data: TableUpdate): Promise<Table> {
    return apiClient.patch<Table>(API_ENDPOINTS.TABLE_BY_ID(id), data)
  }

  /**
   * Delete a table (soft delete by default)
   */
  async delete(id: number, hardDelete = false): Promise<void> {
    const query = hardDelete ? `?hard_delete=true` : ''
    return apiClient.delete<void>(`${API_ENDPOINTS.TABLE_BY_ID(id)}${query}`)
  }

  /**
   * Validate QR code
   */
  async validateQR(qrCode: string): Promise<QRCodeValidationResponse> {
    return apiClient.post<QRCodeValidationResponse>(
      API_ENDPOINTS.TABLE_QR_VALIDATE,
      { qr_code: qrCode }
    )
  }

  /**
   * Regenerate QR codes for a table
   */
  async regenerateQR(id: number): Promise<QRCodeRegenerateResponse> {
    return apiClient.post<QRCodeRegenerateResponse>(API_ENDPOINTS.TABLE_REGENERATE_QR(id))
  }

  /**
   * Update table status
   */
  async updateStatus(id: number, status: string): Promise<Table> {
    return apiClient.patch<Table>(`${API_ENDPOINTS.TABLE_UPDATE_STATUS(id)}&status=${status}`)
  }

  /**
   * Get tables by location
   */
  async getByLocation(location: string): Promise<{ location: string; tables: Table[]; total: number }> {
    return apiClient.get<{ location: string; tables: Table[]; total: number }>(
      API_ENDPOINTS.TABLE_BY_LOCATION(location)
    )
  }

  /**
   * Get table statistics
   */
  async getStats(): Promise<TableStats> {
    return apiClient.get<TableStats>(API_ENDPOINTS.TABLE_STATS)
  }

  /**
   * Download QR code image
   */
  async downloadQR(request: QRCodeDownloadRequest): Promise<Blob> {
    const { tableId, size, format } = request
    const url = `${API_ENDPOINTS.TABLE_BY_ID(tableId)}/qr-image?size=${size}&format=${format}`

    // Use fetch directly to get blob response
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download QR code: ${response.statusText}`)
    }

    return response.blob()
  }

  /**
   * Download print-ready QR template
   */
  async downloadPrintTemplate(tableId: number): Promise<Blob> {
    const url = `${API_ENDPOINTS.TABLE_BY_ID(tableId)}/qr-print`

    // Use fetch directly to get blob response
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download print template: ${response.statusText}`)
    }

    return response.blob()
  }

  /**
   * Download batch QR codes for all tables
   */
  async downloadAllQRs(size: 'small' | 'medium' | 'large' = 'medium', location?: string): Promise<Blob> {
    const locationParam = location ? `&location=${location}` : ''
    const url = `${API_ENDPOINTS.TABLES}/qr-batch?size=${size}${locationParam}`

    // Use fetch directly to get blob response
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download batch QR codes: ${response.statusText}`)
    }

    return response.blob()
  }

  /**
   * Validate access code (manual entry backup)
   */
  async validateAccessCode(request: AccessCodeValidationRequest): Promise<AccessCodeValidationResponse> {
    return apiClient.post<AccessCodeValidationResponse>(
      `${API_ENDPOINTS.TABLES}/validate-access-code`,
      request
    )
  }

  /**
   * Get QR scan analytics for a table
   */
  async getScanAnalytics(tableId: number): Promise<ScanAnalytics> {
    return apiClient.get<ScanAnalytics>(`${API_ENDPOINTS.TABLE_BY_ID(tableId)}/scan-analytics`)
  }

  /**
   * Set QR code expiration
   */
  async setQRExpiration(tableId: number, request: QRExpirationUpdate): Promise<{ message: string; table: Table }> {
    return apiClient.post<{ message: string; table: Table }>(
      `${API_ENDPOINTS.TABLE_BY_ID(tableId)}/set-qr-expiration`,
      request
    )
  }
}

// Export singleton instance
export const tableService = new TableService()
