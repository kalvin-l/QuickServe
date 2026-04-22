'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import CardWrapper from '@/components/admin/ui/CardWrapper'
import FormInput from '@/components/admin/forms/FormInput'
import FormSelect from '@/components/admin/forms/FormSelect'
import FormSection from '@/components/admin/forms/FormSection'
import { LoadingSpinner } from '@/components/ui/loading-spinner/LoadingSpinner'

type TableStatus = 'available' | 'full' | 'partial' | 'cleaning'

interface Table {
  id: string
  number: number
  location: string
  capacity: number
  occupied: number
  status: TableStatus
  statusText: string
  statusColor: string
  statusDot: string
  locationColor: string
  qrCode: string
  accessCode: string
}

const tablesData: Table[] = [
  {
    id: '1',
    number: 1,
    location: 'Indoor',
    capacity: 4,
    occupied: 0,
    status: 'available',
    statusText: 'Available',
    statusColor: 'border-green-500',
    statusDot: 'bg-green-500',
    locationColor: 'bg-green-100 text-green-700',
    qrCode: 'ABC123',
    accessCode: '8X7K2M'
  },
  {
    id: '2',
    number: 2,
    location: 'Indoor',
    capacity: 2,
    occupied: 2,
    status: 'full',
    statusText: 'Full',
    statusColor: 'border-red-500',
    statusDot: 'bg-red-500',
    locationColor: 'bg-green-100 text-green-700',
    qrCode: 'DEF456',
    accessCode: '3P9Q1R'
  },
  {
    id: '3',
    number: 3,
    location: 'Indoor',
    capacity: 6,
    occupied: 3,
    status: 'partial',
    statusText: 'Partial',
    statusColor: 'border-yellow-500',
    statusDot: 'bg-yellow-500',
    locationColor: 'bg-green-100 text-green-700',
    qrCode: 'GHI789',
    accessCode: '7N4B8C'
  },
  {
    id: '4',
    number: 4,
    location: 'Outdoor',
    capacity: 4,
    occupied: 0,
    status: 'available',
    statusText: 'Available',
    statusColor: 'border-green-500',
    statusDot: 'bg-green-500',
    locationColor: 'bg-blue-100 text-blue-700',
    qrCode: 'JKL012',
    accessCode: '2Y6T5W'
  },
  {
    id: '5',
    number: 5,
    location: 'Patio',
    capacity: 8,
    occupied: 0,
    status: 'available',
    statusText: 'Available',
    statusColor: 'border-green-500',
    statusDot: 'bg-green-500',
    locationColor: 'bg-purple-100 text-purple-700',
    qrCode: 'MNO345',
    accessCode: '9D1F3G'
  },
  {
    id: '6',
    number: 6,
    location: 'Patio',
    capacity: 4,
    occupied: 1,
    status: 'partial',
    statusText: 'Partial',
    statusColor: 'border-yellow-500',
    statusDot: 'bg-yellow-500',
    locationColor: 'bg-purple-100 text-purple-700',
    qrCode: 'PQR678',
    accessCode: '4S8H2J'
  },
  {
    id: '7',
    number: 7,
    location: 'Bar',
    capacity: 2,
    occupied: 0,
    status: 'available',
    statusText: 'Available',
    statusColor: 'border-green-500',
    statusDot: 'bg-green-500',
    locationColor: 'bg-amber-100 text-amber-700',
    qrCode: 'STU901',
    accessCode: '6K7L9P'
  },
  {
    id: '8',
    number: 8,
    location: 'Bar',
    capacity: 4,
    occupied: 0,
    status: 'cleaning',
    statusText: 'Cleaning',
    statusColor: 'border-blue-500',
    statusDot: 'bg-blue-500',
    locationColor: 'bg-amber-100 text-amber-700',
    qrCode: 'VWX234',
    accessCode: '1M3N5B'
  }
]

