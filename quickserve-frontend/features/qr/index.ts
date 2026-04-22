/**
 * QR Feature
 *
 * Centralized QR code functionality across the application.
 */

// Services
export { qrService } from './services/qrService';
export type { QRDownloadOptions, QRDownloadRequest } from './services/qrService';

// Hooks
export { useQRCode } from './hooks/useQRCode';
export type { QRCodeOptions } from './hooks/useQRCode';

// Types (re-export from tables feature for convenience)
export type {
  QRCodeRegenerateResponse,
  AccessCodeValidationResponse,
  ScanAnalytics,
} from '@/features/tables';
