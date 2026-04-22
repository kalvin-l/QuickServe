'use client'

import React from 'react'
import { Inbox, Flame, Bell, CheckCircle } from 'lucide-react'
import CardWrapper from '@/components/admin/ui/CardWrapper'

export interface OrdersStatsCardProps {
  pending: number
  kitchen: number
  ready: number
  served: number
}

/**
 * Stats cards showing order counts
 * Displays: Pending, Kitchen, Ready, Served counts
 */
export default function OrdersStatsCard({
  pending,
  kitchen,
  ready,
  served,
}: OrdersStatsCardProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Pending */}
      <CardWrapper className="flex items-center gap-4" noPadding>
        <div className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-[#fef3c7] text-[#f59e0b]">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-[#8b8680] uppercase font-bold tracking-[0.15em]">Pending</p>
            <p className="text-2xl font-bold text-[#2d2a26] tracking-tight">{pending}</p>
          </div>
        </div>
      </CardWrapper>

      {/* Kitchen */}
      <CardWrapper className="flex items-center gap-4" noPadding>
        <div className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-[#fef3c7] text-[#f59e0b]">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-[#8b8680] uppercase font-bold tracking-[0.15em]">Kitchen</p>
            <p className="text-2xl font-bold text-[#2d2a26] tracking-tight">{kitchen}</p>
          </div>
        </div>
      </CardWrapper>

      {/* Ready */}
      <CardWrapper className="flex items-center gap-4" noPadding>
        <div className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-[#f3e8ff] text-[#a855f7]">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-[#8b8680] uppercase font-bold tracking-[0.15em]">Ready</p>
            <p className="text-2xl font-bold text-[#2d2a26] tracking-tight">{ready}</p>
          </div>
        </div>
      </CardWrapper>

      {/* Served */}
      <CardWrapper className="flex items-center gap-4" noPadding>
        <div className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-[#f0fdf4] text-[#22c55e]">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-[#8b8680] uppercase font-bold tracking-[0.15em]">Served</p>
            <p className="text-2xl font-bold text-[#2d2a26] tracking-tight">{served}</p>
          </div>
        </div>
      </CardWrapper>
    </div>
  )
}
