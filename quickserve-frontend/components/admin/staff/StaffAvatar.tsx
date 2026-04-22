/**
 * Staff Avatar Component
 *
 * Displays staff avatar with initials fallback.
 */

import { PaddedProps } from '@/types/component-props';
import { getStaffInitials, getAvatarColor } from '@/utils/staff-utils';
import type { AdminUser } from '@/types/admin-auth.types';

interface StaffAvatarProps extends PaddedProps {
  staff: Pick<AdminUser, 'name' | 'avatar_url'>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-3xl',
} as const;

export function StaffAvatar({
  staff,
  size = 'md',
  className = '',
}: StaffAvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const initials = getStaffInitials(staff.name);
  const avatarColor = getAvatarColor(staff.name);

  if (staff.avatar_url) {
    return (
      <img
        src={staff.avatar_url}
        alt={staff.name}
        className={`${sizeClass} rounded-xl object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${avatarColor} rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
}
