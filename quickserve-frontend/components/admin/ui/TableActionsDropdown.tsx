'use client'

import React, { useState, useRef, useEffect } from 'react'

export interface Action {
  key: string
  label: string
  icon: string
  href?: string
  colorClass?: string
  show?: () => boolean
  onClick?: () => void
}

export interface TableActionsDropdownProps {
  actions: Action[]
  row?: any
  onAction?: (action: { key: string; row: any }) => void
}

/**
 * TableActionsDropdown - Dropdown menu for table row actions
 */
export default function TableActionsDropdown({ actions, row, onAction }: TableActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Filter visible actions
  const visibleActions = actions.filter((action) => {
    if (action.show && typeof action.show === 'function') {
      return action.show()
    }
    return true
  })

  if (visibleActions.length === 0) return null

  const handleActionClick = (action: Action) => {
    setIsOpen(false)

    if (action.onClick) {
      action.onClick()
    }

    if (onAction) {
      onAction({ key: action.key, row })
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <i className="fas fa-ellipsis-v text-gray-600"></i>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          {visibleActions.map((action) => (
            <button
              key={action.key}
              onClick={() => handleActionClick(action)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                action.colorClass || 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <i className={`fas ${action.icon}`}></i>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
