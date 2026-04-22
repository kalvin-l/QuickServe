'use client'

import React from 'react'

export interface OrderStatusBadgeProps {
  status: string
}

/**
 * OrderStatusBadge - Displays order status with appropriate color
 */
export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bg: string }> = {
      received: { label: 'Received', color: 'text-orange-600', bg: 'bg-orange-100' },
      confirmed: { label: 'Confirmed', color: 'text-blue-600', bg: 'bg-blue-100' },
      queued: { label: 'Queued', color: 'text-indigo-600', bg: 'bg-indigo-100' },
      preparing: { label: 'Preparing', color: 'text-yellow-600', bg: 'bg-yellow-100' },
      ready: { label: 'Ready', color: 'text-purple-600', bg: 'bg-purple-100' },
      served: { label: 'Served', color: 'text-green-600', bg: 'bg-green-100' },
      completed: { label: 'Completed', color: 'text-green-600', bg: 'bg-green-100' },
      cancelled: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100' },
    }

    return (
      statusMap[status?.toLowerCase()] || {
        label: status || 'Unknown',
        color: 'text-gray-600',
        bg: 'bg-gray-100'
      }
    )
  }

  const config = getStatusConfig(status)

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {config.label}
    </span>
  )
}
