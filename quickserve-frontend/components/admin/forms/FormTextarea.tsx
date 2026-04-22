'use client'

import React, { useState } from 'react'

interface FormTextareaProps {
  label?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  rows?: number
  maxLength?: number
  showCharCount?: boolean
  required?: boolean
  className?: string
  error?: string
  id?: string
}

export default function FormTextarea({
  label,
  placeholder,
  value,
  onChange,
  rows = 4,
  maxLength = 500,
  showCharCount = false,
  required = false,
  className = '',
  error,
  id
}: FormTextareaProps) {
  const currentLength = value?.length || 0
  const hasError = Boolean(error)
  const isOverLimit = maxLength && currentLength > maxLength

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-gray-900 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        maxLength={maxLength}
        required={required}
        className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 outline-none transition-all resize-y ${
          hasError || isOverLimit
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-300 focus:border-[#ec7813] focus:ring-2 focus:ring-[#ec7813]/20'
        }`}
        aria-invalid={hasError || isOverLimit}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <div className="flex items-center justify-between mt-1">
        {error && (
          <p id={`${id}-error`} className="text-sm text-red-600 flex items-center gap-1">
            <i className="fas fa-exclamation-circle text-xs"></i>
            {error}
          </p>
        )}
        {showCharCount && (
          <div className={`text-right text-xs ml-auto ${isOverLimit ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            {currentLength}/{maxLength}
          </div>
        )}
      </div>
    </div>
  )
}
