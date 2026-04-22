'use client'

/**
 * Menu Page - Human-centered design with warm aesthetic
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCustomerProducts, useCustomerCategories } from '@/lib/api/queries/useCustomerMenu'
import { useCategoryStore } from '@/features/categories/store/categoryStore'
import { useCart } from '@/features/cart'
import { useCustomerSession } from '@/features/customer-session'
import { useGroupStore } from '@/features/groups/store/groupStore'
import { Search, Users, CheckCircle, Key, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { LoadingSpinner, SkeletonGrid, SkeletonCard } from '@/components/ui/loading-spinner/LoadingSpinner'
import CustomerLayout from '@/components/customer/layout/CustomerLayout'
import ProductCard from '@/components/customer/product/ProductCard'
import ProductDetailModal from '@/components/customer/product/ProductDetailModal'
import CustomProductModal from '@/components/customer/product/CustomProductModal'
import AccessCodeModal from '@/components/customer/AccessCodeModal'
import type { Product, CartItem } from '@/types'
import { toast } from 'react-hot-toast'

export default function MenuPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const { addToCart, setTableContext } = useCart()
  const { categories, setCategories } = useCategoryStore()
  const { currentGroup } = useGroupStore()

  const {
    tableNumber,
    tableId,
    qrCode,
    location,
    sessionId,
    isValid,
    isLoading: sessionLoading,
    isInitialized,
    error: sessionError,
    redirectToWelcome,
  } = useCustomerSession()

  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false)

  const { data: categoriesFromApi = [] } = useCustomerCategories()

  React.useEffect(() => {
    if (categoriesFromApi.length > 0) {
      setCategories(categoriesFromApi)
    }
  }, [categoriesFromApi, setCategories])

  useEffect(() => {
    if (!isInitialized) return

    if (!isValid && !sessionLoading) {
      redirectToWelcome()
      return
    }

    if (isValid && tableNumber && qrCode) {
      setTableContext(qrCode, tableNumber)
    }
  }, [isValid, isInitialized, sessionLoading, tableNumber, qrCode, setTableContext, redirectToWelcome])

  const [filters, setFilters] = useState({
    category_id: undefined as number | undefined,
    search: '',
    page: 1
  })

  const [detailModalProduct, setDetailModalProduct] = React.useState<Product | null>(null)
  const [customModalProduct, setCustomModalProduct] = React.useState<Product | null>(null)

  const { data: productsData, isLoading, error } = useCustomerProducts(filters)

  const products = productsData?.products || []
  const total = productsData?.total || 0
  const totalPages = productsData?.totalPages || 1

  const handleCategoryChange = useCallback((categoryId: string) => {
    setFilters(prev => ({
      ...prev,
      category_id: categoryId === 'all' ? undefined : Number(categoryId),
      page: 1
    }))
  }, [])

  const handleSearchChange = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }))
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleAddToCart = useCallback((product: Product) => {
    setDetailModalProduct(product)
  }, [])

  const handleViewDetails = useCallback((product: Product) => {
    setDetailModalProduct(product)
  }, [])

  const handleCustomize = useCallback((product: Product) => {
    setCustomModalProduct(product)
  }, [])

  const handleAddToCartFromDetail = useCallback(async (item: CartItem) => {
    const product: Product = {
      id: item.productId,
      name: item.name,
      description: item.description || '',
      price: item.price,
      price_formatted: item.price,
      image: item.image,
      category: '',
      rating: 4.5,
      reviewCount: 0,
      tags: [],
    }

    const result = await addToCart(product, item.quantity, item.customizations)

    if (result.success) {
      toast.success(`Added ${item.name} to order`)
      setDetailModalProduct(null)
    } else {
      toast.error(result.error || 'Failed to add item')
    }
  }, [addToCart])

  const handleAddToCartFromCustom = useCallback(async (item: CartItem) => {
    const product: Product = {
      id: item.productId,
      name: item.name,
      description: item.description || '',
      price: item.price,
      price_formatted: item.price,
      image: item.image,
      category: '',
      rating: 4.5,
      reviewCount: 0,
      tags: [],
    }

    const result = await addToCart(product, item.quantity, item.customizations)

    if (result.success) {
      toast.success(`Added ${item.name} to order`)
      setCustomModalProduct(null)
    } else {
      toast.error(result.error || 'Failed to add item')
    }
  }, [addToCart])

  if (sessionLoading) {
    return (
      <CustomerLayout categories={categories} activeCategory="all" onCategorySelect={() => {}}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
          <div className="text-center">
            <div className="relative inline-block">
              {/* Steam animations */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-1">
                <div className="w-0.5 h-2 bg-[#d4a574]/60 rounded-full animate-pulse" style={{ animation: 'steam-rise 1.5s ease-in-out infinite' }} />
                <div className="w-0.5 h-2 bg-[#d4a574]/40 rounded-full animate-pulse" style={{ animation: 'steam-rise 1.5s ease-in-out infinite 0.3s' }} />
                <div className="w-0.5 h-2 bg-[#d4a574]/50 rounded-full animate-pulse" style={{ animation: 'steam-rise 1.5s ease-in-out infinite 0.6s' }} />
              </div>
              {/* Coffee cup */}
              <div className="w-12 h-14 relative" style={{ animation: 'gentle-bounce 2s ease-in-out infinite' }}>
                <svg viewBox="0 0 40 48" fill="none" className="w-full h-full">
                  <path d="M4 8h24v20c0 4.418-3.582 8-8 8h-8c-4.418 0-8-3.582-8-8V8z" className="fill-[#d4a574]/20 stroke-[#d4a574]" strokeWidth="2" />
                  <ellipse cx="16" cy="10" rx="10" ry="3" className="fill-[#d4a574]/60" />
                  <path d="M28 14h4c2.209 0 4 1.791 4 4v6c0 2.209-1.791 4-4 4h-4" className="stroke-[#d4a574]" strokeWidth="2" fill="none" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-[#5c5752] font-medium">Validating table...</p>
            <p className="text-[#8b8680] text-sm mt-1">Please wait while we set up your session</p>
          </div>

          <style jsx>{`
            @keyframes steam-rise {
              0%, 100% { transform: translateY(0) scaleY(1); opacity: 0.6; }
              50% { transform: translateY(-6px) scaleY(1.2); opacity: 0.3; }
            }
            @keyframes gentle-bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-3px); }
            }
          `}</style>
        </div>
      </CustomerLayout>
    )
  }

  if (sessionError) {
    return (
      <CustomerLayout categories={categories} activeCategory="all" onCategorySelect={() => {}}>
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                <X className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Session Error</p>
                <p className="text-sm text-red-700 mt-1">{sessionError}</p>
                <button
                  onClick={() => router.push('/join')}
                  className="mt-2 text-sm font-medium text-red-900 underline hover:no-underline"
                >
                  Enter access code
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowAccessCodeModal(true)}
            className="w-full bg-[#f5f0eb] border border-[#e8e4df] rounded-xl px-4 py-3 flex items-center justify-center gap-2 hover:bg-[#ebe5de] transition-colors"
          >
            <Key className="w-4 h-4 text-[#d4a574]" />
            <span className="text-sm font-medium text-[#5c5752]">
              Enter Access Code
            </span>
          </button>
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout
      categories={categories}
      activeCategory={filters.category_id?.toString() || 'all'}
      onCategorySelect={handleCategoryChange}
    >
      <div className="py-6 sm:py-8">
        {/* Group Mode Banner */}
        {currentGroup?.payment_type === 'host_pays_all' && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mb-6">
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <Users className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Group Order Active</p>
                <p className="text-xs text-green-700">Items will be added to the group cart</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="relative mx-4 sm:mx-6 lg:mx-8 mb-8">
          <div className="absolute inset-0 bg-[#d4a574]/20 rounded-2xl translate-x-0.5 translate-y-0.5" />
          <div className="relative bg-white rounded-2xl p-6 sm:p-8 border border-[#e8e4df]/60 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-medium text-[#d4a574] tracking-[0.2em] uppercase mb-2">
                  Browse Our Menu
                </p>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#2d2a26] tracking-tight">
                  Our Menu
                </h1>
                <p className="text-sm text-[#8b8680] mt-1">
                  Explore our delicious selection of food and drinks
                </p>
              </div>

              {/* Table info */}
              <div className="flex items-center gap-2">
                {tableNumber && location && (
                  <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-xs font-medium text-green-900">
                      Table {tableNumber}
                    </span>
                  </div>
                )}
                {!tableNumber && (
                  <button
                    onClick={() => setShowAccessCodeModal(true)}
                    className="bg-[#f5f0eb] border border-[#e8e4df] rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-[#ebe5de] transition-colors"
                  >
                    <Key className="w-3.5 h-3.5 text-[#d4a574]" />
                    <span className="text-xs font-medium text-[#5c5752]">
                      Access Code
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mt-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8680]" />
              <input
                type="search"
                placeholder="Search menu items..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-11 pr-11 py-3 bg-[#faf9f7] border border-[#e8e4df]/60 rounded-xl text-[#2d2a26] placeholder-[#8b8680] text-sm focus:outline-none focus:border-[#d4a574]/50 transition-all"
              />
              {filters.search && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b8680] hover:text-[#5c5752] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search hint */}
            {filters.search && (
              <p className="text-xs text-[#8b8680] mt-3 ml-1">
                Searching for "{filters.search}"
              </p>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <SkeletonGrid count={8} columns={4} />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="px-4 sm:px-6 lg:px-8 text-center py-12">
            <p className="text-red-600">Failed to load menu. Please try again.</p>
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && !error && (
          <div className="px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-[#8b8680] mb-6">
              Showing {products.length} of {total} items
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onViewDetails={handleViewDetails}
                  onCustomize={handleCustomize}
                />
              ))}
            </div>

            {/* Empty State */}
            {products.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#f5f0eb] flex items-center justify-center">
                  <Search className="w-7 h-7 text-[#d4a574]" />
                </div>
                <p className="text-[#5c5752] font-medium">No items found</p>
                <p className="text-sm text-[#8b8680] mt-1">Try adjusting your search or filters</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && products.length > 0 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-[#e8e4df] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f5f0eb] transition-colors text-sm text-[#5c5752]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm text-[#5c5752] px-4">
                  Page {filters.page} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page === totalPages}
                  className="flex items-center gap-1 px-4 py-2 bg-white border border-[#e8e4df] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f5f0eb] transition-colors text-sm text-[#5c5752]"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ProductDetailModal
        show={detailModalProduct !== null}
        product={detailModalProduct}
        onClose={() => setDetailModalProduct(null)}
        onAddToCart={handleAddToCartFromDetail}
      />
      <CustomProductModal
        show={customModalProduct !== null}
        product={customModalProduct}
        onClose={() => setCustomModalProduct(null)}
        onAddToCart={handleAddToCartFromCustom}
      />
      <AccessCodeModal
        isOpen={showAccessCodeModal}
        onClose={() => setShowAccessCodeModal(false)}
      />
    </CustomerLayout>
  )
}
