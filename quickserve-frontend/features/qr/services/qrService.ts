/**
 * QR Service
 *
 * Centralized service for all QR code related operations.
 * Handles QR code download, regeneration, and validation.
 */

import { apiClient } from '@/lib/api/client';
import type { Table, QRCodeRegenerateResponse, AccessCodeValidationResponse } from '@/features/tables';

export interface QRDownloadOptions {
  size?: 'small' | 'medium' | 'large';
  format?: 'png' | 'pdf';
}

export interface QRDownloadRequest {
  tableId: number;
  size: 'small' | 'medium' | 'large';
  format: 'png' | 'pdf';
}

/**
 * QR Service
 *
 * Provides a centralized way to handle QR code operations across the application.
 */
class QRService {
  private readonly apiBaseUrl: string;

  constructor() {
    // Get API URL from environment variable
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  }

  /**
   * Download QR code image for a table
   *
   * @param request - Download request parameters
   * @returns Blob containing the QR code image
   */
  async downloadQR(request: QRDownloadRequest): Promise<Blob> {
    const { tableId, size, format } = request;
    const url = `/tables/${tableId}/qr-image?size=${size}&format=${format}`;

    const response = await fetch(`${this.apiBaseUrl}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download QR code: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Download print-ready QR template
   *
   * @param tableId - The table ID
   * @returns Blob containing the print template image
   */
  async downloadPrintTemplate(tableId: number): Promise<Blob> {
    const url = `/tables/${tableId}/qr-print`;

    const response = await fetch(`${this.apiBaseUrl}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download print template: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Download batch QR codes for all tables
   *
   * @param options - Batch download options
   * @returns Blob containing the batch QR codes
   */
  async downloadAllQRs(options: QRDownloadOptions = {}): Promise<Blob> {
    const { size = 'medium', location } = options;
    const locationParam = location ? `&location=${location}` : '';
    const url = `/tables/qr-batch?size=${size}${locationParam}`;

    const response = await fetch(`${this.apiBaseUrl}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download batch QR codes: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Regenerate QR codes for a table
   *
   * This will generate new qr_token and access_code for the table.
   * Old QR codes will stop working immediately.
   *
   * @param tableId - The table ID
   * @returns Response with updated table data
   */
  async regenerateQR(tableId: number): Promise<QRCodeRegenerateResponse> {
    return apiClient.post<QRCodeRegenerateResponse>(`/tables/${tableId}/regenerate-qr`, {});
  }

  /**
   * Validate an access code (manual entry backup)
   *
   * @param accessCode - The 6-character access code
   * @returns Validation response with table info
   */
  async validateAccessCode(accessCode: string): Promise<AccessCodeValidationResponse> {
    return apiClient.post<AccessCodeValidationResponse>(
      '/tables/validate-access-code',
      { access_code: accessCode }
    );
  }

  /**
   * Get QR scan analytics for a table
   *
   * @param tableId - The table ID
   * @returns Scan analytics data
   */
  async getScanAnalytics(tableId: number) {
    return apiClient.get(`/tables/${tableId}/scan-analytics`);
  }

  /**
   * Get the QR image URL for a table
   *
   * @param tableId - The table ID
   * @param options - Image generation options
   * @returns Full URL to the QR image endpoint
   */
  getQRImageUrl(tableId: number, options: QRDownloadOptions = {}): string {
    const { size = 'medium', format = 'png' } = options;
    const includeColor = options.format !== 'pdf';
    return `${this.apiBaseUrl}/tables/${tableId}/qr-image?size=${size}&format=${format}&include_color=${includeColor}&t=${Date.now()}`;
  }
}

// Export singleton instance
export const qrService = new QRService();

// Export types
export type { QRDownloadOptions, QRDownloadRequest };
