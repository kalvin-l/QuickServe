'use client'

import React from 'react'
import Image from 'next/image'
import type { Product } from '@/types'
import { Plus } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useGroupStore } from '@/features/groups/store/groupStore'

export interface ProductCardProps {
  product: Product
  onAddToCart: (product: Product) => void
  onViewDetails: (product: Product) => void
  onCustomize: (product: Product) => void
  variant?: 'default' | 'featured'
}

/**
 * ProductCard - Human-centered design with offset shadow and warm aesthetic
 */
export default function ProductCard({
  product,
  onAddToCart,
  onViewDetails,
  onCustomize,
  variant = 'default'
}: ProductCardProps) {
  const isFeatured = variant === 'featured'
  const currentGroup = useGroupStore((state) => state.currentGroup)
  const isGroupMode = currentGroup?.payment_type === 'host_pays_all'
  const hasAddons = product.addons && product.addons.length > 0

  return (
    <article className="group relative">
      {/* Subtle offset shadow */}
      <div className="absolute inset-0 bg-[#d4a574]/30 rounded-xl translate-x-0.5 translate-y-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300" />
      
      <div className="relative bg-white rounded-xl overflow-hidden border border-[#e8e4df]/60 transition-all duration-300 group-hover:border-[#d4a574]/30 group-hover:shadow-sm">
        {/* Image Container */}
        <div 
          className="relative aspect-[4/3] overflow-hidden bg-[#f5f0eb] cursor-pointer"
          onClick={() => onViewDetails(product)}
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          
          {/* Rating */}
          {product.rating && (
            <div className="absolute top-3 right-3 bg-white/95 px-2 py-0.5 rounded-full text-[10px] font-medium text-[#2d2a26] flex items-center gap-1 shadow-sm">
              <span className="text-[#d4a574]">★</span>
              {Number(product.rating).toFixed(1)}
            </div>
          )}

          {/* Out of Stock */}
          {!product.available && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-[10px] font-medium text-[#8b8680] tracking-wide uppercase">Unavailable</span>
            </div>
          )}

          {/* Quick Add Button */}
          {product.available && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToCart(product)
              }}
              className="absolute bottom-3 right-3 w-9 h-9 bg-[#2d2a26] text-white rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-[#d4a574]"
              aria-label="Add to cart"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 
            className="text-sm font-semibold text-[#2d2a26] leading-snug mb-1 cursor-pointer hover:text-[#d4a574] transition-colors"
            onClick={() => onViewDetails(product)}
          >
            {product.name}
          </h3>

          {product.description && (
            <p className="text-xs text-[#8b8680] line-clamp-1 mb-3">
              {product.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#d4a574]">
              {formatPrice(product.price)}
            </span>

            {hasAddons && product.available && (
              <button
                onClick={() => onCustomize(product)}
                className="text-[10px] font-medium text-[#8b8680] hover:text-[#2d2a26] transition-colors uppercase tracking-wider"
              >
                Customize
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
