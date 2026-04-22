'use client'

import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui'

interface ErrorFallbackProps {
  error?: Error
  resetError?: () => void
  showHomeButton?: boolean
}

export function ErrorFallback({
  error,
  resetError,
  showHomeButton = true,
}: ErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-6">
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          {resetError && (
            <Button onClick={resetError} variant="primary" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
          )}
          {showHomeButton && (
            <Button
              onClick={() => (window.location.href = '/')}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go home
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

interface InlineErrorProps {
  message: string
  onRetry?: () => void
}

export function InlineError({ message, onRetry }: InlineErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6 text-red-600" />
      </div>
      <p className="text-gray-700 font-medium mb-1">Error loading data</p>
      <p className="text-gray-500 text-sm mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      )}
    </div>
  )
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-500 mb-6 max-w-sm">{description}</p>}
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  )
}
