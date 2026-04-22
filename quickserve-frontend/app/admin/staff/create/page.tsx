'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import CardWrapper from '@/components/admin/ui/CardWrapper'
import { MultiSelect } from '@/components/admin/ui/MultiSelect'
import { createStaff } from '@/lib/staff-api'
import type { StaffCreateRequest, AdminRole, AdminDepartment, AdminStatus } from '@/types/admin-auth.types'
import { Users, Mail, Phone, Calendar, MapPin, Shield, Key, AlertCircle, Loader2, Info } from 'lucide-react'

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

export default function CreateStaffPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<StaffCreateRequest>({
    email: '',
    name: '',
    password: '',
    role: 'staff',
    departments: [],
    status: 'active',
    hourly_rate: undefined,
    phone: undefined
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDepartments, setSelectedDepartments] = useState<AdminDepartment[]>([])

  // Validation errors state
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: '',
    departments: '',
    hourly_rate: '',
    hire_date: ''
  })

  // Track touched fields
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    phone: false,
    role: false,
    departments: false,
    hourly_rate: false,
    hire_date: false
  })

  const [formSubmitted, setFormSubmitted] = useState(false)

  // Validation rules
  const validateField = (name: string, value: any): string => {
    switch (name) {
      case 'name':
        if (!value || value.trim() === '') {
          return 'Full name is required'
        }
        if (value.trim().length < 2) {
          return 'Name must be at least 2 characters'
        }
        if (value.trim().length > 255) {
          return 'Name must not exceed 255 characters'
        }
        // Check for at least first and last name
        if (value.trim().split(' ').length < 2) {
          return 'Please enter both first and last name'
        }
        return ''

      case 'email':
        if (!value || value.trim() === '') {
          return 'Email address is required'
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address'
        }
        return ''

      case 'password':
        if (!value || value === '') {
          return 'Password is required'
        }
        if (value.length < 6) {
          return 'Password must be at least 6 characters'
        }
        if (value.length > 100) {
          return 'Password must not exceed 100 characters'
        }
        // Password strength suggestions
        if (!/(?=.*[a-z])/.test(value)) {
          return 'Password must contain at least one lowercase letter'
        }
        if (!/(?=.*[A-Z])/.test(value)) {
          return 'Password must contain at least one uppercase letter'
        }
        if (!/(?=.*\d)/.test(value)) {
          return 'Password must contain at least one number'
        }
        return ''

      case 'phone':
        if (value && value.trim() !== '') {
          const phoneRegex = /^[\d\s\-\+\(\)]+$/
          if (!phoneRegex.test(value)) {
            return 'Please enter a valid phone number'
          }
          if (value.replace(/\D/g, '').length < 10) {
            return 'Phone number must be at least 10 digits'
          }
          if (value.length > 20) {
            return 'Phone number must not exceed 20 characters'
          }
        }
        return ''

      case 'role':
        if (!value) {
          return 'Please select a role'
        }
        return ''

      case 'departments':
        if (formData.role === 'staff' && (!value || value.length === 0)) {
          return 'Please select at least one department for staff role'
        }
        return ''

      case 'hourly_rate':
        if (value !== undefined && value !== null && value !== '') {
          const rate = parseFloat(value)
          if (isNaN(rate)) {
            return 'Please enter a valid hourly rate'
          }
          if (rate < 0) {
            return 'Hourly rate cannot be negative'
          }
          if (rate > 9999.99) {
            return 'Hourly rate cannot exceed ₱9,999.99'
          }
        }
        return ''

      case 'hire_date':
        // Hire date is optional
        if (value) {
          const hireDate = new Date(value)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          if (hireDate > today) {
            return 'Hire date cannot be in the future'
          }
        }
        return ''

      default:
        return ''
    }
  }

  const validateForm = (): boolean => {
    const newErrors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
      phone: validateField('phone', formData.phone),
      role: validateField('role', formData.role),
      departments: validateField('departments', selectedDepartments),
      hourly_rate: validateField('hourly_rate', formData.hourly_rate),
      hire_date: validateField('hire_date', formData.hire_date)
    }

    setErrors(newErrors)
    return Object.values(newErrors).every(error => error === '')
  }

  const handleInputChange = (field: keyof StaffCreateRequest, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)

    // Validate on change if field has been touched or form was submitted
    if (touched[field as keyof typeof touched] || formSubmitted) {
      const error = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }

  const handleInputBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, formData[field as keyof StaffCreateRequest])
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const handleDepartmentsChange = (departments: string[]) => {
    setSelectedDepartments(departments as AdminDepartment[])
    setFormData(prev => ({ ...prev, departments: departments as AdminDepartment[] }))
    setError(null)

    // Validate departments
    if (touched.departments || formSubmitted) {
      const error = validateField('departments', departments)
      setErrors(prev => ({ ...prev, departments: error }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      password: true,
      phone: true,
      role: true,
      departments: true,
      hourly_rate: true,
      hire_date: true
    })
    setFormSubmitted(true)

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors).find(key => errors[key as keyof typeof errors] !== '')
      if (firstErrorField) {
        const input = document.querySelector(`[id="${firstErrorField}"]`) as HTMLElement
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        input?.focus()
      }
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createStaff(formData)
      router.push('/admin/staff')
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create staff member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const goBack = () => {
    router.back()
  }

  return (
    <AdminLayout
      pageTitle="Add New Staff Member"
      pageSubtitle="Create a new staff member profile and assign roles"
    >
      {/* Header Actions */}
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
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
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
              <label htmlFor="name" className="block text-sm font-medium text-[#2d2a26] mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onBlur={() => handleInputBlur('name')}
                placeholder="Enter full name"
                className={`w-full px-4 py-2.5 rounded-xl text-[#2d2a26] placeholder-[#8b8680] focus:outline-none focus:ring-2 transition-all ${
                  errors.name
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-[#e8e4df]/60 focus:ring-[#d4a574]/20 focus:border-[#d4a574]'
                }`}
                required
              />
              {errors.name && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#2d2a26] mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.email ? 'text-red-400' : 'text-[#8b8680]'}`} />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={() => handleInputBlur('email')}
                  placeholder="Enter email address"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-[#2d2a26] placeholder-[#8b8680] focus:outline-none focus:ring-2 transition-all ${
                    errors.email
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-[#e8e4df]/60 focus:ring-[#d4a574]/20 focus:border-[#d4a574]'
                  }`}
                  required
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#2d2a26] mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.phone ? 'text-red-400' : 'text-[#8b8680]'}`} />
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  onBlur={() => handleInputBlur('phone')}
                  placeholder="Enter phone number"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-[#2d2a26] placeholder-[#8b8680] focus:outline-none focus:ring-2 transition-all ${
                    errors.phone
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-[#e8e4df]/60 focus:ring-[#d4a574]/20 focus:border-[#d4a574]'
                  }`}
                />
              </div>
              {errors.phone && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#2d2a26] mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Key className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.password ? 'text-red-400' : 'text-[#8b8680]'}`} />
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onBlur={() => handleInputBlur('password')}
                  placeholder="Enter password (min 6 characters)"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-[#2d2a26] placeholder-[#8b8680] focus:outline-none focus:ring-2 transition-all ${
                    errors.password
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-[#e8e4df]/60 focus:ring-[#d4a574]/20 focus:border-[#d4a574]'
                  }`}
                  required
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.password}
                </p>
              )}
              {formData.password && !errors.password && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${/(?=.*[a-z])/.test(formData.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>Lowercase</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${/(?=.*[A-Z])/.test(formData.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>Uppercase</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${/(?=.*\d)/.test(formData.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>Number</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${formData.password.length >= 6 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>6+ chars</span>
                </div>
              )}
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
              <label htmlFor="role" className="block text-sm font-medium text-[#2d2a26] mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => {
                  handleInputChange('role', e.target.value as AdminRole)
                  handleInputBlur('role')
                }}
                className={`w-full px-4 py-2.5 rounded-xl text-[#2d2a26] focus:outline-none focus:ring-2 transition-all ${
                  errors.role
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-[#e8e4df]/60 focus:ring-[#d4a574]/20 focus:border-[#d4a574]'
                }`}
              >
                {roleOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errors.role && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.role}
                </p>
              )}
            </div>

            {/* Departments - Multi Select */}
            <div className="md:col-span-2">
              <label htmlFor="departments" className="block text-sm font-medium text-[#2d2a26] mb-2">
                Departments
                <span className="ml-2 text-xs font-normal text-[#8b8680]">(Select all that apply)</span>
                {formData.role === 'staff' && <span className="ml-1 text-red-500">*</span>}
              </label>
              <div
                id="departments"
                onBlur={() => handleInputBlur('departments')}
              >
                <MultiSelect
                  options={departmentOptions}
                  selected={selectedDepartments}
                  onChange={handleDepartmentsChange}
                  placeholder="Select departments..."
                  className={`w-full ${errors.departments ? 'border-red-300 ring-1 ring-red-300' : ''}`}
                />
              </div>
              {errors.departments && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.departments}
                </p>
              )}
              {selectedDepartments.length > 0 && !errors.departments && (
                <div className="mt-2 flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    This staff member will have access to: <strong>{selectedDepartments.map(d => departmentOptions.find(opt => opt.value === d)?.label || d).join(', ')}</strong>
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
                value={formData.status || ''}
                onChange={(e) => handleInputChange('status', e.target.value as AdminStatus | undefined)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 text-[#2d2a26] focus:outline-none focus:ring-2 focus:ring-[#d4a574] focus:border-transparent transition-all"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hourly Rate */}
            <div>
              <label htmlFor="hourly_rate" className="block text-sm font-medium text-[#2d2a26] mb-2">
                Hourly Rate (₱/hour)
              </label>
              <input
                id="hourly_rate"
                type="number"
                value={formData.hourly_rate || ''}
                onChange={(e) => handleInputChange('hourly_rate', e.target.value ? parseFloat(e.target.value) : undefined)}
                onBlur={() => handleInputBlur('hourly_rate')}
                placeholder="Enter hourly rate"
                min="0"
                max="9999.99"
                step="0.01"
                className={`w-full px-4 py-2.5 rounded-xl text-[#2d2a26] placeholder-[#8b8680] focus:outline-none focus:ring-2 transition-all ${
                  errors.hourly_rate
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-[#e8e4df]/60 focus:ring-[#d4a574]/20 focus:border-[#d4a574]'
                }`}
              />
              {errors.hourly_rate && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.hourly_rate}
                </p>
              )}
            </div>

            {/* Hire Date */}
            <div>
              <label htmlFor="hire_date" className="block text-sm font-medium text-[#2d2a26] mb-2">
                Hire Date
              </label>
              <input
                id="hire_date"
                type="date"
                value={formData.hire_date?.split('T')[0] || ''}
                onChange={(e) => handleInputChange('hire_date', e.target.value || undefined)}
                onBlur={() => handleInputBlur('hire_date')}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-2.5 rounded-xl text-[#2d2a26] focus:outline-none focus:ring-2 transition-all ${
                  errors.hire_date
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-[#e8e4df]/60 focus:ring-[#d4a574]/20 focus:border-[#d4a574]'
                }`}
              />
              {errors.hire_date && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.hire_date}
                </p>
              )}
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
                Creating...
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Create Staff Member
              </>
            )}
          </button>
        </div>
      </form>
    </AdminLayout>
  )
}
