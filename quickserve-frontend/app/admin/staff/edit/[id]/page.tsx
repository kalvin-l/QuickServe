'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import CardWrapper from '@/components/admin/ui/CardWrapper'
import { MultiSelect } from '@/components/admin/ui/MultiSelect'
import { getStaffById, updateStaff } from '@/lib/staff-api'
import { getStaffInitials, getAvatarColor, getStatusColor, getStatusLabel } from '@/lib/staff-api'
import type { StaffUpdateRequest, AdminUser, AdminRole, AdminDepartment, AdminStatus } from '@/types/admin-auth.types'
import { Users, Mail, Phone, Calendar, MapPin, Shield, AlertCircle, Loader2, X, Info } from 'lucide-react'

const roleOptions: { value: AdminRole; label: string }[] = [
  { value: 'staff', label: 'Staff' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Administrator' }
]

const departmentOptions: { value: AdminDepartment; label: string }[] = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'barista', label: 'Barista' },
  { value: 'service', label: 'Service' },
  { value: 'management', label: 'Management' }
]

const statusOptions: { value: AdminStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'on_break', label: 'On Break' },
  { value: 'off_duty', label: 'Off Duty' },
  { value: 'on_leave', label: 'On Leave' }
]

export default function EditStaffPage() {
  const params = useParams()
  const router = useRouter()
  const staffId = parseInt(params.id as string)

  const [staff, setStaff] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDepartments, setSelectedDepartments] = useState<AdminDepartment[]>([])

  const [formData, setFormData] = useState<StaffUpdateRequest>({
    name: '',
    email: '',
    role: undefined,
    departments: undefined,
    status: undefined,
    hourly_rate: undefined,
    phone: undefined,
    is_active: undefined,
    hire_date: undefined
  })

  // Load staff data
  useEffect(() => {
    const loadStaffData = async () => {
      if (!staffId) {
        setError('Invalid staff ID')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await getStaffById(staffId)
        setStaff(data)
        // Load departments array
        const depts = data.departments || (data.department ? [data.department] : [])
        setSelectedDepartments(depts)
        setFormData({
          name: data.name,
          email: data.email,
          role: data.role,
          departments: depts,
          status: data.status,
          hourly_rate: data.hourly_rate,
          phone: data.phone,
          is_active: data.is_active,
          hire_date: data.hire_date
        })
      } catch (err: any) {
        setError(err.response?.data?.detail || err.message || 'Failed to load staff data')
      } finally {
        setIsLoading(false)
      }
    }

    loadStaffData()
  }, [staffId])

  const handleInputChange = (field: keyof StaffUpdateRequest, value: string | number | boolean | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleDepartmentsChange = (departments: string[]) => {
    setSelectedDepartments(departments as AdminDepartment[])
    setFormData(prev => ({ ...prev, departments: departments as AdminDepartment[] }))
    setError(null)
  }

  const validateForm = (): boolean => {
    if (!formData.name?.trim()) {
      setError('Name is required')
      return false
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }
    if (formData.hourly_rate !== undefined && formData.hourly_rate < 0) {
      setError('Hourly rate must be a positive number')
      return false
    }
    // Validate departments for staff role
    const role = formData.role || staff?.role
    if (role === 'staff' && (!selectedDepartments || selectedDepartments.length === 0)) {
      setError('Please select at least one department for staff role')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await updateStaff(staffId, formData)
      router.push('/admin/staff')
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to update staff member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const goBack = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <AdminLayout pageTitle="Loading..." pageSubtitle="Please wait">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#d4a574] animate-spin" />
          <p className="mt-4 text-[#5c5752]">Loading staff data...</p>
        </div>
      </AdminLayout>
    )
  }

  if (!staff) {
    return (
      <AdminLayout pageTitle="Error" pageSubtitle="Staff not found">
        <div className="text-center py-20">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-[#5c5752]">Staff member not found</p>
          <button
            onClick={() => router.push('/admin/staff')}
            className="mt-4 px-6 py-2 rounded-xl bg-[#d4a574] text-white hover:bg-[#c49a6b] transition-all"
          >
            Back to Staff List
          </button>
        </div>
      </AdminLayout>
    )
  }

  const avatarPreview = formData.name ? getStaffInitials(formData.name) : '??'
  const avatarColor = getAvatarColor(formData.name || '')

  return (
    <AdminLayout
      pageTitle={`Edit Staff: ${staff.name}`}
      pageSubtitle="Update staff member information"
    >
      {/* Back Button */}
      <div className="flex items-center justify-end mb-6">
        <button
          onClick={goBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
        >
          <span>Back to Staff</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Overview Card */}
        <CardWrapper className="p-6">
          <div className="flex items-center gap-6">
            {staff.avatar_url ? (
              <img
                src={staff.avatar_url}
                alt={staff.name}
                className="w-24 h-24 rounded-xl object-cover"
              />
            ) : (
              <div className={`w-24 h-24 ${avatarColor} rounded-xl flex items-center justify-center text-white font-bold text-3xl`}>
                {avatarPreview}
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[#2d2a26]">{formData.name || 'New Staff Member'}</h3>
              <p className="text-[#8b8680] capitalize">{formData.role || staff.role || 'Role not set'}</p>
              {formData.status && (
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(formData.status).bg} ${getStatusColor(formData.status).text} ${getStatusColor(formData.status).border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(formData.status).dot}`} />
                    {getStatusLabel(formData.status)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardWrapper>

        {/* Personal Information */}
        <CardWrapper className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#d4a574]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#d4a574]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#2d2a26]">Personal Information</h3>
              <p className="text-sm text-[#8b8680]">Basic information about the staff member</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-[#2d2a26] mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter full name"
                className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 text-[#2d2a26] placeholder-[#8b8680] focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#2d2a26] mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b8680]" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e8e4df]/60 text-[#2d2a26] placeholder-[#8b8680] focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-[#2d2a26] mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b8680]" />
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e8e4df]/60 text-[#2d2a26] placeholder-[#8b8680] focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        </CardWrapper>

        {/* Role & Department */}
        <CardWrapper className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#d4a574]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#d4a574]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#2d2a26]">Role & Department</h3>
              <p className="text-sm text-[#8b8680]">Assign role and department</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-[#2d2a26] mb-2">
                Role
              </label>
              <select
                value={formData.role || staff.role}
                onChange={(e) => handleInputChange('role', e.target.value as AdminRole)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 text-[#2d2a26] focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:border-transparent transition-all"
              >
                {roleOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Departments - Multi Select */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#2d2a26] mb-2">
                Departments
                <span className="ml-2 text-xs font-normal text-[#8b8680]">(Select all that apply)</span>
              </label>
              <MultiSelect
                options={departmentOptions}
                selected={selectedDepartments}
                onChange={handleDepartmentsChange}
                placeholder="Select departments..."
                className="w-full"
              />
              {selectedDepartments.length > 0 && (
                <div className="mt-2 flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    This staff member has access to: <strong>{selectedDepartments.map(d => departmentOptions.find(opt => opt.value === d)?.label || d).join(', ')}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-[#2d2a26] mb-2">
                Status
              </label>
              <select
                value={formData.status || staff.status || ''}
                onChange={(e) => handleInputChange('status', e.target.value as AdminStatus | undefined)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 text-[#2d2a26] focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:border-transparent transition-all"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Account Status Toggle */}
          <div className="mt-6 flex items-center gap-3 p-4 bg-[#faf9f7] rounded-xl">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active ?? staff.is_active ?? true}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-[#d4a574] focus:ring-[#d4a574]"
            />
            <label htmlFor="is_active" className="text-sm text-[#2d2a26]">
              Account is active (staff can log in)
            </label>
          </div>
        </CardWrapper>

        {/* Employment Details */}
        <CardWrapper className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#d4a574]/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#d4a574]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#2d2a26]">Employment Details</h3>
              <p className="text-sm text-[#8b8680]">Hourly rate and hire information</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hourly Rate */}
            <div>
              <label className="block text-sm font-medium text-[#2d2a26] mb-2">
                Hourly Rate
              </label>
              <input
                type="number"
                value={formData.hourly_rate ?? ''}
                onChange={(e) => handleInputChange('hourly_rate', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Enter hourly rate"
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 text-[#2d2a26] placeholder-[#8b8680] focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:border-transparent transition-all"
              />
            </div>

            {/* Hire Date */}
            <div>
              <label className="block text-sm font-medium text-[#2d2a26] mb-2">
                Hire Date
              </label>
              <input
                type="date"
                value={formData.hire_date?.split('T')[0] || staff.hire_date?.split('T')[0] || ''}
                onChange={(e) => handleInputChange('hire_date', e.target.value || undefined)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 text-[#2d2a26] focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:border-transparent transition-all"
              />
            </div>

            {/* New Password (Optional) */}
            <div>
              <label className="block text-sm font-medium text-[#2d2a26] mb-2">
                New Password
              </label>
              <input
                type="password"
                onChange={(e) => handleInputChange('password', e.target.value || undefined)}
                placeholder="Leave blank to keep current"
                className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 text-[#2d2a26] placeholder-[#8b8680] focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:border-transparent transition-all"
              />
            </div>
          </div>
        </CardWrapper>

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={goBack}
            className="px-6 py-2.5 rounded-xl border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#faf9f7] transition-all font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#d4a574] text-white hover:bg-[#c49a6b] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </AdminLayout>
  )
}
