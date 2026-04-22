'use client'

import { useState, useMemo } from 'react'
import { List, CheckCircle, XCircle, Star, Heart } from 'lucide-react'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { useMenuManagement } from './hooks/useMenuManagement'
import {
  MenuGridView,
  MenuTableView,
  MenuFilters,
  MenuStatusBar,
  MenuPagination,
  MenuDetailsModal,
} from './components'
import { LoadingSpinner, SkeletonGrid } from '@/components/ui/loading-spinner/LoadingSpinner'
import { InlineError } from '@/components/error'

// Tab definitions
const TABS = [
  { id: 'all', label: 'All Items', icon: List },
  { id: 'available', label: 'Available', icon: CheckCircle },
  { id: 'unavailable', label: 'Out of Stock', icon: XCircle },
  { id: 'featured', label: 'Featured', icon: Star },
  { id: 'popular', label: 'Popular', icon: Heart },
] as const

type TabId = typeof TABS[number]['id']

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState<TabId>('all')

  const {
    filteredProducts,
    paginatedProducts,
    categories,
    selectedItem,
    viewMode,
    filters,
    pagination,
    showModal,
    isLoading,
    error,
    itemsPerPage,
    totalPages,
    canGoToNextPage,
    canGoToPreviousPage,
    menuStats,
    setViewMode,
    updateFilters,
    clearFilters,
    handleViewDetails,
    handleEdit,
    handleToggleAvailability,
    handleDelete,
    closeModal,
    nextPage,
    previousPage,
    goToPage,
  } = useMenuManagement()

  // Get category name for status bar
  const currentCategoryName = categories.find((c) => c.value === filters.category)?.label

  // Sync tabs with availability filter
  const handleTabChange = useMemo(() => {
    return (tabId: TabId) => {
      setActiveTab(tabId)
      // Update filter to match tab
      if (tabId === 'all') {
        updateFilters({ availability: 'all' })
      } else if (tabId === 'available') {
        updateFilters({ availability: 'available' })
      } else if (tabId === 'unavailable') {
        updateFilters({ availability: 'unavailable' })
      } else if (tabId === 'featured') {
        updateFilters({ availability: 'featured' })
      } else if (tabId === 'popular') {
        updateFilters({ availability: 'popular' })
      }
    }
  }, [updateFilters])

  // Update active tab when filter changes externally
  useMemo(() => {
    if (filters.availability === 'all') setActiveTab('all')
    else if (filters.availability === 'available') setActiveTab('available')
    else if (filters.availability === 'unavailable') setActiveTab('unavailable')
    else if (filters.availability === 'featured') setActiveTab('featured')
    else if (filters.availability === 'popular') setActiveTab('popular')
  }, [filters.availability])

  if (error) {
    return (
      <AdminLayout
        title="Menu Management"
        pageTitle="Menu Management"
        pageSubtitle="Add, edit, and organize your menu items"
      >
        <InlineError message="Failed to load menu items. Please try again." onRetry={() => window.location.reload()} />
      </AdminLayout>
    )
  }

  if (isLoading) {
    return (
      <AdminLayout
        title="Menu Management"
        pageTitle="Menu Management"
        pageSubtitle="Add, edit, and organize your menu items"
      >
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner type="branded" size="xl" />
          <p className="mt-4 text-[#5c5752]">Loading menu items...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title="Menu Management"
      pageTitle="Menu Management"
      pageSubtitle="Add, edit, and organize your menu items"
    >
      {/* Content */}
      <>
          {/* Filters */}
          <MenuFilters
            searchQuery={filters.search}
            onSearchChange={(value) => updateFilters({ search: value })}
            categoryFilter={filters.category}
            onCategoryChange={(value) => updateFilters({ category: value })}
            availabilityFilter={filters.availability}
            onAvailabilityChange={(value) => updateFilters({ availability: value })}
            categories={categories}
            onRefresh={() => window.location.reload()}
            onAddItem={() => window.location.href = '/admin/menu/create'}
          />

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-[#e8e4df]/60 flex items-center gap-4">
              <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10"></div>
              <div className="p-3 rounded-full bg-[#f5f0eb] text-[#d4a574]">
                <List className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-[#8b8680] uppercase font-bold tracking-[0.15em]">Total Items</p>
                <p className="text-2xl font-bold text-[#2d2a26] tracking-tight">{menuStats.total}</p>
              </div>
            </div>
            <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-[#e8e4df]/60 flex items-center gap-4">
              <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#22c55e]/5 rounded-2xl -z-10"></div>
              <div className="p-3 rounded-full bg-[#f0fdf4] text-[#22c55e]">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-[#8b8680] uppercase font-bold tracking-[0.15em]">Available</p>
                <p className="text-2xl font-bold text-[#2d2a26] tracking-tight">{menuStats.available}</p>
              </div>
            </div>
            <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-[#e8e4df]/60 flex items-center gap-4">
              <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#ef4444]/5 rounded-2xl -z-10"></div>
              <div className="p-3 rounded-full bg-[#fef2f2] text-[#ef4444]">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-[#8b8680] uppercase font-bold tracking-[0.15em]">Out of Stock</p>
                <p className="text-2xl font-bold text-[#2d2a26] tracking-tight">{menuStats.outOfStock}</p>
              </div>
            </div>
            <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-[#e8e4df]/60 flex items-center gap-4">
              <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#f59e0b]/5 rounded-2xl -z-10"></div>
              <div className="p-3 rounded-full bg-[#fef3c7] text-[#f59e0b]">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-[#8b8680] uppercase font-bold tracking-[0.15em]">Featured</p>
                <p className="text-2xl font-bold text-[#2d2a26] tracking-tight">{menuStats.featured}</p>
              </div>
            </div>
          </div>

          {/* Tabbed Interface - Desktop */}
          <div className="hidden sm:flex border-b border-[#e8e4df]/60 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'border-[#d4a574] text-[#d4a574]'
                      : 'border-transparent text-[#8b8680] hover:text-[#5c5752] hover:border-[#e8e4df]'
                  }`}
                >
                  <tab.icon
                    className={`${
                      activeTab === tab.id ? 'text-[#d4a574]' : 'text-[#8b8680] group-hover:text-[#5c5752]'
                    } -ml-0.5 mr-2 h-5 w-5`}
                  />
                  <span>{tab.label}</span>
                </button>
              ))}
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

          {/* Status Bar and View Toggle */}
          <MenuStatusBar
            totalItems={filteredProducts.length}
            filteredItems={filteredProducts.length}
            searchQuery={filters.search}
            categoryFilter={filters.category}
            availabilityFilter={filters.availability}
            categoryName={currentCategoryName}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Grid or Table View */}
          {viewMode === 'grid' ? (
            <MenuGridView
              items={paginatedProducts}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onToggleAvailability={handleToggleAvailability}
              onDelete={handleDelete}
            />
          ) : (
            <MenuTableView
              items={paginatedProducts}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onToggleAvailability={handleToggleAvailability}
              onDelete={handleDelete}
            />
          )}

          {/* Pagination */}
          <MenuPagination
            currentPage={pagination.currentPage}
            totalPages={totalPages}
            filteredItems={filteredProducts.length}
            itemsPerPage={itemsPerPage}
            onPageChange={goToPage}
            canGoToPreviousPage={canGoToPreviousPage}
            canGoToNextPage={canGoToNextPage}
            onPreviousPage={previousPage}
            onNextPage={nextPage}
          />

          {/* Details Modal */}
          <MenuDetailsModal
            show={showModal}
            item={selectedItem}
            onClose={closeModal}
            onEdit={handleEdit}
            onToggleAvailability={handleToggleAvailability}
          />
        </>
    </AdminLayout>
  )
}
