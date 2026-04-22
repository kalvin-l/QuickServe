/**
 * Date Utilities for QuickServe
 * Handles Philippines Time (Asia/Manila, UTC+8)
 *
 * Backend sends UTC timestamps (e.g., "2025-02-14T07:00:00+00:00")
 * Frontend converts to Philippines time for display
 */

/**
 * Get the current time in Philippines timezone
 */
export function getPhilippinesTime(): Date {
  const now = new Date();
  // Convert to Philippines timezone
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
}

/**
 * Parse a UTC date string from the backend and convert to Philippines time.
 * Backend sends timestamps in UTC with timezone info (e.g., "2025-02-14T07:00:00+00:00")
 *
 * @param dateString - ISO date string from backend (UTC time)
 * @returns Date in Philippines timezone
 */
export function toPhilippinesTime(dateString: string): Date {
  const utcDate = new Date(dateString);
  // Convert to Philippines timezone
  const philippinesTimeString = utcDate.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
  });
  return new Date(philippinesTimeString);
}

/**
 * Parse a date string from the backend (already handles timezone correctly)
 * Backend sends timestamps in UTC with timezone info
 *
 * @param dateString - ISO date string from backend (UTC time)
 * @returns Date object
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Format time ago in Philippines timezone
 * @param dateString - ISO date string from backend (UTC time)
 * @returns Formatted string like "5m ago", "2h ago", "Yesterday"
 */
export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = parseDate(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return toPhilippinesTime(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format time in Philippines timezone (HH:MM format)
 * @param dateString - ISO date string from backend (UTC time)
 * @returns Formatted time string like "03:45 PM"
 */
export function formatTime(dateString: string): string {
  const date = toPhilippinesTime(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date in Philippines timezone
 * @param dateString - ISO date string from backend (UTC time)
 * @returns Formatted date string like "Jan 15"
 */
export function formatDate(dateString: string): string {
  const date = toPhilippinesTime(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date and time in Philippines timezone
 * @param dateString - ISO date string from backend (UTC time)
 * @returns Formatted date and time string
 */
export function formatDateTime(dateString: string): string {
  const date = toPhilippinesTime(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format full date and time in Philippines timezone
 * @param dateString - ISO date string from backend (UTC time)
 * @returns Formatted full date and time string
 */
export function formatFullDateTime(dateString: string): string {
  const date = toPhilippinesTime(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get Philippines timezone info
 * @returns Timezone name and offset
 */
export function getPhilippinesTimezoneInfo(): { name: string; offset: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    timeZoneName: 'longOffset',
  });
  const parts = formatter.formatToParts(now);
  const offsetPart = parts.find(part => part.type === 'timeZoneName');

  return {
    name: 'Asia/Manila',
    offset: offsetPart?.value || 'UTC+08:00',
  };
}
