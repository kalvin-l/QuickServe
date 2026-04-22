'use client'

import { MoreVertical, Eye, Edit, Trash2, Power } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

export interface Action<T = any> {
  label: string
  icon?: React.ReactNode
  onClick: (row: T) => void | Promise<void>
  variant?: 'default' | 'danger' | 'success' | 'warning'
  disabled?: boolean
  showInMenu?: boolean
}

interface TableActionsProps<T> {
  actions: Action<T>[]
  row: T
  className?: string
}

export function TableActions<T>({ actions, row, className }: TableActionsProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Get quick actions (shown directly)
  const quickActions = actions.filter((a) => !a.showInMenu)
  // Get menu actions (shown in dropdown)
  const menuActions = actions.filter((a) => a.showInMenu)

  const getVariantStyles = (variant?: string) => {
    switch (variant) {
      case 'danger':
        return 'text-red-600 hover:bg-red-50 hover:text-red-700'
      case 'success':
        return 'text-green-600 hover:bg-green-50 hover:text-green-700'
      case 'warning':
        return 'text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700'
      default:
        return 'text-gray-700 hover:bg-gray-100'
    }
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Quick actions */}
      {quickActions.map((action, index) => (
        <button
          key={index}
          onClick={() => action.onClick(row)}
          disabled={action.disabled}
          className={cn(
            'p-2 rounded-lg transition-colors',
            getVariantStyles(action.variant),
            action.disabled && 'opacity-50 cursor-not-allowed'
          )}
          title={action.label}
        >
          {action.icon || <Edit className="h-4 w-4" />}
        </button>
      ))}

      {/* Dropdown menu actions */}
      {menuActions.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="More actions"
          >
            <MoreVertical className="h-4 w-4 text-gray-600" />
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {menuActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick(row)
                    setIsOpen(false)
                  }}
                  disabled={action.disabled}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors',
                    getVariantStyles(action.variant),
                    action.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Preset action creators for convenience
export const createViewAction = <T,>(onClick: (row: T) => void): Action<T> => ({
  label: 'View',
  icon: <Eye className="h-4 w-4" />,
  onClick,
  variant: 'default',
})

export const createEditAction = <T,>(onClick: (row: T) => void): Action<T> => ({
  label: 'Edit',
  icon: <Edit className="h-4 w-4" />,
  onClick,
  variant: 'default',
})

export const createDeleteAction = <T,>(onClick: (row: T) => void): Action<T> => ({
  label: 'Delete',
  icon: <Trash2 className="h-4 w-4" />,
  onClick,
  variant: 'danger',
})

export const createToggleAction = <T,>(
  onClick: (row: T) => void,
  label: string = 'Toggle Status'
): Action<T> => ({
  label,
  icon: <Power className="h-4 w-4" />,
  onClick,
  variant: 'warning',
})
