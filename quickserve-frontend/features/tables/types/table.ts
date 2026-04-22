/**
 * Table Types
 * TypeScript interfaces for table management
 */

/**
 * Table location options
 */
export type TableLocation = 'Indoor' | 'Outdoor' | 'Patio' | 'Bar'

/**
 * Table status options
 */
export type TableStatus = 'available' | 'partial' | 'full' | 'cleaning' | 'out_of_service'

/**
 * Table model interface
 */
export interface Table {
  id: number
  table_number: number
  location: TableLocation
  capacity: number
  qr_code: string
  access_code: string
  status: TableStatus
  is_active: boolean
  occupied: number
  available_seats: number
  qr_expires_at?: string | null
  qr_scan_count?: number
  qr_last_scanned?: string | null
  created_at: string
  updated_at: string
}

/**
 * Create table request
 */
export interface TableCreate {
  table_number: number
  location: TableLocation
  capacity: number
  qr_code?: string
  access_code?: string
  status?: TableStatus
}

/**
 * Update table request (all fields optional)
 */
export interface TableUpdate {
  table_number?: number
  location?: TableLocation
  capacity?: number
  status?: TableStatus
  is_active?: boolean
}

/**
 * Paginated table list response
 */
export interface PaginatedTableResponse {
  items: Table[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

/**
 * Table list query parameters
 */
export interface TableListParams {
  page?: number
  page_size?: number
  location?: TableLocation
  status?: TableStatus
  is_active?: boolean
  sort_by?: string
  order?: 'asc' | 'desc'
}

/**
 * Table statistics
 */
export interface TableStats {
  total: number
  by_location: Record<TableLocation, number>
  by_status: Record<TableStatus, number>
  total_capacity: number
  available_seats: number
}

/**
 * QR code validation request
 */
export interface QRCodeValidationRequest {
  qr_code: string
}

/**
 * QR code validation response
 */
export interface QRCodeValidationResponse {
  valid: boolean
  table?: Table
  session?: {
    id: number
  }
  message?: string
}

/**
 * QR code regeneration response
 */
export interface QRCodeRegenerateResponse {
  message: string
  table: Table
}

/**
 * QR code download request
 */
export interface QRCodeDownloadRequest {
  tableId: number
  size: 'small' | 'medium' | 'large'
  format: 'png' | 'pdf'
}

/**
 * Access code validation request
 */
export interface AccessCodeValidationRequest {
  access_code: string
}

/**
 * Access code validation response
 */
export interface AccessCodeValidationResponse {
  valid: boolean
  table?: Table
}

/**
 * Scan analytics response
 */
export interface ScanAnalytics {
  table_id: number
  total_scans: number
  last_scanned?: string | null
  scans_by_day: { date: string; count: number }[]
  unique_ips: number
}

/**
 * QR expiration update request
 */
export interface QRExpirationUpdate {
  expires_at: string | null
}

/**
 * Helper to get status color (matches frontend UI)
 */
export function getTableStatusColor(status: TableStatus): {
  border: string
  dot: string
  text: string
} {
  const colors = {
    available: {
      border: 'border-green-500',
      dot: 'bg-green-500',
      text: 'text-green-600'
    },
    partial: {
      border: 'border-yellow-500',
      dot: 'bg-yellow-500',
      text: 'text-yellow-600'
    },
    full: {
      border: 'border-red-500',
      dot: 'bg-red-500',
      text: 'text-red-600'
    },
    cleaning: {
      border: 'border-blue-500',
      dot: 'bg-blue-500',
      text: 'text-blue-600'
    },
    out_of_service: {
      border: 'border-gray-500',
      dot: 'bg-gray-500',
      text: 'text-gray-600'
    }
  }
  return colors[status] || colors.available
}

/**
 * Helper to get location color
 */
export function getTableLocationColor(location: TableLocation): string {
  const colors = {
    Indoor: 'bg-green-100 text-green-700',
    Outdoor: 'bg-blue-100 text-blue-700',
    Patio: 'bg-purple-100 text-purple-700',
    Bar: 'bg-amber-100 text-amber-700'
  }
  return colors[location]
}

/**
 * Helper to get location dot color
 */
export function getTableLocationDotColor(location: TableLocation): string {
  const colors = {
    Indoor: 'bg-green-500',
    Outdoor: 'bg-blue-500',
    Patio: 'bg-purple-500',
    Bar: 'bg-amber-500'
  }
  return colors[location]
}

/**
 * Format table status for display
 */
export function formatTableStatus(status: TableStatus): string {
  const labels = {
    available: 'Available',
    partial: 'Partial',
    full: 'Full',
    cleaning: 'Cleaning',
    out_of_service: 'Out of Service'
  }
  return labels[status]
}
