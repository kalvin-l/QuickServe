'use client'

import React, { ReactNode } from 'react'

export interface CardWrapperProps {
  children: ReactNode
  className?: string
  noPadding?: boolean
}

/**
 * CardWrapper - Warm, human-centered card design
 * Offset shadows, caramel accents, editorial styling
 */
export default function CardWrapper({ children, className = '', noPadding = false }: CardWrapperProps) {
  return (
    <div className={`relative bg-white rounded-2xl border border-[#e8e4df]/60 shadow-sm ${className}`}>
      {/* Offset shadow effect */}
      <div className="absolute inset-0 translate-x-1 translate-y-1 bg-[#d4a574]/5 rounded-2xl -z-10" />
      <div className={`${noPadding ? '' : 'p-6'}`}>
        {children}
      </div>
    </div>
  )
}