const locationOptions = [
  { value: 'Indoor', label: 'Indoor', color: 'bg-green-100 text-green-700' },
  { value: 'Outdoor', label: 'Outdoor', color: 'bg-blue-100 text-blue-700' },
  { value: 'Patio', label: 'Patio', color: 'bg-purple-100 text-purple-700' },
  { value: 'Bar', label: 'Bar', color: 'bg-amber-100 text-amber-700' }
]

const statusOptions = [
  { value: 'available', label: 'Available', color: 'text-green-600', dot: 'bg-green-500' },
  { value: 'partial', label: 'Partial', color: 'text-yellow-600', dot: 'bg-yellow-500' },
  { value: 'full', label: 'Full', color: 'text-red-600', dot: 'bg-red-500' },
  { value: 'cleaning', label: 'Cleaning', color: 'text-blue-600', dot: 'bg-blue-500' }
]

const getStatusConfig = (status: TableStatus) => {
  switch (status) {
    case 'available':
      return {
        text: 'Available',
        color: 'border-green-500',
        dot: 'bg-green-500',
        bgColor: 'bg-green-100 text-green-700'
      }
    case 'partial':
      return {
        text: 'Partial',
        color: 'border-yellow-500',
        dot: 'bg-yellow-500',
        bgColor: 'bg-yellow-100 text-yellow-700'
      }
    case 'full':
      return {
        text: 'Full',
        color: 'border-red-500',
        dot: 'bg-red-500',
        bgColor: 'bg-red-100 text-red-700'
      }
    case 'cleaning':
      return {
        text: 'Cleaning',
        color: 'border-blue-500',
        dot: 'bg-blue-500',
        bgColor: 'bg-blue-100 text-blue-700'
      }
  }
}

