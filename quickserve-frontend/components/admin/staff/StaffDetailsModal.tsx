/**
 * Staff Details Modal Component
 *
 * Modal dialog for viewing detailed staff information.
 */

'use client';

import { Mail, Phone, MapPin, Calendar, X, Edit2, Trash2 } from 'lucide-react';
import type { AdminUser } from '@/types/admin-auth.types';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { StaffAvatar } from './StaffAvatar';
import { StatusBadge } from './StatusBadge';
import { canPerformAction } from '@/utils/staff-utils';
import { formatHourlyRate, formatHireDate, formatCreatedDate } from '@/utils/staff-utils';

interface StaffDetailsModalProps {
  staff: AdminUser | null;
  onClose: () => void;
  onEdit: (staff: AdminUser) => void;
  onDelete: (staff: AdminUser) => void;
}

export function StaffDetailsModal({
  staff,
  onClose,
  onEdit,
  onDelete,
}: StaffDetailsModalProps) {
  const { user: currentUser } = useAdminAuth();

  if (!staff) return null;

  const canDelete = currentUser ? canPerformAction(currentUser.role, 'delete') : false;
  const canEdit = currentUser ? canPerformAction(currentUser.role, 'edit') : false;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-[#e8e4df]/60">
          <div className="flex items-center gap-4">
            <StaffAvatar staff={staff} size="lg" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#2d2a26]">{staff.name}</h2>
              <p className="text-[#8b8680] capitalize">{staff.role}</p>
              {staff.status && <StatusBadge status={staff.status} className="mt-2" />}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#faf9f7] rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-[#8b8680]" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <ContactCard
              title="Contact"
              fields={[
                {
                  label: 'Email',
                  icon: Mail,
                  value: staff.email,
                },
                {
                  label: 'Phone',
                  icon: Phone,
                  value: staff.phone || 'Not provided',
                  isEmpty: !staff.phone,
                },
              ]}
            />

            {/* Employment Details */}
            <ContactCard
              title="Employment"
              fields={[
                {
                  label: 'Hourly Rate',
                  value: staff.hourly_rate ? formatHourlyRate(Number(staff.hourly_rate)) : 'Not set',
                  isEmpty: !staff.hourly_rate,
                },
                {
                  label: 'Departments',
                  icon: MapPin,
                  value: (staff.department || (staff.departments && staff.departments.length > 0)) ? (
                    <span className="capitalize">
                      {staff.departments && staff.departments.length > 0 ? (
                        <>
                          {staff.departments.map(dept => (
                            <span key={dept} className="inline-flex items-center gap-1 mr-2 last:mr-0">
                              <MapPin className="w-4 h-4 text-[#8b8680]" />
                              <span className="inline-flex items-center px-2 py-0.5 bg-[#d4a574]/10 text-[#d4a574] rounded-full capitalize font-medium">
                                {dept}
                              </span>
                            </span>
                          ))}
                        </>
                      ) : (
                        staff.department || 'Not assigned'
                      )}
                    </span>
                  ) : (
                    'Not assigned'
                  ),
                  isEmpty: !staff.department && (!staff.departments || staff.departments.length === 0),
                },
                {
                  label: 'Hire Date',
                  icon: Calendar,
                  value: formatHireDate(staff.hire_date),
                  isEmpty: !staff.hire_date,
                },
              ]}
            />
          </div>

          {/* Account Info */}
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-[#8b8680] uppercase tracking-wider mb-3">
              Account
            </h3>
            <div className="space-y-2 text-sm">
              <InfoRow
                label="Account Status:"
                value={staff.is_active ? 'Active' : 'Inactive'}
                valueClass={staff.is_active ? 'text-green-600' : 'text-red-600'}
              />
              <InfoRow
                label="Role:"
                value={<span className="capitalize">{staff.role}</span>}
              />
              <InfoRow
                label="Created:"
                value={formatCreatedDate(staff.created_at)}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-[#e8e4df]/60 flex justify-end gap-3">
          {canDelete && (
            <button
              onClick={() => {
                onDelete(staff);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-all text-sm"
            >
              <Trash2 className="w-4 h-4 inline mr-2" />
              Delete
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => {
                onEdit(staff);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 text-[#5c5752] font-medium hover:bg-[#f5f0eb] transition-all text-sm"
            >
              <Edit2 className="w-4 h-4 inline mr-2" />
              Edit
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#2d2a26] text-white font-medium hover:bg-[#3d3a36] transition-all text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ContactCardProps {
  title: string;
  fields: Array<{
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    value: string | React.ReactNode;
    isEmpty?: boolean;
  }>;
}

function ContactCard({ title, fields }: ContactCardProps) {
  return (
    <div className="bg-[#faf9f7] border border-[#e8e4df]/60 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-[#8b8680] uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={index}>
            <label className="text-xs text-[#8b8680] block mb-1">{field.label}</label>
            <div
              className={`flex items-center gap-2 text-sm text-[#2d2a26] ${
                field.isEmpty ? 'text-gray-400 italic' : ''
              }`}
            >
              {field.icon && <field.icon className="w-4 h-4 text-[#8b8680]" />}
              {typeof field.value === 'string' ? (
                <span className={field.isEmpty ? 'text-gray-400 italic' : ''}>
                  {field.value}
                </span>
              ) : (
                field.value
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string | React.ReactNode;
  valueClass?: string;
}

function InfoRow({ label, value, valueClass = 'text-[#2d2a26]' }: InfoRowProps) {
  return (
    <div className="flex justify-between">
      <span className="text-[#8b8680]">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}
