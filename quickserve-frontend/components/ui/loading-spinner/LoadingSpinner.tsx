'use client'

import { cn } from '@/lib/utils'

export interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   * @default 'md'
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'

  /**
   * Color variant of the spinner
   * @default 'primary'
   */
  variant?: 'primary' | 'white' | 'gray' | 'success' | 'warning' | 'danger'

  /**
   * Optional text to display below the spinner
   */
  text?: string

  /**
   * Whether to center the spinner
   * @default true
   */
  centered?: boolean

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Type of spinner - CSS animation or Font Awesome icon
   * @default 'css'
   */
  type?: 'css' | 'fontawesome' | 'branded'

  /**
   * Thickness of the spinner border (for CSS type)
   * @default 4
   */
  borderThickness?: number
}

const sizeStyles = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-20 h-20',
  full: 'w-24 h-24',
}

const iconSizeStyles = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
  xl: 'text-4xl',
  '2xl': 'text-5xl',
  full: 'text-6xl',
}

const colorStyles = {
  primary: 'border-[#d4a574] text-[#d4a574]',
  white: 'border-white text-white',
  gray: 'border-gray-400 text-gray-400',
  success: 'border-green-500 text-green-500',
  warning: 'border-yellow-500 text-yellow-500',
  danger: 'border-red-500 text-red-500',
}

/**
 * Branded Coffee Cup Loading Animation
 * Matches the warm, human-centered design system
 */
function BrandedLoader({ size = 'md' }: { size?: LoadingSpinnerProps['size'] }) {
  const containerSizes = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32',
    full: 'w-40 h-40',
  }

  const cupSizes = {
    xs: 'w-4 h-5',
    sm: 'w-5 h-6',
    md: 'w-8 h-10',
    lg: 'w-10 h-12',
    xl: 'w-12 h-14',
    '2xl': 'w-16 h-20',
    full: 'w-20 h-24',
  }

  const steamSizes = {
    xs: 'w-0.5 h-2',
    sm: 'w-0.5 h-2.5',
    md: 'w-1 h-3',
    lg: 'w-1 h-4',
    xl: 'w-1 h-5',
    '2xl': 'w-1.5 h-6',
    full: 'w-1.5 h-8',
  }

  return (
    <div className={cn('relative flex items-center justify-center', containerSizes[size])}>
      {/* Steam animations */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1">
        <div
          className={cn(
            steamSizes[size],
            'bg-[#d4a574]/60 rounded-full animate-pulse',
            'origin-bottom',
            'animate-[steam-rise_1.5s_ease-in-out_infinite]'
          )}
          style={{ animationDelay: '0s' }}
        />
        <div
          className={cn(
            steamSizes[size],
            'bg-[#d4a574]/40 rounded-full animate-pulse',
            'origin-bottom',
            'animate-[steam-rise_1.5s_ease-in-out_infinite]'
          )}
          style={{ animationDelay: '0.3s' }}
        />
        <div
          className={cn(
            steamSizes[size],
            'bg-[#d4a574]/50 rounded-full animate-pulse',
            'origin-bottom',
            'animate-[steam-rise_1.5s_ease-in-out_infinite]'
          )}
          style={{ animationDelay: '0.6s' }}
        />
      </div>

      {/* Coffee cup */}
      <div
        className={cn(
          cupSizes[size],
          'relative',
          'animate-[gentle-bounce_2s_ease-in-out_infinite]'
        )}
      >
        {/* Cup body */}
        <svg
          viewBox="0 0 40 48"
          fill="none"
          className="w-full h-full"
        >
          {/* Cup */}
          <path
            d="M4 8h24v20c0 4.418-3.582 8-8 8h-8c-4.418 0-8-3.582-8-8V8z"
            className="fill-[#d4a574]/20 stroke-[#d4a574]"
            strokeWidth="2"
          />
          {/* Coffee liquid */}
          <ellipse
            cx="16"
            cy="10"
            rx="10"
            ry="3"
            className="fill-[#d4a574]/60"
          />
          {/* Handle */}
          <path
            d="M28 14h4c2.209 0 4 1.791 4 4v6c0 2.209-1.791 4-4 4h-4"
            className="stroke-[#d4a574]"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>

      {/* Pulsing ring */}
      <div
        className={cn(
          'absolute inset-0 rounded-full border-2 border-[#d4a574]/20',
          'animate-[pulse-ring_2s_ease-out_infinite]'
        )}
      />
    </div>
  )
}

/**
 * LoadingSpinner Component
 *
 * A responsive loading spinner with multiple variants and sizes.
 * Now includes a branded coffee cup animation matching the design system.
 *
 * @example
 * ```tsx
 * <LoadingSpinner />
 * <LoadingSpinner size="lg" text="Loading..." />
 * <LoadingSpinner variant="white" size="sm" />
 * <LoadingSpinner type="branded" size="xl" text="Brewing your experience..." />
 * ```
 */
