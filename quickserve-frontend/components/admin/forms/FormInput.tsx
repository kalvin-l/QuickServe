'use client'

import React from 'react'

interface FormInputProps {
  label?: string
  type?: string
  placeholder?: string
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  className?: string
  min?: number
  max?: number
  step?: string
  disabled?: boolean
  maxLength?: number
  error?: string
  id?: string
}

export default function FormInput({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  className = '',
  min,
  max,
  step,
  disabled = false,
  maxLength,
  error,
  id
}: FormInputProps) {
  const hasError = Boolean(error)

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-gray-900 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        maxLength={maxLength}
        className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${
          hasError
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-300 focus:border-[#ec7813] focus:ring-[#ec7813]/20'
        }`}
        aria-invalid={hasError}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <i className="fas fa-exclamation-circle text-xs"></i>
          {error}
        </p>
      )}
    </div>
  )
}
