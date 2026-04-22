/**
 * useQRCode Hook
 *
 * Custom hook for QR code utilities and helpers.
 */

import { useMemo } from 'react';

export interface QRCodeOptions {
  size?: 'small' | 'medium' | 'large';
  format?: 'png' | 'pdf';
  includeColor?: boolean;
}

/**
 * Custom hook for QR code utilities
 *
 * Provides helper functions for working with QR codes.
 */
export function useQRCode() {
  /**
   * Get the appropriate size in pixels based on the size option
   *
   * @param size - The size option
   * @returns Size in pixels
   */
  const getSizeInPixels = (size: 'small' | 'medium' | 'large' = 'medium'): number => {
    const sizeMap = {
      small: 256,
      medium: 512,
      large: 1024,
    };
    return sizeMap[size];
  };

  /**
   * Get the appropriate size option based on pixel width
   *
   * @param pixels - The pixel width
   * @returns Size option
   */
  const getSizeOption = (pixels: number): 'small' | 'medium' | 'large' => {
    if (pixels <= 300) return 'small';
    if (pixels >= 700) return 'large';
    return 'medium';
  };

  /**
   * Download a blob as a file
   *
   * @param blob - The blob to download
   * @param filename - The filename for the download
   */
  const downloadBlob = (blob: Blob, filename: string): void => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  /**
   * Get a description for the QR code size
   *
   * @param size - The size option
   * @returns Description of the size
   */
  const getSizeDescription = (size: 'small' | 'medium' | 'large' = 'medium'): string => {
    const descriptions = {
      small: '256 x 256px - Good for digital display',
      medium: '512 x 512px - Good for standard printing',
      large: '1024 x 1024px - Good for large format printing',
    };
    return descriptions[size];
  };

  /**
   * Copy text to clipboard
   *
   * @param text - The text to copy
   * @returns Promise that resolves when copied
   */
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Format a QR code for display
   *
   * @param qrCode - The QR code string
   * @returns Formatted QR code for display
   */
  const formatQRCode = (qrCode: string): string => {
    // Remove any whitespace
    return qrCode.trim().toUpperCase();
  };

  /**
   * Validate an access code format
   *
   * @param code - The access code to validate
   * @returns Whether the code format is valid
   */
  const isValidAccessCode = (code: string): boolean => {
    // Access codes are 6 characters, uppercase letters and numbers only
    return /^[A-Z0-9]{6}$/.test(code);
  };

  return {
    getSizeInPixels,
    getSizeOption,
    downloadBlob,
    getSizeDescription,
    copyToClipboard,
    formatQRCode,
    isValidAccessCode,
  };
}
