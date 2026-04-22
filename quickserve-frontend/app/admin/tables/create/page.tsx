'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import CardWrapper from '@/components/admin/ui/CardWrapper'
import FormInput from '@/components/admin/forms/FormInput'
import FormSelect from '@/components/admin/forms/FormSelect'
import { useCreateTable, useTables } from '@/features/tables'
import type { TableLocation } from '@/features/tables'

interface LocationOption {
  value: string
  label: string
  color: string
  dot: string
}

interface FormSection {
  id: string
  title: string
  subtitle: string
  icon: string
  isComplete: boolean
}

const defaultLocationOptions: LocationOption[] = [
  { value: 'Indoor', label: 'Indoor', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  { value: 'Outdoor', label: 'Outdoor', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { value: 'Patio', label: 'Patio', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  { value: 'Bar', label: 'Bar', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' }
]

const defaultCapacityOptions = [
  { value: '2', label: '2 People (Couple)' },
  { value: '4', label: '4 People (Family)' },
  { value: '6', label: '6 People (Group)' },
  { value: '8', label: '8 People (Large Table)' },
  { value: '10', label: '10 People (Conference)' },
  { value: '12', label: '12+ People (Event Table)' }
]

const statusOptions = [
  { value: 'available', label: 'Available', color: 'bg-green-100 text-green-700', dot: 'bg-green-500', desc: 'Ready for customers' },
  { value: 'cleaning', label: 'Cleaning', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', desc: 'Being cleaned' },
  { value: 'out_of_service', label: 'Out of Service', color: 'bg-[#f5f0eb] text-[#5c5752]', dot: 'bg-[#8b8680]', desc: 'Temporarily unavailable' }
]

export default function CreateTablePage() {
  const router = useRouter()
  const { refetch } = useTables()

  // Form state
  const [formData, setFormData] = useState({
    table_number: '',
    location: '' as TableLocation | '',
    capacity: '',
    qr_code: '',
    access_code: '',
    status: 'available' as 'available' | 'cleaning' | 'out_of_service'
  })

  const [activeSection, setActiveSection] = useState('basic')
  const [customLocation, setCustomLocation] = useState('')
  const [showCustomLocation, setShowCustomLocation] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    location: true,
    status: true
  })

  // Mutation
  const createTableMutation = useCreateTable()

  // Calculate form completion progress
  const formProgress = useMemo(() => {
    const requiredFields = ['table_number', 'location', 'capacity']
    const completedFields = requiredFields.filter(field => {
      const value = formData[field as keyof typeof formData]
      return value && String(value).trim() !== ''
    })
    return Math.round((completedFields.length / requiredFields.length) * 100)
  }, [formData])

  // Form sections for stepper
  const formSections: FormSection[] = [
    { id: 'basic', title: 'Basic Info', subtitle: 'Number & capacity', icon: 'info-circle', isComplete: !!(formData.table_number && formData.capacity) },
    { id: 'location', title: 'Location', subtitle: 'Area & setup', icon: 'map-marker-alt', isComplete: !!formData.location },
    { id: 'status', title: 'Status', subtitle: 'Initial state', icon: 'toggle-on', isComplete: true }
  ]

  // Location options with custom location support
  const locationOptions = useMemo(
    () => [
      ...defaultLocationOptions,
      ...(customLocation ? [{
        value: customLocation,
        label: customLocation.charAt(0).toUpperCase() + customLocation.slice(1),
        color: 'bg-[#f5f0eb] text-[#5c5752]',
        dot: 'bg-[#8b8680]'
      }] : []),
      { value: 'add_new', label: '+ Add Custom Location', color: 'bg-[#f5f0eb] text-[#5c5752]', dot: 'bg-[#8b8680]' }
    ],
    [customLocation]
  )

  const capacityOptions = useMemo(
    () => [
      ...defaultCapacityOptions,
      { value: 'add_custom', label: '+ Custom Capacity' }
    ],
    []
  )

  // Get location config for preview
  const getLocationConfig = (locationValue: string): LocationOption => {
    return locationOptions.find(loc => loc.value === locationValue) || {
      value: locationValue,
      label: locationValue.charAt(0).toUpperCase() + locationValue.slice(1),
      color: 'bg-[#f5f0eb] text-[#5c5752]',
      dot: 'bg-[#8b8680]'
    }
  }

  // Get status config
  const getStatusConfig = (statusValue: string) => {
    return statusOptions.find(s => s.value === statusValue) || statusOptions[0]
  }

  // Generate preview QR code
  const generateQRCode = (tableNumber: string) => {
    return `QS-TABLE-${tableNumber}`
  }

  // Handle location change
  const handleLocationChange = (value: string) => {
    if (value === 'add_new') {
      setShowCustomLocation(true)
      setFormData(prev => ({ ...prev, location: '' as TableLocation | '' }))
    } else if (value === 'add_custom') {
      setShowCustomLocation(true)
      setFormData(prev => ({ ...prev, location: '' as TableLocation | '' }))
    } else {
      setShowCustomLocation(false)
      setFormData(prev => ({ ...prev, location: value as TableLocation }))
    }
  }

  // Add custom location
  const addCustomLocation = () => {
    if (customLocation.trim()) {
      const formattedLocation = customLocation.trim()
      const firstLetter = formattedLocation.charAt(0).toUpperCase()
      const rest = formattedLocation.slice(1).toLowerCase()
      const finalLocation = `${firstLetter}${rest}` as TableLocation

      setCustomLocation(formattedLocation)
      setFormData(prev => ({ ...prev, location: finalLocation }))
      setShowCustomLocation(false)

      // Add to location options permanently
      locationOptions.push({
        value: finalLocation,
        label: formattedLocation,
        color: 'bg-[#f5f0eb] text-[#5c5752]',
        dot: 'bg-[#8b8680]'
      })
    }
  }

  const cancelCustomLocation = () => {
    setShowCustomLocation(false)
    setCustomLocation('')
    setFormData(prev => ({ ...prev, location: '' as TableLocation | '' }))
  }

  // Handle capacity change
  const handleCapacityChange = (value: string) => {
    setFormData(prev => ({ ...prev, capacity: value }))
  }

  // Handle status change
  const handleStatusChange = (value: string) => {
    setFormData(prev => ({ ...prev, status: value as 'available' | 'cleaning' | 'out_of_service' }))
  }

  // Submit form
  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.table_number || !formData.location || !formData.capacity) {
      alert('Please fill in all required fields: Table Number, Location, and Capacity')
      return
    }

    const tableNumber = parseInt(formData.table_number, 10)
    if (isNaN(tableNumber) || tableNumber <= 0) {
      alert('Please enter a valid table number (positive integer)')
      return
    }

    const capacity = parseInt(formData.capacity, 10)
    if (isNaN(capacity) || capacity <= 0 || capacity > 50) {
      alert('Please enter a valid capacity (1-50 people)')
      return
    }

    const tableData = {
      table_number: tableNumber,
      location: formData.location as TableLocation,
      capacity: capacity,
      qr_code: formData.qr_code || undefined,
      access_code: formData.access_code || undefined,
      status: formData.status as 'available' | 'cleaning' | 'out_of_service'
    }

    try {
      await createTableMutation.mutateAsync(tableData)
      router.push('/admin/tables')
    } catch (error) {
      console.error('Failed to create table:', error)
      alert(`Failed to create table: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const goBack = () => {
    router.push('/admin/tables')
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = document.getElementById(`section-${sectionId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Calculate preview
  const previewQR = formData.table_number && formData.location
    ? generateQRCode(formData.table_number)
    : null

  const previewCapacity = formData.capacity ? parseInt(formData.capacity) : 0
  const locationConfig = getLocationConfig(formData.location)
  const statusConfig = getStatusConfig(formData.status)

  // Section Header Component
  const SectionHeader = ({ id, title, subtitle, icon, isComplete }: FormSection) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${
        activeSection === id ? 'bg-[#d4a574]/10 border-[#d4a574]/30' : 'bg-[#faf9f7] hover:bg-[#f5f0eb]'
      } border border-[#e8e4df]/60`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isComplete ? 'bg-green-500 text-white' : 'bg-white text-[#d4a574] shadow-sm'
        }`}>
          <i className={`fas fa-${isComplete ? 'check' : icon} ${isComplete ? '' : 'text-lg'}`}></i>
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-[#2d2a26]">{title}</h3>
          <p className="text-sm text-[#8b8680]">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isComplete && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            <i className="fas fa-check-circle"></i>
            Complete
          </span>
        )}
        <i className={`fas fa-chevron-${expandedSections[id] ? 'up' : 'down'} text-[#8b8680] transition-transform`}></i>
      </div>
    </button>
  )

  return (
    <AdminLayout pageTitle="Add New Table" pageSubtitle="Create a new table for your restaurant">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-[#faf9f7]/95 backdrop-blur-sm border-b border-[#e8e4df]/60 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#5c5752] hover:bg-[#f5f0eb] transition-all"
            >
              <i className="fas fa-arrow-left"></i>
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-6 w-px bg-[#e8e4df] hidden sm:block"></div>
            <div>
              <h1 className="text-lg font-semibold text-[#2d2a26]">New Table</h1>
              <p className="text-sm text-[#8b8680] hidden sm:block">Complete all sections to create</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#e8e4df]/60">
              <div className="w-20 h-2 rounded-full bg-[#e8e4df] overflow-hidden">
                <div
                  className="h-full bg-[#d4a574] transition-all duration-500"
                  style={{ width: `${formProgress}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-[#5c5752]">{formProgress}%</span>
            </div>
            <button
              type="submit"
              form="table-form"
              disabled={createTableMutation.isPending}
              className="px-4 py-2 rounded-lg bg-[#d4a574] text-white hover:bg-[#c49a6b] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createTableMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i>
                  Creating...
                </span>
              ) : (
                'Create Table'
              )}
            </button>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {formSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeSection === section.id
                  ? 'bg-[#d4a574] text-white'
                  : section.isComplete
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white text-[#5c5752] border border-[#e8e4df]/60'
              }`}
            >
              <i className={`fas fa-${section.isComplete && activeSection !== section.id ? 'check' : section.icon} text-xs`}></i>
              <span className="text-sm font-medium">{section.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {createTableMutation.isError ? (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
            <div>
              <h4 className="font-semibold text-red-900">Failed to create table</h4>
              <p className="text-sm text-red-700 mt-1">
                {createTableMutation.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Form Column */}
        <div className="xl:col-span-2 space-y-6">
          <form id="table-form" onSubmit={submitForm} className="space-y-6">

            {/* Basic Information Section */}
            <div id="section-basic">
              <SectionHeader {...formSections[0]} />
              {expandedSections.basic && (
                <CardWrapper className="mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                      label="Table Number"
                      type="number"
                      placeholder="Enter table number (e.g., 9)"
                      min={1}
                      max={999}
                      value={formData.table_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, table_number: e.target.value }))}
                      required
                    />

                    <div className="space-y-2">
                      <FormSelect
                        label="Seating Capacity"
                        placeholder="Select seating capacity"
                        value={formData.capacity}
                        onChange={handleCapacityChange}
                        options={capacityOptions}
                        required
                      />
                      <p className="text-xs text-[#8b8680]">
                        Number of people that can sit at this table
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <FormInput
                      label="Custom QR Code (Optional)"
                      type="text"
                      placeholder="Leave empty to auto-generate (e.g., QS-TABLE-9)"
                      value={formData.qr_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, qr_code: e.target.value }))}
                    />
                  </div>

                  <div className="mt-6">
                    <FormInput
                      label="Custom Access Code (Optional)"
                      type="text"
                      placeholder="Leave empty to auto-generate (e.g., 8X7K2M)"
                      value={formData.access_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, access_code: e.target.value }))}
                      maxLength={6}
                    />
                  </div>
                </CardWrapper>
              )}
            </div>

            {/* Location & Setup Section */}
            <div id="section-location">
              <SectionHeader {...formSections[1]} />
              {expandedSections.location && (
                <CardWrapper className="mt-3">
                  <div className="space-y-4">
                    <FormSelect
                      label="Location Area"
                      placeholder="Select table location"
                      value={formData.location}
                      onChange={handleLocationChange}
                      options={locationOptions}
                      required
                    />

                    {showCustomLocation && (
                      <div className="p-4 bg-[#faf9f7] rounded-xl border border-[#e8e4df]/60 space-y-3">
                        <FormInput
                          type="text"
                          placeholder="Enter new location name (e.g., Rooftop, VIP, Lounge)"
                          value={customLocation}
                          onChange={(e) => setCustomLocation(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={addCustomLocation}
                            className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#c49a6b] transition-all text-sm font-medium"
                          >
                            <span className="flex items-center gap-2">
                              <i className="fas fa-plus text-sm"></i>
                              Add
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={cancelCustomLocation}
                            className="px-4 py-2 border border-[#e8e4df]/60 text-[#5c5752] rounded-lg hover:bg-[#f5f0eb] transition-all text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                        <p className="text-xs text-[#8b8680]">
                          Examples: "Rooftop", "Garden", "VIP", "Lounge"
                        </p>
                      </div>
                    )}

                    {/* Location Visual Guide */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                      {defaultLocationOptions.map((loc) => (
                        <button
                          key={loc.value}
                          type="button"
                          onClick={() => handleLocationChange(loc.value)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            formData.location === loc.value
                              ? 'border-[#d4a574] bg-[#d4a574]/5'
                              : 'border-[#e8e4df]/60 hover:bg-[#faf9f7]'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${loc.dot}`}></span>
                            <span className="text-sm font-medium text-[#2d2a26]">{loc.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardWrapper>
              )}
            </div>

            {/* Initial Status Section */}
            <div id="section-status">
              <SectionHeader {...formSections[2]} />
              {expandedSections.status && (
                <CardWrapper className="mt-3">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {statusOptions.map((status) => (
                        <label
                          key={status.value}
                          className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                            formData.status === status.value
                              ? 'border-[#d4a574] bg-[#d4a574]/5'
                              : 'border-[#e8e4df]/60 hover:bg-[#faf9f7]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value={status.value}
                            checked={formData.status === status.value}
                            onChange={() => handleStatusChange(status.value)}
                            className="hidden"
                          />
                          <div className={`w-3 h-3 rounded-full ${status.dot}`}></div>
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-[#2d2a26] block">{status.label}</span>
                            <span className="text-xs text-[#8b8680]">{status.desc}</span>
                          </div>
                          {formData.status === status.value && (
                            <i className="fas fa-check-circle text-[#d4a574]"></i>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </CardWrapper>
              )}
            </div>

            {/* Bottom Actions */}
            <CardWrapper>
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#f5f0eb] transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTableMutation.isPending}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#d4a574] text-white hover:bg-[#c49a6b] hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2">
                    {createTableMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus-circle"></i>
                        Create Table
                      </>
                    )}
                  </span>
                </button>
              </div>
            </CardWrapper>
          </form>
        </div>

        {/* Sticky Sidebar Column */}
        <div className="xl:col-span-1">
          <div className="sticky top-40 space-y-6">
            {/* Live Preview Card */}
            <CardWrapper className="overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <i className="fas fa-eye text-[#d4a574]"></i>
                <h3 className="font-semibold text-[#2d2a26]">Live Preview</h3>
              </div>

              {/* Table Preview */}
              <div className="rounded-xl overflow-hidden border border-[#e8e4df]/60 bg-white">
                {/* Table Visual */}
                <div className="aspect-square bg-gradient-to-br from-[#faf9f7] to-[#f5f0eb] relative flex items-center justify-center p-6">
                  {formData.table_number ? (
                    <div className="text-center">
                      {/* Table Shape */}
                      <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-white border-4 border-[#d4a574] shadow-lg flex items-center justify-center relative">
                        <span className="text-4xl font-bold text-[#d4a574]">{formData.table_number}</span>
                        {/* Status Indicator */}
                        <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-white ${statusConfig.dot}`}></div>
                      </div>

                      {/* Chairs Visual */}
                      {previewCapacity > 0 && (
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <i className="fas fa-chair text-[#d4a574]"></i>
                          <span className="text-sm text-[#5c5752]">{previewCapacity} seats</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto rounded-full bg-[#e8e4df]/50 flex items-center justify-center mb-3">
                        <i className="fas fa-utensils text-3xl text-[#8b8680]"></i>
                      </div>
                      <p className="text-sm text-[#8b8680]">Enter table number to preview</p>
                    </div>
                  )}
                </div>

                {/* Table Info */}
                <div className="p-4 border-t border-[#e8e4df]/60">
                  {formData.table_number && formData.location ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#8b8680]">Table</span>
                        <span className="text-lg font-bold text-[#2d2a26]">#{formData.table_number}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#8b8680]">Location</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${locationConfig.color}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${locationConfig.dot} mr-1`}></span>
                          {locationConfig.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#8b8680]">Capacity</span>
                        <span className="text-sm font-medium text-[#2d2a26]">{previewCapacity} people</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#8b8680]">Status</span>
                        <span className="text-sm font-medium" style={{ color: formData.status === 'available' ? '#22c55e' : formData.status === 'cleaning' ? '#3b82f6' : '#8b8680' }}>
                          {statusConfig.label}
                        </span>
                      </div>

                      {previewQR && (
                        <div className="pt-3 border-t border-[#e8e4df]/60">
                          <div className="flex items-center gap-2 text-xs text-[#8b8680]">
                            <i className="fas fa-qrcode"></i>
                            <span className="font-mono">{previewQR}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-[#8b8680]">Fill in table details to see preview</p>
                    </div>
                  )}
                </div>
              </div>
            </CardWrapper>

            {/* Quick Tips */}
            <CardWrapper className="bg-gradient-to-br from-[#d4a574]/5 to-transparent border-[#d4a574]/20">
              <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-lightbulb text-[#d4a574]"></i>
                <h3 className="font-semibold text-[#2d2a26]">Quick Tips</h3>
              </div>
              <ul className="space-y-2 text-sm text-[#5c5752]">
                <li className="flex items-start gap-2">
                  <i className="fas fa-check-circle text-green-500 mt-0.5 text-xs"></i>
                  <span>Use unique table numbers for easy identification</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check-circle text-green-500 mt-0.5 text-xs"></i>
                  <span>Set accurate capacity for better seating management</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check-circle text-green-500 mt-0.5 text-xs"></i>
                  <span>QR codes are auto-generated but can be customized</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check-circle text-green-500 mt-0.5 text-xs"></i>
                  <span>Use locations to organize tables by area</span>
                </li>
              </ul>
            </CardWrapper>

            {/* Section Navigation */}
            <CardWrapper>
              <h3 className="font-semibold text-[#2d2a26] mb-4">Form Sections</h3>
              <div className="space-y-2">
                {formSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                      activeSection === section.id
                        ? 'bg-[#d4a574]/10 text-[#d4a574]'
                        : 'hover:bg-[#faf9f7] text-[#5c5752]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      section.isComplete
                        ? 'bg-green-500 text-white'
                        : activeSection === section.id
                        ? 'bg-[#d4a574] text-white'
                        : 'bg-[#f5f0eb]'
                    }`}>
                      <i className={`fas fa-${section.isComplete ? 'check' : section.icon} text-sm`}></i>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{section.title}</p>
                      <p className="text-xs opacity-75">{section.subtitle}</p>
                    </div>
                    {section.isComplete && <i className="fas fa-check-circle text-green-500 text-sm"></i>}
                  </button>
                ))}
              </div>
            </CardWrapper>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
