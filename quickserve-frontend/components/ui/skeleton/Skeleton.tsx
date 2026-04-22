'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded' | 'avatar' | 'button'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  animation?: 'pulse' | 'shimmer' | 'wave'
}

export function Skeleton({
  className,
  variant = 'rounded',
  size = 'md',
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  const sizeStyles = {
    xs: 'h-2',
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-5',
    xl: 'h-6',
  }

  const variantStyles: Record<string, string> = {
    text: cn(
      'w-full rounded',
      'max-w-[200px] sm:max-w-[280px] md:max-w-md lg:max-w-lg',
      sizeStyles[size]
    ),
    circular: cn(
      'rounded-full aspect-square',
      {
        'h-8 w-8': size === 'xs',
        'h-10 w-10': size === 'sm',
        'h-12 w-12': size === 'md',
        'h-16 w-16': size === 'lg',
        'h-20 w-20': size === 'xl',
      }
    ),
    avatar: cn(
      'rounded-full',
      'h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16'
    ),
    button: cn(
      'rounded-md',
      'h-8 px-3 sm:h-9 sm:px-4 md:h-10 md:px-5',
      'w-20 sm:w-24 md:w-28'
    ),
    rectangular: 'h-full w-full rounded-sm',
    rounded: cn(
      'rounded-md',
      sizeStyles[size]
    ),
  }

  const animationStyles = {
    pulse: 'animate-pulse',
    shimmer: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]',
    wave: 'animate-wave',
  }

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700',
        animationStyles[animation],
        variantStyles[variant] || variantStyles.rounded,
        className
      )}
      {...props}
    />
  )
}
