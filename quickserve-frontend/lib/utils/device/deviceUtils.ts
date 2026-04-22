/**
 * Device Utilities
 * Manages device identification for session pooling and cart persistence
 */

const DEVICE_ID_KEY = 'quickserve_device_id';
const DEVICE_NAME_KEY = 'quickserve_device_name';

/**
 * Get or create a unique device identifier.
 * This ID is stored in localStorage and persists across sessions.
 * Each device (browser) gets a unique ID, allowing multiple devices
 * to share the same table session.
 *
 * @returns Unique device ID string (empty string on server-side)
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    // Generate a unique device ID: device_<timestamp>_<random>
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Get a human-readable device name based on user agent.
 * Helps identify different devices in the same session.
 *
 * @returns Device name string (e.g., 'iPhone (Chrome)', 'Desktop Browser (Safari)')
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown Device';

  // Check if we have a cached device name
  const cachedName = localStorage.getItem(DEVICE_NAME_KEY);
  if (cachedName) return cachedName;

  const ua = navigator.userAgent;

  // Detect device type
  let deviceName = 'Desktop Browser';

  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    if (/iPhone|iPod/i.test(ua)) {
      deviceName = 'iPhone';
    } else if (/iPad/i.test(ua)) {
      deviceName = 'iPad';
    } else if (/Android/i.test(ua)) {
      deviceName = 'Android Device';
    } else {
      deviceName = 'Mobile Device';
    }
  }

  // Detect browser
  let browserName = '';
  if (/Chrome/i.test(ua) && !/Edge|OPR/i.test(ua)) {
    browserName = 'Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browserName = 'Safari';
  } else if (/Firefox/i.test(ua)) {
    browserName = 'Firefox';
  } else if (/Edge/i.test(ua)) {
    browserName = 'Edge';
  }

  const fullName = browserName ? `${deviceName} (${browserName})` : deviceName;

  // Cache the device name
  localStorage.setItem(DEVICE_NAME_KEY, fullName);

  return fullName;
}

/**
 * Clear device information from localStorage.
 * Useful for testing or resetting device identity.
 */
export function clearDeviceInfo(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(DEVICE_ID_KEY);
  localStorage.removeItem(DEVICE_NAME_KEY);
}

/**
 * Get all device information as an object.
 *
 * @returns Object containing deviceId and deviceName
 */
export function getDeviceInfo(): {
  deviceId: string;
  deviceName: string;
} {
  return {
    deviceId: getOrCreateDeviceId(),
    deviceName: getDeviceName(),
  };
}
