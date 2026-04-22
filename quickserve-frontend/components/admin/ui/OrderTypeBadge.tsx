'use client'

import React from 'react'

export interface OrderTypeBadgeProps {
  isGroup?: boolean
  tableNumber?: string
}

/**
 * OrderTypeBadge - Displays order type (Individual/Group) with table number
 */
export default function OrderTypeBadge({ isGroup = false, tableNumber }: OrderTypeBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      {isGroup ? (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-semibold">
          <i className="fas fa-users text-[10px]"></i>
          <span>Group</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold">
          <i className="fas fa-user text-[10px]"></i>
          <span>Individual</span>
        </span>
      )}
      {tableNumber && (
        <span className="text-sm font-medium text-gray-900">{tableNumber}</span>
      )}
    </div>
  )
}
