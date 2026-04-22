/**
 * useTableQR Hook
 *
 * Custom hook for table-specific QR code operations.
 */

import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { qrService } from '@/features/qr';
import type { QRDownloadOptions } from '@/features/qr';
import { useQRCode } from '@/features/qr/hooks/useQRCode';
import type { Table } from '@/features/tables';

interface UseTableQRActions {
  downloadQR: (options?: QRDownloadOptions) => Promise<void>;
  downloadPrintTemplate: () => Promise<void>;
  regenerateQR: () => Promise<void>;
  isDownloading: boolean;
  isRegenerating: boolean;
}

interface UseTableQRResult {
  actions: UseTableQRActions;
  qrImageUrl: string;
  qrImageUrlLarge: string;
}

/**
 * Custom hook for table QR code operations
 *
 * Provides methods for downloading, regenerating, and managing QR codes for a table.
 *
 * @param table - The table object
 * @returns QR operations and state
 */
export function useTableQR(table: Table): UseTableQRResult {
  const queryClient = useQueryClient();
  const { downloadBlob, getSizeOption } = useQRCode();

  // Download QR mutation
  const downloadQRMutation = useMutation({
    mutationFn: (options: QRDownloadOptions = {}) =>
      qrService.downloadQR({
        tableId: table.id,
        size: options.size || 'medium',
        format: options.format || 'png',
      }),
  });

  // Download print template mutation
  const downloadPrintMutation = useMutation({
    mutationFn: () => qrService.downloadPrintTemplate(table.id),
  });

  // Regenerate QR mutation
  const regenerateQRMutation = useMutation({
    mutationFn: () => qrService.regenerateQR(table.id),

    onSuccess: () => {
      // Invalidate queries to refetch table data
      queryClient.invalidateQueries({ queryKey: ['table', table.id] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  /**
   * Download QR code image
   */
  const downloadQR = async (options: QRDownloadOptions = {}): Promise<void> => {
    try {
      const blob = await downloadQRMutation.mutateAsync(options);
      const size = options.size || 'medium';
      downloadBlob(blob, `table-${table.table_number}-qr-${size}.png`);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      throw error;
    }
  };

  /**
   * Download print-ready QR template
   */
  const downloadPrintTemplate = async (): Promise<void> => {
    try {
      const blob = await downloadPrintMutation.mutateAsync();
      downloadBlob(blob, `table-${table.table_number}-print-template.png`);
    } catch (error) {
      console.error('Failed to download print template:', error);
      throw error;
    }
  };

  /**
   * Regenerate QR codes
   */
  const regenerateQR = async (): Promise<void> => {
    try {
      await regenerateQRMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to regenerate QR code:', error);
      throw error;
    }
  };

  // Generate QR image URLs
  const qrImageUrl = qrService.getQRImageUrl(table.id, { size: 'medium' });
  const qrImageUrlLarge = qrService.getQRImageUrl(table.id, { size: 'large' });

  return {
    actions: {
      downloadQR,
      downloadPrintTemplate,
      regenerateQR,
      isDownloading: downloadQRMutation.isPending,
      isRegenerating: regenerateQRMutation.isPending,
    },
    qrImageUrl,
    qrImageUrlLarge,
  };
}

/**
 * Batch operations for multiple tables
 */
export function useTableQRBatch() {
  const { downloadBlob } = useQRCode();
  const downloadAllQRMutation = useMutation({
    mutationFn: (options: QRDownloadOptions = {}) =>
      qrService.downloadAllQRs(options),
  });

  /**
   * Download QR codes for all tables
   */
  const downloadAllQR = async (options: QRDownloadOptions = {}): Promise<void> => {
    try {
      const blob = await downloadAllQRMutation.mutateAsync(options);
      const { size = 'medium', location } = options;
      const locationSuffix = location ? `-${location}` : '';
      downloadBlob(blob, `all-tables${locationSuffix}-qr-${size}.png`);
    } catch (error) {
      console.error('Failed to download batch QR codes:', error);
      throw error;
    }
  };

  return {
    downloadAllQR,
    isDownloading: downloadAllQRMutation.isPending,
  };
}
