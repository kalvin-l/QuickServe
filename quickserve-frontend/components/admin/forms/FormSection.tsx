'use client'

import React from 'react'

interface FormSectionProps {
  title: string
  subtitle: string
  icon: string
}

export default function FormSection({ title, subtitle, icon }: FormSectionProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <i className={`fas fa-${icon} text-2xl text-[#ec7813]`}></i>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="h-px bg-gray-200 mt-4"></div>
    </div>
  )
}
