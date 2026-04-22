'use client'

import React from 'react'
import type { Product } from '@/types'
import { ArrowRight } from 'lucide-react'
import ProductCard from './ProductCard'

export interface ProductGridProps {
  products: Product[]
  title: string
  subtitle: string
  showViewAll?: boolean
  onAddToCart: (product: Product) => void
  onViewDetails: (product: Product) => void
  onCustomize: (product: Product) => void
  onViewAll?: () => void
}

/**
 * ProductGrid - Human-centered design with editorial typography
 */
export default function ProductGrid({
  products,
  title,
  subtitle,
  showViewAll = false,
  onAddToCart,
  onViewDetails,
  onCustomize,
  onViewAll
}: ProductGridProps) {
  return (
    <section className="py-8 sm:py-12">
      {/* Section Header */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-medium text-[#d4a574] tracking-[0.2em] uppercase block mb-2">
              {subtitle}
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#2d2a26] tracking-tight">
              {title}
            </h2>
          </div>

          {showViewAll && onViewAll && (
            <button
              onClick={onViewAll}
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[#8b8680] hover:text-[#2d2a26] transition-colors shrink-0"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Product Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 px-4 sm:px-6 lg:px-8">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onViewDetails={onViewDetails}
              onCustomize={onCustomize}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#f5f0eb] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#8b8680]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm text-[#8b8680]">No products available</p>
        </div>
      )}
    </section>
  )
}
