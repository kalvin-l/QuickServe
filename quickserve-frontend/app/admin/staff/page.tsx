'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import CardWrapper from '@/components/admin/ui/CardWrapper'
import { Briefcase } from 'lucide-react'
import {
  getStaffList,
  deleteStaff,
  updateStaffStatus,
} from '@/lib/staff-api'
import type { AdminUser, AdminDepartment, AdminStatus } from '@/types/admin-auth.types'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { canPerformAction } from '@/utils/staff-utils'
import { STAFF_PAGINATION } from '@/constants/staff'

// Components
import { StaffStats } from '@/components/admin/staff/StaffStats'
import { DepartmentTabs } from '@/components/admin/staff/DepartmentTabs'
import { StaffCard } from '@/components/admin/staff/StaffCard'
import { StaffDetailsModal } from '@/components/admin/staff/StaffDetailsModal'

type DepartmentFilter = 'all' | AdminDepartment

export default function StaffPage() {
  const router = useRouter()
  const { user: currentUser } = useAdminAuth()

  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedStaff, setSelectedStaff] = useState<AdminUser | null>(null)
  const [staffList, setStaffList] = useState<AdminUser[]>([])
  const [totalStaff, setTotalStaff] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Track client-side mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch staff data
  const fetchStaff = async (page = currentPage) => {
    try {
      setLoading(true)
      setError(null)

      const params: any = {
        page,
        page_size: STAFF_PAGINATION.ITEMS_PER_PAGE
      }

      if (selectedDepartment !== 'all') {
        params.department = selectedDepartment
      }

      const response = await getStaffList(params)
      setStaffList(response.items)
      setTotalStaff(response.total)
      setTotalPages(response.total_pages)
      setCurrentPage(response.page)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load staff')
      setStaffList([])
      setTotalStaff(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  // Initial load and refresh on filter change
  useEffect(() => {
    fetchStaff(1) // Reset to page 1 when filter changes
  }, [selectedDepartment])

  // Calculate stats from current data
  const stats = {
    totalStaff,
    activeStaff: staffList.filter(s => s.status === 'active').length,
    onLeave: staffList.filter(s => s.status === 'on_leave').length
  }

  const handleViewStaff = (staff: AdminUser) => {
    setSelectedStaff(staff)
  }

  const handleEditStaff = (staff: AdminUser) => {
    router.push(`/admin/staff/edit/${staff.id}`)
  }

  const handleStatusToggle = async (staff: AdminUser, newStatus: AdminStatus) => {
    try {
      setActionLoading(`status-${staff.id}`)
      await updateStaffStatus(staff.id, newStatus)
      await fetchStaff()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteStaff = async (staff: AdminUser) => {
    if (!currentUser || !canPerformAction(currentUser.role, 'delete')) {
      alert('You do not have permission to delete staff')
      return
    }

    if (confirm(`Are you sure you want to deactivate ${staff.name}?`)) {
      try {
        setActionLoading(`delete-${staff.id}`)
        await deleteStaff(staff.id)
        await fetchStaff()
        if (selectedStaff?.id === staff.id) {
          setSelectedStaff(null)
        }
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to delete staff')
      } finally {
        setActionLoading(null)
      }
    }
  }

  const canCreate = mounted && currentUser ? canPerformAction(currentUser.role, 'create') : false

  return (
    <AdminLayout
      pageTitle="Staff Management"
      pageSubtitle="Manage your team members and schedules"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Error State */}
        {error && (
          <ErrorBanner
            message={error}
            onRetry={() => fetchStaff()}
          />
        )}

        {/* Staff Overview Cards */}
        <StaffStats
          totalStaff={stats.totalStaff}
          activeStaff={stats.activeStaff}
          onLeave={stats.onLeave}
          loading={loading}
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            <CardWrapper>
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-[#d4a574]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#2d2a26] tracking-tight">Team Members</h3>
                    <p className="text-xs text-[#8b8680]">{totalStaff} staff members</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/admin/staff/create')}
                  disabled={!canCreate}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d4a574] text-white font-medium hover:bg-[#c49a6b] transition-all active:scale-[0.98] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add Staff
                </button>
              </div>

              {/* Department Filter Tabs */}
              <DepartmentTabs
                selectedDepartment={selectedDepartment}
                onSelect={(dept) => {
                  setSelectedDepartment(dept)
                  setCurrentPage(1)
                }}
                totalStaff={totalStaff}
                currentCount={staffList.length}
              />

              {/* Staff Grid */}
              {loading ? (
                <LoadingState />
              ) : staffList.length === 0 ? (
                <EmptyState
                  canCreate={canCreate}
                  onCreateStaff={() => router.push('/admin/staff/create')}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {staffList.map((staff) => (
                    <StaffCard
                      key={staff.id}
                      staff={staff}
                      onView={handleViewStaff}
                      onEdit={handleEditStaff}
                      onDelete={handleDeleteStaff}
                      onStatusToggle={handleStatusToggle}
                      actionLoading={actionLoading}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setCurrentPage(page)
                    fetchStaff(page)
                  }}
                />
              )}
            </CardWrapper>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <CardWrapper>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-[#d4a574]" />
                </div>
                <h3 className="font-semibold text-[#2d2a26] tracking-tight">Quick Actions</h3>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/admin/staff/create')}
                  disabled={!canCreate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2d2a26] text-white font-medium hover:bg-[#3d3a36] transition-all active:scale-[0.98] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add New Staff
                </button>
              </div>
            </CardWrapper>
          </div>
        </div>
      </div>

      {/* Staff Details Modal */}
      <StaffDetailsModal
        staff={selectedStaff}
        onClose={() => setSelectedStaff(null)}
        onEdit={handleEditStaff}
        onDelete={handleDeleteStaff}
      />
    </AdminLayout>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface ErrorBannerProps {
  message: string
  onRetry: () => void
}

function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-red-800">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all"
      >
        Retry
      </button>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-10 h-10 border-3 border-[#d4a574] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

interface EmptyStateProps {
  canCreate: boolean
  onCreateStaff: () => void
}

function EmptyState({ canCreate, onCreateStaff }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Briefcase className="w-12 h-12 text-[#8b8680] mx-auto mb-3" />
      <p className="text-[#8b8680]">No staff members found</p>
      {canCreate && (
        <button
          onClick={onCreateStaff}
          className="mt-4 px-4 py-2 rounded-xl bg-[#d4a574] text-white font-medium hover:bg-[#c49a6b] transition-all text-sm"
        >
          Add First Staff Member
        </button>
      )}
    </div>
  )
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[#e8e4df]/60 text-sm font-medium text-[#5c5752] hover:bg-[#faf9f7] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
        Prev
      </button>
      <div className="flex gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
              currentPage === page
                ? 'bg-[#d4a574] text-white'
                : 'bg-[#faf9f7] text-[#5c5752] hover:bg-[#f5f0eb]'
            }`}
          >
            {page}
          </button>
        ))}
      </div>
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[#e8e4df]/60 text-sm font-medium text-[#5c5752] hover:bg-[#faf9f7] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
