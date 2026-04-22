/**
 * Button Component
 *
 * Reusable button with variants and sizes
 */

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Variant styles
    const variants = {
      primary:
        'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 shadow-md hover:shadow-lg',
      secondary:
        'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 border border-gray-200',
      ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
      outline:
        'bg-transparent text-gray-700 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50',
      danger:
        'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-md hover:shadow-lg',
    };

    // Size styles
    const sizes = {
      xs: 'px-2 py-1 text-xs font-medium rounded-md',
      sm: 'px-3 py-1.5 text-sm font-medium rounded-lg',
      md: 'px-4 py-2 text-base font-semibold rounded-xl',
      lg: 'px-6 py-3 text-lg font-semibold rounded-xl',
      xl: 'px-8 py-4 text-xl font-bold rounded-2xl',
    };

    // Icon sizes
    const iconSizes = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2 transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          // Variant and size
          variants[variant],
          sizes[size],
          // Full width
          fullWidth && 'w-full',
          // Custom className
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <i className="fas fa-circle-notch fa-spin"></i>
            {children && <span>{children}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className={iconSizes[size]}>{leftIcon}</span>}
            {children && <span>{children}</span>}
            {rightIcon && <span className={iconSizes[size]}>{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
