'use client'

import React from 'react'
import Link from 'next/link'
import { Inbox, ArrowRight } from 'lucide-react'

interface EmptyStateProps {
  filter?: 'all' | 'active' | 'completed' | 'cancelled'
}

const EMPTY_STATE_CONFIG: Record<string, {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}> = {
  all: {
    title: 'No orders yet',
    description: 'Your order history will appear here once you place your first order.',
    actionLabel: 'Browse Menu',
    actionHref: '/menu',
  },
  active: {
    title: 'No active orders',
    description: "You don't have any orders currently being prepared.",
  },
  completed: {
    title: 'No completed orders',
    description: 'Your completed orders will appear here.',
  },
  cancelled: {
    title: 'No cancelled orders',
    description: 'Your cancelled orders will appear here.',
  },
}

export default function EmptyState({ filter = 'all' }: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[filter] || EMPTY_STATE_CONFIG.all

  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4">
      {/* Icon with subtle background */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-[#d4a574]/10 rounded-full scale-150" />
        <div className="relative w-16 h-16 bg-[#f5f0eb] rounded-full flex items-center justify-center">
          <Inbox className="w-7 h-7 text-[#d4a574]" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-[#2d2a26] mb-2">
        {config.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-[#8b8680] text-center max-w-xs mb-8">
        {config.description}
      </p>

      {/* Action Button */}
      {config.actionLabel && config.actionHref && (
        <Link
          href={config.actionHref}
          className="group inline-flex items-center gap-2 px-6 py-3 bg-[#2d2a26] hover:bg-[#3d3a36] text-white text-sm font-medium rounded-xl transition-all duration-200"
        >
          <span>{config.actionLabel}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}
