/**
 * Card Component
 *
 * Flexible card container with variants
 */

import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'flat';
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hoverable = false, padding = 'md', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white border border-gray-200',
      bordered: 'bg-white border-2 border-gray-200',
      elevated: 'bg-white shadow-lg border border-gray-100',
      flat: 'bg-gray-50 border-0',
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl transition-all duration-200',
          variants[variant],
          hoverable && 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer',
          paddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components
export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('mb-4', className)} {...props} />
);

export const CardTitle: React.FC<HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3 className={cn('text-lg font-bold text-gray-900', className)} {...props} />
);

export const CardSubtitle: React.FC<HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn('text-sm text-gray-500 mt-1', className)} {...props} />
);

export const CardContent: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('', className)} {...props} />
);

export const CardFooter: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('mt-4 pt-4 border-t border-gray-100 flex items-center gap-2', className)} {...props} />
);

export const CardImage: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn('relative w-full aspect-video overflow-hidden rounded-t-2xl bg-gray-100', className)} {...props}>
    {children}
  </div>
);

export default Card;
