/**
 * Cart Backup Utilities
 * Provides cart persistence independent of session (for pause/resume functionality)
 *
 * Phase 4: Frontend Core - Smart Contextual End
 */

import { getOrCreateDeviceId } from './deviceUtils';

const CART_BACKUP_KEY = 'quickserve-cart-backup';
const CART_BACKUP_EXPIRY_HOURS = 24;

export interface CartBackup {
  deviceId: string;
  cart: any; // Cart state
  savedAt: string;
  expiresAt: string;
}

/**
 * Save cart with device_id for cross-session recovery.
 * Cart survives session expiry and can be restored within 24 hours.
 *
 * @param cart - Cart state to persist
 */
export function persistCart(cart: any): void {
  if (typeof window === 'undefined') return;

  const deviceId = getOrCreateDeviceId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CART_BACKUP_EXPIRY_HOURS * 60 * 60 * 1000);

  const backup: CartBackup = {
    deviceId,
    cart,
    savedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  localStorage.setItem(CART_BACKUP_KEY, JSON.stringify(backup));

  // Also update the device ID timestamp
  localStorage.setItem('quickserve-cart-device_timestamp', now.toISOString());
}

/**
 * Restore cart from backup (called on session resume).
 * Returns null if backup is expired or doesn't exist.
 *
 * @returns Cart state or null if no valid backup exists
 */
export function restoreCart(): any | null {
  if (typeof window === 'undefined') return null;

  const backupStr = localStorage.getItem(CART_BACKUP_KEY);
  if (!backupStr) return null;

  try {
    const backup: CartBackup = JSON.parse(backupStr);

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(backup.expiresAt);

    if (now > expiresAt) {
      // Backup expired, remove it
      localStorage.removeItem(CART_BACKUP_KEY);
      return null;
    }

    // Verify device ID matches
    const currentDeviceId = getOrCreateDeviceId();
    if (backup.deviceId !== currentDeviceId) {
      // Device mismatch, don't restore (security measure)
      console.warn('[CartBackup] Device ID mismatch, not restoring cart');
      return null;
    }

    return backup.cart;
  } catch (error) {
    console.error('[CartBackup] Failed to parse backup:', error);
    localStorage.removeItem(CART_BACKUP_KEY);
    return null;
  }
}

/**
 * Clear cart backup
 */
export function clearCartBackup(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(CART_BACKUP_KEY);
}

/**
 * Get cart backup info without restoring (for UI display).
 *
 * @returns CartBackup object or null if no valid backup exists
 */
export function getCartBackupInfo(): CartBackup | null {
  if (typeof window === 'undefined') return null;

  const backupStr = localStorage.getItem(CART_BACKUP_KEY);
  if (!backupStr) return null;

  try {
    const backup: CartBackup = JSON.parse(backupStr);

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(backup.expiresAt);

    if (now > expiresAt) {
      localStorage.removeItem(CART_BACKUP_KEY);
      return null;
    }

    return backup;
  } catch {
    return null;
  }
}

/**
 * Get time remaining until cart backup expires (in hours).
 *
 * @returns Hours remaining or null if no backup exists
 */
export function getCartBackupTimeRemaining(): number | null {
  const backup = getCartBackupInfo();
  if (!backup) return null;

  const now = new Date();
  const expiresAt = new Date(backup.expiresAt);
  const timeRemaining = expiresAt.getTime() - now.getTime();

  return Math.max(0, timeRemaining / (60 * 60 * 1000)); // Convert to hours
}
