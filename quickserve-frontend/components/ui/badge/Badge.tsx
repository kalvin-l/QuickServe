/**
 * Badge Component
 *
 * Small status or label badges
 */

import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  ...props
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700 border-gray-200',
    primary: 'bg-orange-100 text-orange-700 border-orange-200',
    secondary: 'bg-blue-100 text-blue-700 border-blue-200',
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-sm font-medium',
    lg: 'px-3 py-1.5 text-base font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full bg-current'
          )}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
