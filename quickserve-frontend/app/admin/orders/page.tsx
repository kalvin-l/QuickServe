'use client'

import React, { useEffect, useCallback } from 'react'
import { Eye, DollarSign, Check, Flame, Bell, Cone } from 'lucide-react'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import TableActionsDropdown, { type Action } from '@/components/admin/ui/TableActionsDropdown'
import Pagination, { PageSizeSelector } from '@/components/admin/ui/Pagination'
import { useOrders } from '@/lib/api/queries/useOrders'
import type { Order, OrderStatus } from '@/types/order.types'
import { formatTimeAgo } from '@/lib/utils'

// Components
import OrdersStatsCard from './components/OrdersStatsCard'
import OrdersTabs from './components/OrdersTabs'
import OrdersStatusFilter from './components/OrdersStatusFilter'
import OrdersTable from './components/OrdersTable'
import OrdersHeaderActions from './components/OrdersHeaderActions'
import OrderDetailsModal from './components/OrderDetailsModal'

// Constants
import { tabs } from './constants/tabs'
import { STATUS_MAP } from './constants/statusMaps'

// Hooks
import { useOrderFilters } from './hooks/useOrderFilters'
import { useOrderPagination } from './hooks/useOrderPagination'
import { useOrderFiltersAndSort } from './hooks/useOrderFiltersAndSort'
import { useOrderActions } from './hooks/useOrderActions'

/**
 * Orders Management Page
 * Displays and manages all customer orders with filtering, search, and pagination
 */
export default function OrdersPage() {
  // Filter state
  const {
    activeTab,
    activeStatus,
    searchQuery,
    handleTabChange,
    handleStatusChange,
    handleSearchChange,
  } = useOrderFilters()

  // Pagination state
  const {
    currentPage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    resetPage,
  } = useOrderPagination()

  // Action handlers
  const {
    handleUpdateStatus,
    handleConfirmPayment,
    openOrderDetails,
    closeOrderDetails,
    selectedOrder,
    showOrderModal,
  } = useOrderActions()

  // Determine if we should use server-side pagination or client-side filtering
  const useServerPagination = activeTab === 'all' && activeStatus === 'all' && !searchQuery.trim()

  // Fetch orders from API
  const { data: ordersData, isLoading, refetch } = useOrders({
    page: useServerPagination ? currentPage : 1,
    page_size: useServerPagination ? pageSize : 100,
  })

  // Get filtered orders and stats
  const orders = ordersData?.items || []
  const { filteredOrders, stats } = useOrderFiltersAndSort({
    orders,
    activeTab,
    activeStatus,
    searchQuery,
  })

  // Combine filter handlers with page reset
  const handleTabChangeWithReset = useCallback((tab: string) => {
    handleTabChange(tab)
    resetPage()
  }, [handleTabChange, resetPage])

  const handleStatusChangeWithReset = useCallback((status: string) => {
    handleStatusChange(status)
    resetPage()
  }, [handleStatusChange, resetPage])

  const handleSearchChangeWithReset = useCallback((query: string) => {
    handleSearchChange(query)
    resetPage()
  }, [handleSearchChange, resetPage])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 10000)
    return () => clearInterval(interval)
  }, [refetch])

  // Get order actions for table dropdown
  const getOrderActions = useCallback((order: Order): Action[] => {
    return [
      {
        key: 'view',
        label: 'View Details',
        icon: Eye,
        onClick: () => openOrderDetails(order)
      },
      {
        key: 'pay',
        label: 'Confirm Payment',
        icon: DollarSign,
        colorClass: 'text-[#22c55e] hover:bg-[#f0fdf4]',
        show: () => order.payment?.status === 'pending' && order.payment?.method === 'cash',
        onClick: () => order.payment && handleConfirmPayment(order.payment.id)
      },
      {
        key: 'confirm',
        label: 'Confirm Order',
        icon: Check,
        colorClass: 'text-[#3b82f6] hover:bg-[#eff6ff]',
        show: () => order.status === 'pending' && order.payment?.status === 'completed',
        onClick: () => handleUpdateStatus(order.id, 'confirmed')
      },
      {
        key: 'prepare',
        label: 'Start Preparing',
        icon: Flame,
        colorClass: 'text-[#f59e0b] hover:bg-[#fef3c7]',
        show: () => order.status === 'confirmed',
        onClick: () => handleUpdateStatus(order.id, 'preparing')
      },
      {
        key: 'ready',
        label: 'Mark Ready',
        icon: Bell,
        colorClass: 'text-[#a855f7] hover:bg-[#f3e8ff]',
        show: () => order.status === 'preparing',
        onClick: () => handleUpdateStatus(order.id, 'ready')
      },
      {
        key: 'serve',
        label: 'Serve',
        icon: Cone,
        colorClass: 'text-[#22c55e] hover:bg-[#f0fdf4]',
        show: () => order.status === 'ready',
        onClick: () => handleUpdateStatus(order.id, 'served')
      }
    ]
  }, [openOrderDetails, handleConfirmPayment, handleUpdateStatus])

  return (
    <AdminLayout
      title="Order Management"
      pageTitle="Order Management"
      pageSubtitle="Manage and track all customer orders across all tables"
    >
      {/* Header Actions */}
      <OrdersHeaderActions
        searchQuery={searchQuery}
        onSearchChange={handleSearchChangeWithReset}
        onRefresh={refetch}
      />

      {/* Stats */}
      <OrdersStatsCard
        pending={stats.pending}
        kitchen={stats.kitchen}
        ready={stats.ready}
        served={stats.served}
      />

      {/* Tabs */}
      <OrdersTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChangeWithReset}
      />

      {/* Status Filter */}
      <OrdersStatusFilter
        activeStatus={activeStatus}
        onStatusChange={handleStatusChangeWithReset}
      />

      {/* Table */}
      <OrdersTable
        orders={filteredOrders}
        isLoading={isLoading}
        getOrderActions={getOrderActions}
        formatTimeAgo={formatTimeAgo}
      />

      {/* Pagination */}
      {useServerPagination && !isLoading && filteredOrders.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <PageSizeSelector
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={ordersData?.pages || 1}
            hasNext={currentPage < (ordersData?.pages || 1)}
            hasPrev={currentPage > 1}
            onPageChange={handlePageChange}
            pageSize={pageSize}
            total={ordersData?.total}
            showInfo={true}
          />
        </div>
      )}

      {/* Filtered results info */}
      {!useServerPagination && !isLoading && filteredOrders.length > 0 && (
        <div className="mt-4 text-center text-sm text-[#5c5752]">
          Showing {filteredOrders.length} of {ordersData?.total || 0} orders
          {searchQuery && ` for "${searchQuery}"`}
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={showOrderModal}
        onClose={closeOrderDetails}
        onConfirmPayment={handleConfirmPayment}
        onUpdateStatus={handleUpdateStatus}
        formatTimeAgo={formatTimeAgo}
      />
    </AdminLayout>
  )
}