const getLocationColor = (location: string) => {
  switch (location) {
    case 'Indoor':
      return 'bg-green-100 text-green-700'
    case 'Outdoor':
      return 'bg-blue-100 text-blue-700'
    case 'Patio':
      return 'bg-purple-100 text-purple-700'
    case 'Bar':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const generateAccessCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

const generateQRCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function EditTablePage() {
  const params = useParams()
  const router = useRouter()
  const tableId = params.id as string

  const [table, setTable] = useState<Table | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [formData, setFormData] = useState({
    number: 0,
    location: 'Indoor',
    capacity: 0,
    occupied: 0,
    status: 'available' as TableStatus,
    qrCode: '',
    accessCode: ''
  })

  // Load table data
  useEffect(() => {
    const loadTableData = () => {
      setIsLoading(true)

      // Try to get from localStorage first
      const savedTables = localStorage.getItem('tables')
      let allTables = tablesData

      if (savedTables) {
        allTables = JSON.parse(savedTables)
      }

      const foundTable = allTables.find((t: Table) => t.id === tableId)

      if (foundTable) {
        setTable(foundTable)
        setFormData({
          number: foundTable.number,
          location: foundTable.location,
          capacity: foundTable.capacity,
          occupied: foundTable.occupied,
          status: foundTable.status,
          qrCode: foundTable.qrCode,
          accessCode: foundTable.accessCode
        })
      } else {
        alert('Table not found')
        router.push('/admin/tables')
      }

      setIsLoading(false)
    }

    if (tableId) {
      loadTableData()
    }
  }, [tableId, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.number || !formData.location) {
      alert('Please fill in all required fields.')
      return
    }

    if (formData.occupied > formData.capacity) {
      alert('Occupied seats cannot exceed capacity.')
      return
    }

    // Auto-update status based on occupancy
    let newStatus = formData.status
    if (formData.occupied === 0) {
      newStatus = 'available'
    } else if (formData.occupied >= formData.capacity) {
      newStatus = 'full'
    } else {
      newStatus = 'partial'
    }

    const updatedTable: Table = {
      id: tableId,
      number: formData.number,
      location: formData.location,
      capacity: formData.capacity,
      occupied: formData.occupied,
      status: newStatus,
      statusText: getStatusConfig(newStatus).text,
      statusColor: getStatusConfig(newStatus).color,
      statusDot: getStatusConfig(newStatus).dot,
      locationColor: getLocationColor(formData.location),
      qrCode: formData.qrCode,
      accessCode: formData.accessCode
    }

    // Save to localStorage
    const savedTables = localStorage.getItem('tables')
    let allTables = savedTables ? JSON.parse(savedTables) : tablesData

    const index = allTables.findIndex((t: Table) => t.id === tableId)
    if (index !== -1) {
      allTables[index] = updatedTable
    } else {
      allTables.push(updatedTable)
    }

    localStorage.setItem('tables', JSON.stringify(allTables))

    alert(`Table ${formData.number} has been updated successfully!`)
    router.push('/admin/tables')
  }

  const regenerateCodes = () => {
    setFormData(prev => ({
      ...prev,
      qrCode: generateQRCode(),
      accessCode: generateAccessCode()
    }))
  }

  const goBack = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <AdminLayout
        pageTitle="Loading..."
        pageSubtitle="Please wait"
      >
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner type="branded" size="xl" />
          <p className="mt-4 text-[#5c5752]">Loading table data...</p>
        </div>
      </AdminLayout>
    )
  }

  if (!table) {
    return null
  }

  const statusConfig = getStatusConfig(formData.status)
  const occupancyPercentage = formData.capacity > 0 ? (formData.occupied / formData.capacity) * 100 : 0

  return (
    <AdminLayout
      pageTitle={`Edit Table ${table.number}`}
      pageSubtitle="Modify table details and settings"
    >
      {/* Back Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4 mb-6">
        <button
          onClick={goBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
        >
          <i className="fas fa-arrow-left"></i>
          <span>Back to Tables</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Table Overview Card */}
        <CardWrapper>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-[#ec7813] to-[#d66a10] rounded-xl flex items-center justify-center text-white font-bold text-4xl shadow-lg">
              {formData.number}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">Table {formData.number}</h3>
              <p className="text-gray-500">{formData.location}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                  <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`}></span>
                  {statusConfig.text}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLocationColor(formData.location)}`}>
                  {formData.location}
                </span>
              </div>
            </div>
          </div>
        </CardWrapper>

        {/* Basic Information */}
        <CardWrapper>
          <FormSection
            title="Basic Information"
            subtitle="Table number, location, and capacity"
            icon="chair"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FormInput
              label="Table Number"
              type="number"
              placeholder="Enter table number"
              value={formData.number.toString()}
              onChange={(e) => setFormData(prev => ({ ...prev, number: parseInt(e.target.value) || 0 }))}
              required
              min={1}
            />

            <FormSelect
              label="Location"
              placeholder="Select location"
              value={formData.location}
              onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
              options={locationOptions}
              required
            />

            <FormInput
              label="Seating Capacity"
              type="number"
              placeholder="Enter capacity"
              value={formData.capacity.toString()}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
              required
              min={1}
            />
          </div>

          {/* Occupancy */}
          <div className="mt-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
            <label className="block text-sm font-semibold text-gray-900 mb-4">
              Current Occupancy
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={formData.capacity}
                  value={formData.occupied}
                  onChange={(e) => setFormData(prev => ({ ...prev, occupied: parseInt(e.target.value) || 0 }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#ec7813]"
                />
                <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
                  <span>0</span>
                  <span className="font-medium">{formData.occupied} / {formData.capacity} seats</span>
                  <span>{formData.capacity}</span>
                </div>
              </div>
              <div className="text-right min-w-[120px]">
                <p className="text-2xl font-bold text-gray-900">{Math.round(occupancyPercentage)}%</p>
                <p className="text-sm text-gray-600">Occupied</p>
              </div>
            </div>

            {/* Visual Occupancy Bar */}
            <div className="mt-4 h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-300"
                style={{ width: `${occupancyPercentage}%` }}
              />
            </div>
          </div>
        </CardWrapper>

        {/* Table Status */}
        <CardWrapper>
          <FormSection
            title="Table Status"
            subtitle="Current status and availability"
            icon="info-circle"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FormSelect
              label="Manual Status Override"
              value={formData.status}
              onChange={(value) => setFormData(prev => ({ ...prev, status: value as TableStatus }))}
              options={statusOptions}
              required
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Status Preview</label>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${statusConfig.dot}`}></span>
                  <span className="font-medium text-gray-900">{statusConfig.text}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {formData.occupied === 0 && 'Table is available for new customers'}
                  {formData.occupied > 0 && formData.occupied < formData.capacity && `${formData.occupied} of ${formData.capacity} seats occupied`}
                  {formData.occupied >= formData.capacity && 'Table is at full capacity'}
                </p>
              </div>
            </div>
          </div>
        </CardWrapper>

        {/* Access Codes */}
        <CardWrapper>
          <FormSection
            title="Access Codes"
            subtitle="QR code and access code for customer ordering"
            icon="qrcode"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FormInput
              label="QR Code"
              type="text"
              placeholder="Enter QR code"
              value={formData.qrCode}
              onChange={(e) => setFormData(prev => ({ ...prev, qrCode: e.target.value }))}
              required
              maxLength={10}
            />

            <FormInput
              label="Access Code"
              type="text"
              placeholder="Enter access code"
              value={formData.accessCode}
              onChange={(e) => setFormData(prev => ({ ...prev, accessCode: e.target.value.toUpperCase() }))}
              required
              maxLength={10}
            />
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <i className="fas fa-info-circle text-blue-600 mt-0.5"></i>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">About Access Codes</p>
                <p className="text-sm text-blue-700 mt-1">
                  Customers scan the QR code to access the ordering system. The access code serves as a backup if the QR code is not working.
                  Both codes should be unique for each table.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={regenerateCodes}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
            >
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-sync-alt"></i>
                Regenerate Codes
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, qrCode: generateQRCode() }))}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
            >
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-qrcode"></i>
                New QR Code
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, accessCode: generateAccessCode() }))}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
            >
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-key"></i>
                New Access Code
              </span>
            </button>
          </div>
        </CardWrapper>

        {/* QR Code Preview */}
        <CardWrapper>
          <FormSection
            title="QR Code Preview"
            subtitle="Preview of the table QR code for printing"
            icon="image"
          />

          <div className="flex items-center justify-center p-8 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-center">
              <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-300 mb-4">
                <div className="text-center">
                  <i className="fas fa-qrcode text-6xl text-gray-400 mb-2"></i>
                  <p className="text-xs text-gray-600">QR Code Preview</p>
                </div>
              </div>
              <p className="font-bold text-gray-900 text-lg">Table {formData.number}</p>
              <p className="text-gray-600">{formData.location}</p>
              <p className="text-sm text-gray-500 mt-1">Capacity: {formData.capacity} seats</p>
              <div className="mt-4 p-3 bg-[#ec7813] text-white rounded-lg">
                <p className="text-xs uppercase tracking-wide opacity-80">Access Code</p>
                <p className="text-2xl font-bold font-mono tracking-widest">{formData.accessCode}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => alert('Print QR code functionality')}
              className="flex-1 px-6 py-3 bg-[#ec7813] text-white rounded-lg hover:bg-[#d66a10] transition-all font-medium"
            >
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-print"></i>
                Print Table Tent
              </span>
            </button>
            <button
              type="button"
              onClick={() => alert('Download QR code functionality')}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
            >
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-download"></i>
                Download QR Code
              </span>
            </button>
          </div>
        </CardWrapper>

        {/* Footer Actions */}
        <CardWrapper>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-left">
              <p className="text-sm text-gray-600">Table:</p>
              <p className="text-lg font-bold text-gray-900">
                Table {formData.number} ({formData.location}, {formData.capacity} seats)
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={goBack}
                className="w-full sm:w-auto px-8 py-3 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-medium"
              >
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-times text-lg"></i>
                  Cancel
                </span>
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#ec7813] text-white hover:bg-[#d66a10] hover:shadow-lg transition-all font-semibold"
              >
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-save text-lg"></i>
                  Save Changes
                </span>
              </button>
            </div>
          </div>
        </CardWrapper>
      </form>
    </AdminLayout>
  )
}
