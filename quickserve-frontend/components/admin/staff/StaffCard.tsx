/**
 * Staff Card Component
 *
 * Displays a staff member in a card format with actions.
 */

'use client';

import { useState } from 'react';
import { MapPin, Edit2, Trash2, Power, Loader2, Info } from 'lucide-react';
import type { AdminUser, AdminStatus } from '@/types/admin-auth.types';
import { canPerformAction } from '@/utils/staff-utils';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { StaffAvatar } from './StaffAvatar';
import { StatusBadge } from './StatusBadge';
import { STATUS_CYCLE } from '@/constants/staff';

interface StaffCardProps {
  staff: AdminUser;
  onView: (staff: AdminUser) => void;
  onEdit: (staff: AdminUser) => void;
  onDelete: (staff: AdminUser) => void;
  onStatusToggle: (staff: AdminUser, newStatus: AdminStatus) => void;
  actionLoading?: string | null;
}

export function StaffCard({
  staff,
  onView,
  onEdit,
  onDelete,
  onStatusToggle,
  actionLoading,
}: StaffCardProps) {
  const { user: currentUser } = useAdminAuth();
  const [isHovered, setIsHovered] = useState(false);

  const canEdit = currentUser ? canPerformAction(currentUser.role, 'edit', staff.role) : false;
  const canDelete = currentUser ? canPerformAction(currentUser.role, 'delete') : false;
  const isLoading = actionLoading === `status-${staff.id}` || actionLoading === `delete-${staff.id}`;

  const handleStatusToggle = () => {
    const statusCycle: Record<string, AdminStatus> = STATUS_CYCLE;
    const newStatus = statusCycle[staff.status || 'active'] || 'on_break';
    onStatusToggle(staff, newStatus);
  };

  const handleDelete = () => {
    onDelete(staff);
  };

  return (
    <div
      className={`relative rounded-xl p-4 border border-[#e8e4df]/60 bg-white transition-all cursor-pointer group ${
        isHovered ? 'shadow-md' : ''
      }`}
      onClick={() => onView(staff)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Offset shadow */}
      {isHovered && (
        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10 transition-opacity" />
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <StaffAvatar staff={staff} size="md" />

        {/* Staff Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h3 className="font-semibold text-[#2d2a26] truncate">{staff.name}</h3>
              <p className="text-xs text-[#8b8680] capitalize">{staff.role}</p>
            </div>
            {staff.status && <StatusBadge status={staff.status} size="sm" />}
          </div>

          <div className="space-y-1 mb-3">
            {staff.hourly_rate && (
              <div className="flex items-center gap-2 text-xs text-[#5c5752]">
                <span>₱{Number(staff.hourly_rate).toFixed(2)}/hr</span>
              </div>
            )}
            {/* Display departments - supports both single and multiple */}
            {(staff.department || (staff.departments && staff.departments.length > 0)) && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#5c5752]">
                <MapPin className="w-3.5 h-3.5 text-[#8b8680] flex-shrink-0" />
                {staff.departments && staff.departments.length > 0 ? (
                  // Multiple departments
                  staff.departments.map(dept => (
                    <span key={dept} className="inline-flex items-center px-2 py-0.5 bg-[#d4a574]/10 text-[#d4a574] rounded-full capitalize font-medium">
                      {dept}
                    </span>
                  ))
                ) : (
                  // Single department (legacy)
                  <span className="capitalize">{staff.department}</span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onView(staff); }}
              className="flex-1 px-3 py-1.5 bg-[#2d2a26] text-white rounded-lg text-xs font-medium hover:bg-[#3d3a36] transition-all"
            >
              View
            </button>
            {canEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(staff); }}
                className="p-1.5 bg-[#faf9f7] border border-[#e8e4df]/60 text-[#8b8680] rounded-lg hover:bg-[#f5f0eb] hover:text-[#2d2a26] transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleStatusToggle(); }}
              disabled={isLoading}
              className="p-1.5 bg-[#faf9f7] border border-[#e8e4df]/60 text-[#8b8680] rounded-lg hover:bg-[#f5f0eb] hover:text-[#2d2a26] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Power className="w-3.5 h-3.5" />
              )}
            </button>
            {canDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={isLoading}
                className="p-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
