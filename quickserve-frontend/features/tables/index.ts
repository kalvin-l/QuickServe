/**
 * Tables Feature Index
 * Central exports for tables feature
 */

// Types
export type {
  Table,
  TableLocation,
  TableStatus,
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
} from './types/table'

// Helpers
export {
  getTableStatusColor,
  getTableLocationColor,
  getTableLocationDotColor,
  formatTableStatus,
} from './types/table'

// Service
export { tableService } from './services/tableService'

// Hooks
export {
  useTables,
  useTable,
  useTableStats,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  useValidateQR,
  useRegenerateQR,
  useUpdateTableStatus,
  useDownloadQR,
  useDownloadPrintTemplate,
  useDownloadAllQRs,
  useValidateAccessCode,
  useScanAnalytics,
  useSetQRExpiration,
} from './hooks/useTables'

// New QR-specific hooks
export {
  useTableQR,
  useTableQRBatch,
} from './hooks/useTableQR'

