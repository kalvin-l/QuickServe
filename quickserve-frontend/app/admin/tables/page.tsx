'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  AlertCircle, Search, Plus, Coffee, Users, Armchair,
  LayoutGrid, List, QrCode, Edit, Trash2, Eye, LogOut,
  RefreshCw, Info, Users as UsersIcon, Crown, User,
  Smartphone, Sparkles, MapPin, Calendar, Clock,
  ChevronRight, Download, Printer, RotateCcw
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner/LoadingSpinner'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import CardWrapper from '@/components/admin/ui/CardWrapper'

import AdminModal from '@/components/admin/ui/AdminModal'
import Pagination, { PageSizeSelector } from '@/components/admin/ui/Pagination'
import { formatTime } from '@/lib/utils'
import {
  useTables,
  useTableStats,
  useDeleteTable,
  useDownloadQR,
  useDownloadPrintTemplate,
  useRegenerateQR,
} from '@/features/tables'
import type { Table, TableLocation } from '@/features/tables'
import {
  useActiveSessions,
  useCapacitySummary,
  useEndSession,
  useSessionParticipants,
  formatSessionDuration,
  formatLastActivity,
} from '@/features/sessions'
import { type TableSession } from '@/lib/sessionApi'

export default function TablesPage() {
  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [activeLocationFilter, setActiveLocationFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState('table_number')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedTableId, setSelectedTableId] = useState('')
  const [qrSize, setQrSize] = useState(400)
  const [qrPreviewDataUrl, setQrPreviewDataUrl] = useState('')
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState<TableSession | null>(null)

  // API calls
  const { data, isLoading, error, refetch } = useTables({
    location: activeLocationFilter !== 'all' ? (activeLocationFilter as TableLocation) : undefined,
    page,
    page_size: pageSize,
    sort_by: sortBy,
    order,
  })

  const { data: stats } = useTableStats()

  // Sessions API
  const { data: activeSessions, isLoading: sessionsLoading, refetch: refetchSessions } = useActiveSessions()
  const { data: capacitySummary } = useCapacitySummary()
  const endSessionMutation = useEndSession()

  // Get participants for selected session
  const { data: participants, isLoading: participantsLoading } = useSessionParticipants(selectedSession?.id || null)

  // Mutations
  const deleteTableMutation = useDeleteTable()
  const downloadQRMutation = useDownloadQR()
  const downloadPrintTemplateMutation = useDownloadPrintTemplate()
  const regenerateQRMutation = useRegenerateQR()

  const tables = data?.items ?? []
  const totalPages = data?.total_pages ?? 1
  const hasNext = data?.has_next ?? false
  const hasPrev = data?.has_prev ?? false

  // Get selected table
  const selectedTable = tables.find(t => t.id.toString() === selectedTableId) || null

  // Filter tables client-side for search
  const filteredTables = useMemo(() => {
    let filtered = tables

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(table =>
        table.table_number.toString().includes(search) ||
        table.location.toLowerCase().includes(search) ||
        table.status.toLowerCase().includes(search) ||
        table.qr_code.toLowerCase().includes(search) ||
        table.access_code.toLowerCase().includes(search)
      )
    }

    return filtered
  }, [tables, searchTerm])

  // Update selected table when data changes
  useEffect(() => {
    if (!selectedTableId && tables.length > 0) {
      setSelectedTableId(tables[0].id.toString())
    }
  }, [tables, selectedTableId])

  const qrSizeOptions = [
    { label: 'Small (200px)', value: 200 },
    { label: 'Medium (400px)', value: 400 },
    { label: 'Large (600px)', value: 600 },
    { label: 'XL (800px)', value: 800 }
  ]

  // Stats
  const tableStats = stats?.by_status ?? { available: 0, partial: 0, full: 0, cleaning: 0, out_of_service: 0 }
  const locationCounts = stats?.by_location ?? { Indoor: 0, Outdoor: 0, Patio: 0, Bar: 0 }
  const totalCounts = stats?.total ?? 0

  // Helper functions for styling
  const getTableLocationDotColor = (location: string): string => {
    const colors: Record<string, string> = {
      'Indoor': 'bg-blue-500',
      'Outdoor': 'bg-green-500',
      'Patio': 'bg-[#d4a574]',
      'Bar': 'bg-purple-500',
    }
    return colors[location] || 'bg-gray-500'
  }

  const getTableStatusColor = (status: string): { bg: string; border: string; dot: string; text: string; label: string } => {
    const colors: Record<string, { bg: string; border: string; dot: string; text: string; label: string }> = {
      'available': {
        bg: 'bg-green-50',
        border: 'border-green-200',
        dot: 'bg-green-500',
        text: 'text-green-700',
        label: 'Available'
      },
      'partial': {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        text: 'text-amber-700',
        label: 'Partial'
      },
      'full': {
        bg: 'bg-red-50',
        border: 'border-red-200',
        dot: 'bg-red-500',
        text: 'text-red-700',
        label: 'Full'
      },
      'cleaning': {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
        text: 'text-blue-700',
        label: 'Cleaning'
      },
      'out_of_service': {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        dot: 'bg-gray-500',
        text: 'text-gray-700',
        label: 'Out of Service'
      },
    }
    return colors[status] || colors['out_of_service']
  }

  // QR Code functions
  const generateQRCodePreview = async () => {
    if (!selectedTable) return

    setIsGeneratingQr(true)

    try {
      let size: 'small' | 'medium' | 'large' = 'medium'
      if (qrSize >= 700) size = 'large'
      else if (qrSize <= 300) size = 'small'

      const blob = await downloadQRMutation.mutateAsync({
        tableId: selectedTable.id,
        size,
        format: 'png',
      })

      const reader = new FileReader()
      reader.onloadend = () => {
        setQrPreviewDataUrl(reader.result as string)
        setIsGeneratingQr(false)
      }
      reader.readAsDataURL(blob)
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      alert('Failed to generate QR code. Please try again.')
      setIsGeneratingQr(false)
    }
  }

  const downloadQR = async () => {
    if (!selectedTable) {
      alert('Select a table first.')
      return
    }

    try {
      let size: 'small' | 'medium' | 'large' = 'medium'
      if (qrSize >= 700) size = 'large'
      else if (qrSize <= 300) size = 'small'

      const blob = await downloadQRMutation.mutateAsync({
        tableId: selectedTable.id,
        size,
        format: 'png',
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `table-${selectedTable.table_number}-qr-${size}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download QR code:', error)
      alert('Failed to download QR code. Please try again.')
    }
  }

  const printTableTent = async () => {
    if (!selectedTable) {
      alert('Select a table first.')
      return
    }

    try {
      const blob = await downloadPrintTemplateMutation.mutateAsync(selectedTable.id)

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `table-${selectedTable.table_number}-print-template.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download print template:', error)
      alert('Failed to download print template. Please try again.')
    }
  }

  // Table actions
  const selectTableForQR = (table: Table) => {
    setSelectedTableId(table.id.toString())
    setQrPreviewDataUrl('')
  }

  const editTable = (table: Table) => {
    alert(`Edit table ${table.table_number} - TODO: Implement edit modal`)
  }

  const endSession = async (tableId: number) => {
    if (confirm('Are you sure you want to end this session?')) {
      try {
        await endSessionMutation.mutateAsync({ tableId })
      } catch (error) {
        alert('Failed to end session')
      }
    }
  }

  const openSessionDetails = (sessionId: string) => {
    const session = activeSessions?.find(s => s.session_id === sessionId)
    if (session) {
      setSelectedSession(session)
      setShowSessionModal(true)
    }
  }

  const closeSessionModal = () => {
    setShowSessionModal(false)
    setSelectedSession(null)
  }

  // Auto-generate QR when table or size changes
  useEffect(() => {
    if (selectedTable) {
      generateQRCodePreview()
    }
  }, [selectedTableId, qrSize])

  // Loading state
  if (isLoading) {
    return (
      <AdminLayout
        title="Tables & QR Codes"
        pageTitle="Tables & QR Codes"
        pageSubtitle="Manage seating and generate QR codes"
      >
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner type="branded" size="xl" />
          <p className="mt-4 text-[#8b8680]">Loading tables...</p>
        </div>
      </AdminLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <AdminLayout
        title="Tables & QR Codes"
        pageTitle="Tables & QR Codes"
        pageSubtitle="Manage seating and generate QR codes"
      >
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-[#2d2a26] font-semibold mb-2">Failed to load tables</p>
            <p className="text-[#8b8680] mb-4">{error.message}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl bg-[#2d2a26] text-white font-medium hover:bg-[#3d3a36] transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title="Tables & QR Codes"
      pageTitle="Tables & QR Codes"
      pageSubtitle="Manage seating and generate QR codes"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PageSizeSelector pageSize={pageSize} onPageSizeChange={setPageSize} />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <input
                type="search"
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full sm:w-64 rounded-xl border border-[#e8e4df]/60 bg-white text-[#2d2a26] placeholder:text-[#8b8680] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 text-sm transition-all"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8680]" />
            </div>
            <button
              onClick={() => alert('Add new table - TODO: Implement create modal')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4a574] text-white font-medium hover:bg-[#c49a6b] transition-all active:scale-[0.98] whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Table</span>
            </button>
          </div>
        </div>

        {/* Table Status Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Available', value: tableStats.available, icon: Coffee, color: 'green', desc: 'Ready' },
            { label: 'Partial', value: tableStats.partial, icon: Users, color: 'amber', desc: 'Some seats' },
            { label: 'Full', value: tableStats.full, icon: Users, color: 'red', desc: 'Occupied' },
            { label: 'Cleaning', value: tableStats.cleaning, icon: Sparkles, color: 'blue', desc: 'In progress' },
            { label: 'Out of Service', value: tableStats.out_of_service, icon: AlertCircle, color: 'gray', desc: 'Maintenance' },
          ].map((stat) => (
            <CardWrapper key={stat.label} className="!p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#8b8680] uppercase tracking-wider">{stat.label}</p>
                  <p className="text-xl font-bold text-[#2d2a26] mt-0.5">{stat.value}</p>
                  <p className="text-xs text-[#8b8680]">{stat.desc}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  stat.color === 'green' ? 'bg-green-100' :
                  stat.color === 'amber' ? 'bg-amber-100' :
                  stat.color === 'red' ? 'bg-red-100' :
                  stat.color === 'blue' ? 'bg-blue-100' :
                  'bg-gray-100'
                }`}>
                  <stat.icon className={`w-4 h-4 ${
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'amber' ? 'text-amber-600' :
                    stat.color === 'red' ? 'text-red-600' :
                    stat.color === 'blue' ? 'text-blue-600' :
                    'text-gray-600'
                  }`} />
                </div>
              </div>
            </CardWrapper>
          ))}
        </div>

        {/* Location Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { id: 'all', label: 'All', count: totalCounts },
            { id: 'Indoor', label: 'Indoor', count: locationCounts.Indoor, dot: 'bg-blue-500' },
            { id: 'Outdoor', label: 'Outdoor', count: locationCounts.Outdoor, dot: 'bg-green-500' },
            { id: 'Patio', label: 'Patio', count: locationCounts.Patio, dot: 'bg-[#d4a574]' },
            { id: 'Bar', label: 'Bar', count: locationCounts.Bar, dot: 'bg-purple-500' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveLocationFilter(tab.id); setPage(1) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap font-medium text-sm transition-all ${
                activeLocationFilter === tab.id
                  ? 'bg-[#d4a574] text-white'
                  : 'bg-white border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#faf9f7]'
              }`}
            >
              {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}`} />}
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeLocationFilter === tab.id ? 'bg-white/20' : 'bg-[#faf9f7] text-[#8b8680]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Tables Grid */}
          <div className="xl:col-span-3 space-y-6">
            {/* Tables View */}
            <CardWrapper>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                    <Armchair className="w-4 h-4 text-[#d4a574]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#2d2a26] tracking-tight">Tables</h3>
                    <p className="text-xs text-[#8b8680]">{filteredTables.length} tables</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPage(1) }}
                    className="px-3 py-1.5 rounded-lg border border-[#e8e4df]/60 bg-white text-sm text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all"
                  >
                    <option value="table_number">Table #</option>
                    <option value="capacity">Capacity</option>
                    <option value="location">Location</option>
                    <option value="status">Status</option>
                  </select>
                  <div className="flex items-center border border-[#e8e4df]/60 rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-[#d4a574] text-white' : 'text-[#8b8680] hover:bg-[#faf9f7]'}`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-[#d4a574] text-white' : 'text-[#8b8680] hover:bg-[#faf9f7]'}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Empty State */}
              {filteredTables.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center mx-auto mb-4">
                    <Armchair className="w-8 h-8 text-[#d4a574]/40" />
                  </div>
                  <h3 className="font-semibold text-[#2d2a26] mb-1">No tables found</h3>
                  <p className="text-sm text-[#8b8680] mb-4">
                    {searchTerm ? `No tables match "${searchTerm}"` : `No tables in this location`}
                  </p>
                  <button
                    onClick={() => { setSearchTerm(''); setActiveLocationFilter('all'); setPage(1) }}
                    className="px-4 py-2 rounded-xl bg-[#d4a574] text-white hover:bg-[#c49a6b] transition-all font-medium text-sm"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Table Cards */}
                  {filteredTables.map((table) => {
                    const statusColors = getTableStatusColor(table.status)
                    return (
                      <div
                        key={table.id}
                        onClick={() => selectTableForQR(table)}
                        className={`relative rounded-xl p-4 border-2 cursor-pointer transition-all hover:shadow-md ${
                          selectedTableId === table.id.toString()
                            ? 'border-[#d4a574] bg-[#faf9f7]'
                            : `border-transparent ${statusColors.bg}`
                        }`}
                      >
                        {/* Offset shadow */}
                        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />

                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-[#2d2a26]">#{table.table_number}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors.border} ${statusColors.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`} />
                              {statusColors.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); editTable(table) }}
                              className="p-1.5 rounded-lg hover:bg-white/50 text-[#8b8680] hover:text-[#d4a574] transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`Delete table ${table.table_number}?`)) {
                                  deleteTableMutation.mutate({ id: table.id })
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-white/50 text-[#8b8680] hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-3.5 h-3.5 text-[#8b8680]" />
                            <span className="text-[#2d2a26]">{table.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-3.5 h-3.5 text-[#8b8680]" />
                            <span className="text-[#2d2a26]">{table.occupied}/{table.capacity} seats</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-[#e8e4df]/40 mt-2">
                            <span className="text-xs text-[#8b8680] font-mono">{table.access_code}</span>
                            <QrCode className="w-4 h-4 text-[#d4a574]" />
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Add New Table Card */}
                  <button
                    onClick={() => alert('Add new table - TODO: Implement create modal')}
                    className="relative rounded-xl p-4 border-2 border-dashed border-[#e8e4df] hover:border-[#d4a574] hover:bg-[#faf9f7] transition-all min-h-[140px] flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center group-hover:bg-[#d4a574]/10 group-hover:border-[#d4a574]/30 transition-all">
                      <Plus className="w-5 h-5 text-[#8b8680] group-hover:text-[#d4a574]" />
                    </div>
                    <span className="font-medium text-[#5c5752] group-hover:text-[#2d2a26] text-sm">Add Table</span>
                  </button>
                </div>
              )}
            </CardWrapper>

            {/* Pagination */}
            <div className="flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                hasNext={hasNext}
                hasPrev={hasPrev}
                onPageChange={setPage}
                pageSize={pageSize}
                total={data?.total}
              />
            </div>

            {/* Active Sessions */}
            <CardWrapper noPadding>
              <div className="p-4 border-b border-[#e8e4df]/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-[#d4a574]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#2d2a26] tracking-tight">Active Sessions</h3>
                      <p className="text-xs text-[#8b8680]">
                        {activeSessions?.length || 0} active customer sessions
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => refetchSessions()}
                    className="p-2 rounded-lg hover:bg-[#faf9f7] text-[#8b8680] transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${sessionsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {sessionsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <LoadingSpinner type="branded" size="lg" />
                </div>
              ) : activeSessions && activeSessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#e8e4df]/60 bg-[#faf9f7]">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Table</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Session</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Duration</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8e4df]/40">
                      {activeSessions.map((session) => {
                        const table = tables.find(t => t.id === session.table_id)
                        if (!table) return null

                        return (
                          <tr key={session.session_id} className="hover:bg-[#faf9f7]/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#2d2a26]">#{table.table_number}</span>
                                <span className="text-xs text-[#8b8680]">{table.location}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-sm text-[#2d2a26] font-medium">{session.session_id.slice(0, 8)}...</p>
                                <p className="text-xs text-[#8b8680]">{session.customer_count} customers</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                session.status === 'active'
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : 'bg-gray-50 text-gray-700 border border-gray-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${session.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                {session.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 text-[#8b8680]">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="text-sm">{formatSessionDuration(session.started_at)}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openSessionDetails(session.session_id)}
                                  className="p-1.5 rounded-lg hover:bg-[#faf9f7] text-[#8b8680] hover:text-[#2d2a26] transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => endSession(session.table_id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-[#8b8680] hover:text-red-500 transition-colors"
                                >
                                  <LogOut className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center mb-3">
                    <UsersIcon className="w-6 h-6 text-[#d4a574]/40" />
                  </div>
                  <h4 className="font-semibold text-[#2d2a26] mb-1">No Active Sessions</h4>
                  <p className="text-sm text-[#8b8680] text-center max-w-sm">
                    Sessions appear when customers scan QR codes
                  </p>
                </div>
              )}
            </CardWrapper>
          </div>

          {/* QR Code Sidebar */}
          <div className="xl:col-span-1">
            <CardWrapper className="sticky top-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-[#d4a574]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2d2a26] tracking-tight">QR Generator</h3>
                  <p className="text-xs text-[#8b8680]">Download or print codes</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Table Select */}
                <div>
                  <label className="block text-xs font-semibold text-[#2d2a26] uppercase tracking-wider mb-2">
                    Select Table
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-white text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 text-sm transition-all"
                  >
                    {tables.map((table) => (
                      <option key={table.id} value={table.id.toString()}>
                        Table {table.table_number} — {table.location}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size Select */}
                <div>
                  <label className="block text-xs font-semibold text-[#2d2a26] uppercase tracking-wider mb-2">
                    Size
                  </label>
                  <select
                    value={qrSize}
                    onChange={(e) => setQrSize(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-white text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 text-sm transition-all"
                  >
                    {qrSizeOptions.map((size) => (
                      <option key={size.value} value={size.value}>{size.label}</option>
                    ))}
                  </select>
                </div>

                {/* QR Preview */}
                <div className="bg-[#faf9f7] rounded-xl p-4 border border-[#e8e4df]/60">
                  <div className="aspect-square max-w-[200px] mx-auto bg-white rounded-xl border border-[#e8e4df]/60 flex items-center justify-center overflow-hidden">
                    {isGeneratingQr ? (
                      <LoadingSpinner type="branded" size="md" />
                    ) : qrPreviewDataUrl ? (
                      <img
                        src={qrPreviewDataUrl}
                        alt={`Table ${selectedTable?.table_number} QR`}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <QrCode className="w-12 h-12 text-[#d4a574]/30" />
                    )}
                  </div>
                  {selectedTable && (
                    <div className="text-center mt-3">
                      <p className="font-semibold text-[#2d2a26] text-sm">Table {selectedTable.table_number}</p>
                      <p className="text-xs text-[#8b8680]">Code: {selectedTable.access_code}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={downloadQR}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2d2a26] text-white font-medium hover:bg-[#3d3a36] transition-all active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    Download PNG
                  </button>
                  <button
                    onClick={printTableTent}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 text-[#5c5752] font-medium hover:bg-[#f5f0eb] transition-all active:scale-[0.98]"
                  >
                    <Printer className="w-4 h-4" />
                    Print Tent Card
                  </button>
                  <button
                    onClick={async () => {
                      if (!selectedTable) {
                        alert('Select a table first.')
                        return
                      }

                      if (!confirm('Are you sure you want to regenerate the QR code? This will invalidate the existing QR code and access code. Customers will need to scan the new QR code.')) {
                        return
                      }

                      try {
                        await regenerateQRMutation.mutateAsync(selectedTable.id)
                        // Refetch tables to get updated access_code
                        refetch()
                        // Regenerate the QR preview with the new code
                        await generateQRCodePreview()
                        alert('QR code regenerated successfully! Please download the new QR code.')
                      } catch (error) {
                        console.error('Failed to regenerate QR code:', error)
                        alert('Failed to regenerate QR code. Please try again.')
                      }
                    }}
                    disabled={regenerateQRMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[#d4a574] font-medium hover:bg-[#faf9f7] transition-all disabled:opacity-50"
                  >
                    <RotateCcw className={`w-4 h-4 ${regenerateQRMutation.isPending ? 'animate-spin' : ''}`} />
                    {regenerateQRMutation.isPending ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </div>
              </div>
            </CardWrapper>
          </div>
        </div>
      </div>

      {/* Session Details Modal */}
      <AdminModal
        show={showSessionModal}
        title={`Session Details`}
        onClose={closeSessionModal}
        maxWidth="2xl"
      >
        {selectedSession && (() => {
          const table = tables.find(t => t.id === selectedSession.table_id)
          return (
            <div className="space-y-4">
              {/* Session Info Card */}
              <CardWrapper>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#8b8680] uppercase tracking-wider mb-1">Table</p>
                    <p className="font-semibold text-[#2d2a26]">#{table?.table_number} {table?.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8b8680] uppercase tracking-wider mb-1">Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      selectedSession.status === 'active'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedSession.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {selectedSession.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-[#8b8680] uppercase tracking-wider mb-1">Duration</p>
                    <p className="text-sm text-[#2d2a26]">{formatSessionDuration(selectedSession.started_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8b8680] uppercase tracking-wider mb-1">Customers</p>
                    <p className="text-sm text-[#2d2a26]">{selectedSession.customer_count}</p>
                  </div>
                </div>
              </CardWrapper>

              {/* Participants */}
              <CardWrapper>
                <h4 className="font-semibold text-[#2d2a26] mb-3 flex items-center gap-2">
                  <UsersIcon className="w-4 h-4 text-[#d4a574]" />
                  Participants ({participants?.length || 0})
                </h4>

                {participantsLoading ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner type="branded" size="sm" />
                  </div>
                ) : participants && participants.length > 0 ? (
                  <div className="space-y-2">
                    {participants.map((participant) => (
                      <div
                        key={participant.participant_id}
                        className="flex items-center justify-between p-3 bg-[#faf9f7] rounded-xl border border-[#e8e4df]/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            participant.role === 'host' || participant.role === 'HOST'
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {(participant.role === 'host' || participant.role === 'HOST') ? <Crown className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-[#2d2a26] text-sm">
                              {participant.device_name || 'Device'}
                            </p>
                            <p className="text-xs text-[#8b8680]">
                              {(participant.role === 'host' || participant.role === 'HOST') ? 'Host' : 'Guest'} • {participant.customer_count} customers
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-[#8b8680]">
                          {formatTime(participant.joined_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#8b8680] text-center py-4">No participants</p>
                )}
              </CardWrapper>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeSessionModal}
                  className="px-4 py-2 rounded-xl border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#faf9f7] transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => { endSession(selectedSession.table_id); closeSessionModal() }}
                  className="px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all font-medium"
                >
                  End Session
                </button>
              </div>
            </div>
          )
        })()}
      </AdminModal>
    </AdminLayout>
  )
}
