'use client'

import React from 'react'

interface SelectOption {
  value: string
  label: string
}

interface FormSelectProps {
  label?: string
  placeholder?: string
  value?: string | number
  options: SelectOption[]
  onChange?: (value: string) => void
  required?: boolean
  className?: string
  disabled?: boolean
  error?: string
  id?: string
}

export default function FormSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
  required = false,
  className = '',
  disabled = false,
  error,
  id
}: FormSelectProps) {
  const hasError = Boolean(error)

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-gray-900 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        disabled={disabled}
        className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${
          hasError
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-300 focus:border-[#ec7813] focus:ring-2 focus:ring-[#ec7813]/20'
        }`}
        aria-invalid={hasError}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <i className="fas fa-exclamation-circle text-xs"></i>
          {error}
        </p>
      )}
    </div>
  )
}
