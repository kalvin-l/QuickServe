/**
 * Status Badge Component
 *
 * Displays staff status with color-coded badge and indicator dot.
 */

import { PaddedProps } from '@/types/component-props';
import type { AdminStatus } from '@/constants/staff';
import { getStatusColor, getStatusLabel } from '@/utils/staff-utils';

interface StatusBadgeProps extends PaddedProps {
  status: AdminStatus;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
} as const;

const DOT_SIZE = {
  sm: 'w-1 h-1',
  md: 'w-1.5 h-1.5',
  lg: 'w-2 h-2',
} as const;

export function StatusBadge({
  status,
  size = 'md',
  showDot = true,
  className = '',
}: StatusBadgeProps) {
  const colors = getStatusColor(status);
  const sizeClass = SIZE_CLASSES[size];
  const dotSizeClass = DOT_SIZE[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${colors.bg} ${colors.text} ${colors.border} ${sizeClass} ${className}`}
    >
      {showDot && (
        <span className={`rounded-full ${colors.dot} ${dotSizeClass}`} />
      )}
      {getStatusLabel(status)}
    </span>
  );
}
