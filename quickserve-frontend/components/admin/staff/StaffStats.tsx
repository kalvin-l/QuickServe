/**
 * Staff Statistics Cards Component
 *
 * Displays overview statistics for staff management.
 */

'use client';

import { Users, UserCheck, UserX } from 'lucide-react';
import CardWrapper from '@/components/admin/ui/CardWrapper';

interface StaffStatsProps {
  totalStaff: number;
  activeStaff: number;
  onLeave: number;
  loading?: boolean;
}

export function StaffStats({
  totalStaff,
  activeStaff,
  onLeave,
  loading = false,
}: StaffStatsProps) {
  const stats = [
    {
      id: 'total',
      label: 'Total Staff',
      value: totalStaff,
      sublabel: 'All departments',
      icon: Users,
      color: 'text-[#d4a574]',
      bgColor: 'bg-[#faf9f7]',
      borderColor: 'border-[#e8e4df]/60',
    },
    {
      id: 'active',
      label: 'Working Now',
      value: activeStaff,
      sublabel: 'Active staff',
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200',
    },
    {
      id: 'leave',
      label: 'On Leave',
      value: onLeave,
      sublabel: 'This week',
      icon: UserX,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      borderColor: 'border-amber-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <CardWrapper key={stat.id} className="!p-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl ${stat.bgColor} ${
                stat.borderColor ? `border ${stat.borderColor}` : ''
              } flex items-center justify-center`}
            >
              {loading ? (
                <div className={`w-5 h-5 border-2 ${stat.color.replace('text-', 'border-')} border-t-transparent rounded-full animate-spin`} />
              ) : (
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#8b8680] uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-[#2d2a26] tracking-tight">
                {loading ? '-' : stat.value}
              </p>
              <p className="text-xs text-[#8b8680]">{stat.sublabel}</p>
            </div>
          </div>
        </CardWrapper>
      ))}
    </div>
  );
}
