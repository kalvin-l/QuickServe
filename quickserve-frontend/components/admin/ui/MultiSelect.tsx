/**
 * MultiSelect Component
 *
 * A reusable multi-select dropdown component for selecting multiple options.
 * Used for department selection in staff forms.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select options...',
  disabled = false,
  className = ''
}: MultiSelectProps) {
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
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const removeOption = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter(v => v !== value))
  }

  const getSelectedLabels = () => {
    return options
      .filter(opt => selected.includes(opt.value))
      .map(opt => opt.label)
      .join(', ')
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button (using div to avoid nested button issue) */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setIsOpen(!isOpen)
          }
        }}
        aria-disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2.5
          bg-white border rounded-lg text-sm
          transition-colors duration-200
          ${disabled
            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'border-[#e8e4df] hover:border-[#d4a574] cursor-pointer'
          }
          ${isOpen ? 'ring-2 ring-[#d4a574]/20' : ''}
        `}
      >
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          {selected.length === 0 ? (
            <span className="text-[#8b8680]">{placeholder}</span>
          ) : (
            selected.map(value => {
              const option = options.find(opt => opt.value === value)
              return (
                <span
                  key={value}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[#d4a574]/10 text-[#d4a574] rounded-md text-xs font-medium"
                >
                  {option?.label || value}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => removeOption(value, e)}
                      className="hover:text-[#2d2a26] rounded-sm hover:bg-[#d4a574]/20 p-0.5"
                      aria-label={`Remove ${option?.label || value}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              )
            })
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-[#8b8680] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-[#e8e4df] rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => {
            const isSelected = selected.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleOption(option.value)}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 text-sm
                  transition-colors duration-150
                  ${isSelected
                    ? 'bg-[#d4a574] text-white'
                    : 'text-[#5c5752] hover:bg-[#f5f0eb]'
                  }
                `}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <Check className="w-4 h-4" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
