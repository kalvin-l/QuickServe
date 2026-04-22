/**
 * Inventory Management Page
 * Main page for managing inventory with stock tracking
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import { List, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { useInventoryManagement } from './hooks/useInventoryManagement'
import { useInventoryCategories, useLowStockAlert } from '@/lib/api/queries/useInventory'
import {
  InventoryFilters,
  InventoryStats,
  InventoryTable,
  StockAdjustModal,
  RestockModal,
  ViewDetailsModal,
} from './components'
import { LoadingSpinner } from '@/components/ui/loading-spinner/LoadingSpinner'
import { InlineError } from '@/components/error'
import type { InventoryItem, StockAdjustment } from '@/types/inventory'
import { ADMIN_QUERY_OPTIONS } from '@/lib/api/queries'

// Tab definitions
const TABS = [
  { id: 'all', label: 'All Items', icon: List },
  { id: 'in_stock', label: 'In Stock', icon: CheckCircle },
  { id: 'low_stock', label: 'Low Stock', icon: AlertTriangle },
  { id: 'out_of_stock', label: 'Out of Stock', icon: XCircle },
] as const

type TabId = typeof TABS[number]['id']

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabId>('all')

  // Get low stock count for badge
  const { lowStockCount } = useLowStockAlert()
  const { data: categories = [] } = useInventoryCategories()

  // Add "All Categories" option
  const categoryOptions = useMemo(() => [
    { value: '', label: 'All Categories' },
    ...categories,
  ], [categories])

  const {
    items,
    stats,
    selectedItem,
    filters,
    pagination,
    viewMode,
    isLoading,
    error,
    showAdjustModal,
    showRestockModal,
    showViewDetailsModal,
    canGoToNextPage,
    canGoToPreviousPage,
    itemsPerPage,
    containerItemsCount,
    updateFilters,
    clearFilters,
    nextPage,
    previousPage,
    goToPage,
    openAdjustModal,
    openRestockModal,
    openViewDetailsModal,
    closeModals,
    handleAdjustStock,
    handleRestockItem,
    refetch,
  } = useInventoryManagement()

  // Sync tabs with stock status filter
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId)
    if (tabId === 'all') {
      updateFilters({ stockStatus: 'all' })
    } else {
      updateFilters({ stockStatus: tabId })
    }
  }

  // Update active tab when filter changes externally
  if (filters.stockStatus !== 'all' && activeTab === 'all') {
    setActiveTab(filters.stockStatus as TabId)
  } else if (filters.stockStatus === 'all' && activeTab !== 'all') {
    setActiveTab('all')
  }

  // Check if filters are active
  const hasActiveFilters = !!(
    filters.search ||
    filters.category ||
    filters.stockStatus !== 'all' ||
    filters.unitType !== 'all' ||
    filters.containerTracking !== 'all'
  )

  // Handle stock adjustment
  const onAdjustStock = async (itemId: number, adjustment: StockAdjustment) => {
    await handleAdjustStock(itemId, adjustment)
  }

  // Handle restock
  const onRestock = async (item: InventoryItem) => {
    await handleRestockItem(item.id)
  }

  // Handle bulk restock
  const handleBulkRestock = () => {
    // Get all low stock items
    const lowStockItems = items.filter(item => item.needs_reorder)
    if (lowStockItems.length === 0) {
      alert('No items need restocking')
      return
    }
    const itemIds = lowStockItems.map(item => item.id)
    handleRestockItem(itemIds[0]) // For now, just restock first item
    // TODO: Implement bulk restock modal
  }

  // Handle create new item
  const handleCreate = useCallback(() => {
    window.location.href = '/admin/inventory/create'
  }, [])

  if (error) {
    return (
      <AdminLayout
        title="Inventory Management"
        pageTitle="Inventory Management"
        pageSubtitle="Track stock levels, receive alerts, and manage inventory"
      >
        <InlineError
          message="Failed to load inventory. Please try again."
          onRetry={() => refetch()}
        />
      </AdminLayout>
    )
  }

  if (isLoading) {
    return (
      <AdminLayout
        title="Inventory Management"
        pageTitle="Inventory Management"
        pageSubtitle="Track stock levels, receive alerts, and manage inventory"
      >
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner type="branded" size="xl" />
          <p className="mt-4 text-[#5c5752]">Loading inventory...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title="Inventory Management"
      pageTitle="Inventory Management"
      pageSubtitle="Track stock levels, receive alerts, and manage inventory"
    >
      {/* Content */}
      <>
        {/* Filters */}
        <InventoryFilters
          searchQuery={filters.search}
          onSearchChange={(value) => updateFilters({ search: value })}
          categoryFilter={filters.category}
          onCategoryChange={(value) => updateFilters({ category: value })}
          stockStatusFilter={filters.stockStatus}
          onStockStatusChange={(value) => updateFilters({ stockStatus: value as TabId | 'all' })}
          unitTypeFilter={filters.unitType}
          onUnitTypeChange={(value) => updateFilters({ unitType: value as 'count' | 'volume' | 'weight' | 'all' })}
          containerFilter={filters.containerTracking}
          onContainerChange={(value) => updateFilters({ containerTracking: value as 'all' | 'with_containers' | 'without_containers' })}
          categories={categoryOptions}
          onRefresh={refetch}
          onBulkRestock={handleBulkRestock}
          onCreate={handleCreate}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          lowStockCount={lowStockCount}
        />

        {/* Statistics Dashboard */}
        {stats && (
          <InventoryStats
            totalItems={stats.total_items}
            inStockCount={stats.in_stock_count}
            lowStockCount={stats.low_stock_count}
            outOfStockCount={stats.out_of_stock_count}
            totalValue={stats.total_value}
            containerItemsCount={containerItemsCount}
          />
        )}

        {/* Tabbed Interface - Desktop */}
        <div className="hidden sm:flex border-b border-[#e8e4df]/60 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'border-[#d4a574] text-[#d4a574]'
                      : 'border-transparent text-[#8b8680] hover:text-[#5c5752] hover:border-[#e8e4df]'
                  }`}
                >
                  <Icon
                    className={`${
                      activeTab === tab.id ? 'text-[#d4a574]' : 'text-[#8b8680] group-hover:text-[#5c5752]'
                    } -ml-0.5 mr-2 h-5 w-5`}
                  />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Mobile Tab Filter */}
        <div className="sm:hidden mb-4">
          <select
            value={activeTab}
            onChange={(e) => handleTabChange(e.target.value as TabId)}
            className="w-full px-3 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-white text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20"
          >
            {TABS.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>

        {/* Items Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-[#8b8680]">
            Showing {items.length} of {stats?.total_items || 0} items
          </p>
        </div>

        {/* Table View */}
        <InventoryTable
          items={items}
          onViewDetails={openViewDetailsModal}
          onEdit={(itemId) => window.location.href = `/admin/inventory/edit/${itemId}`}
          onAdjustStock={openAdjustModal}
          onRestock={openRestockModal}
        />

        {/* Pagination */}
        {stats && stats.total_items > itemsPerPage && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#e8e4df]/60">
            <p className="text-sm text-[#8b8680]">
              Page {pagination.currentPage} of {Math.ceil((stats.total_items || 0) / itemsPerPage)}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={previousPage}
                disabled={!canGoToPreviousPage}
                className="px-4 py-2 rounded-lg border border-[#e8e4df]/60 bg-white text-[#5c5752] hover:bg-[#faf9f7] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                onClick={nextPage}
                disabled={!canGoToNextPage}
                className="px-4 py-2 rounded-lg bg-[#d4a574] text-white hover:bg-[#c49a6b] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Stock Adjust Modal */}
        <StockAdjustModal
          show={showAdjustModal}
          item={selectedItem}
          onClose={closeModals}
          onConfirm={async (adjustment) => {
            if (selectedItem) {
              await onAdjustStock(selectedItem.id, adjustment)
            }
          }}
        />

        {/* Restock Modal */}
        <RestockModal
          show={showRestockModal}
          item={selectedItem}
          onClose={closeModals}
          onConfirm={async (quantity) => {
            if (selectedItem) {
              await onRestock(selectedItem)
            }
          }}
        />

        {/* View Details Modal */}
        <ViewDetailsModal
          show={showViewDetailsModal}
          item={selectedItem}
          onClose={closeModals}
        />
      </>
    </AdminLayout>
  )
}
