/**
 * Department Filter Tabs Component
 *
 * Tab navigation for filtering staff by department.
 */

'use client';

import type { AdminDepartment } from '@/constants/staff';

interface DepartmentTabsProps {
  selectedDepartment: 'all' | AdminDepartment;
  onSelect: (department: 'all' | AdminDepartment) => void;
  totalStaff: number;
  currentCount: number;
}

const TABS: Array<{ value: 'all' | AdminDepartment; label: string }> = [
  { value: 'all', label: 'All Staff' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'barista', label: 'Baristas' },
  { value: 'service', label: 'Service' },
  { value: 'management', label: 'Management' },
];

export function DepartmentTabs({
  selectedDepartment,
  onSelect,
  totalStaff,
  currentCount,
}: DepartmentTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const count = tab.value === 'all' ? totalStaff : currentCount;
        const isSelected = selectedDepartment === tab.value;

        return (
          <button
            key={tab.value}
            onClick={() => onSelect(tab.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              isSelected
                ? 'bg-[#d4a574] text-white'
                : 'bg-[#faf9f7] border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#f5f0eb]'
            }`}
          >
            {tab.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                isSelected ? 'bg-white/20' : 'bg-white text-[#8b8680]'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
