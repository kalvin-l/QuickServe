/**
 * Device Utilities Module
 * Re-exports all device-related utilities
 */

export {
  getOrCreateDeviceId,
  getDeviceName,
  clearDeviceInfo,
  getDeviceInfo,
} from './deviceUtils'

export {
  persistCart,
  restoreCart,
  clearCartBackup,
  getCartBackupInfo,
  getCartBackupTimeRemaining,
} from './cartBackupUtils'

export type { CartBackup } from './cartBackupUtils'