export function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  text,
  centered = true,
  className,
  type = 'css',
  borderThickness = 4,
}: LoadingSpinnerProps) {
  const containerClasses = cn(
    'flex flex-col items-center justify-center',
    centered && 'w-full h-full',
    className
  )

  const spinnerSize = sizeStyles[size]
  const iconSize = iconSizeStyles[size]
  const colors = colorStyles[variant]

  const spinnerContent =
    type === 'branded' ? (
      <BrandedLoader size={size} />
    ) : type === 'css' ? (
      <div
        className={cn(
          'rounded-full animate-spin',
          spinnerSize,
          colors,
          `border-[length:var(--border-thickness,${borderThickness}px)]`,
          'border-t-transparent'
        )}
        style={
          {
            borderWidth: `${borderThickness}px`,
          } as React.CSSProperties
        }
        role="status"
        aria-label={text || 'Loading'}
      />
    ) : (
      <i
        className={cn('fas fa-spinner fa-spin', iconSize, colors)}
        role="status"
        aria-label={text || 'Loading'}
      />
    )

  return (
    <div className={containerClasses}>
      {spinnerContent}
      {text && (
        <p
          className={cn(
            'mt-4 text-sm font-medium tracking-wide',
            variant === 'white' ? 'text-white' : 'text-[#8b8680]'
          )}
        >
          {text}
        </p>
      )}
    </div>
  )
}

/**
 * LoadingPage Component
 *
 * A full-page loading state with the branded spinner.
 * Matches the warm, human-centered design system.
 */
export function LoadingPage({
  text = 'Loading...',
  variant = 'primary',
  showBranded = true,
}: {
  text?: string
  variant?: LoadingSpinnerProps['variant']
  showBranded?: boolean
}) {
  return (
    <div className="min-h-screen bg-[#faf9f7] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Background Shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#d4a574]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#d4a574]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Loading Content */}
      <div className="relative z-10 text-center">
        {showBranded ? (
          <LoadingSpinner type="branded" size="2xl" text={text} variant={variant} />
        ) : (
          <LoadingSpinner size="xl" variant={variant} />
        )}
        {text && showBranded && (
          <p className="mt-6 text-[#8b8680] text-sm tracking-wide">
            {text}
          </p>
        )}
      </div>

      {/* Subtle footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-xs text-[#8b8680]/60">QuickServe</p>
      </div>

      {/* Add custom keyframes for the branded loader */}
      <style jsx global>{`
        @keyframes steam-rise {
          0%, 100% {
            transform: translateY(0) scaleY(1);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-8px) scaleY(1.2);
            opacity: 0.3;
          }
        }

        @keyframes gentle-bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * SkeletonCard Component
 *
 * A skeleton loading placeholder for card components.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl p-4 border border-[#e8e4df]/60 animate-pulse', className)}>
      {/* Image placeholder */}
      <div className="aspect-[4/3] bg-[#f5f0eb] rounded-xl mb-4" />
      {/* Title placeholder */}
      <div className="h-4 bg-[#f5f0eb] rounded w-3/4 mb-2" />
      {/* Description placeholder */}
      <div className="h-3 bg-[#f5f0eb] rounded w-full mb-2" />
      <div className="h-3 bg-[#f5f0eb] rounded w-2/3 mb-4" />
      {/* Price and button placeholder */}
      <div className="flex items-center justify-between">
        <div className="h-5 bg-[#f5f0eb] rounded w-20" />
        <div className="h-9 bg-[#f5f0eb] rounded-xl w-24" />
      </div>
    </div>
  )
}

/**
 * SkeletonText Component
 *
 * A skeleton loading placeholder for text content.
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2 animate-pulse', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-[#f5f0eb] rounded"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonGrid Component
 *
 * A grid of skeleton cards for loading states.
 */
export function SkeletonGrid({
  count = 6,
  columns = 4,
  className,
}: {
  count?: number
  columns?: number
  className?: string
}) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        gridCols[columns as keyof typeof gridCols] || 'grid-cols-4',
        'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

/**
 * InlineSpinner Component
 *
 * A smaller inline spinner for use within buttons or compact spaces.
 */
export function InlineSpinner({
  size = 'sm',
  variant = 'white',
  className,
}: {
  size?: LoadingSpinnerProps['size']
  variant?: LoadingSpinnerProps['variant']
  className?: string
}) {
  const spinnerSize = sizeStyles[size]
  const colors = colorStyles[variant]

  return (
    <div
      className={cn(
        'rounded-full animate-spin border-2 border-t-transparent',
        spinnerSize,
        colors,
        className
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

/**
 * ButtonSpinner Component
 *
 * A spinner specifically designed for use inside buttons during loading states.
 */
export function ButtonSpinner({
  variant = 'white',
  className,
}: {
  variant?: LoadingSpinnerProps['variant']
  className?: string
}) {
  const colors = colorStyles[variant]

  return (
    <div
      className={cn(
        'w-4 h-4 rounded-full animate-spin border-2 border-t-transparent',
        colors,
        className
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

export default LoadingSpinner
