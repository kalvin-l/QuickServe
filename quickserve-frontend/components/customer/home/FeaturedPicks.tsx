'use client'

import React from 'react'
import Image from 'next/image'
import type { Product } from '@/types'
import { Plus, ArrowRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export interface FeaturedPicksProps {
  products: Product[]
  onAddToCart: (product: Product) => void
  onViewDetails: (product: Product) => void
  onCustomize: (product: Product) => void
}

/**
 * FeaturedPicks - Human-centered design with large editorial cards
 */
export default function FeaturedPicks({
  products,
  onAddToCart,
  onViewDetails,
  onCustomize
}: FeaturedPicksProps) {
  if (products.length === 0) {
    return null
  }

  return (
    <section className="py-8 sm:py-12">
      {/* Section Header */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[10px] font-medium text-[#d4a574] tracking-[0.2em] uppercase block mb-2">
              Handpicked
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#2d2a26] tracking-tight">
              Featured
            </h2>
          </div>
          <button className="hidden sm:flex items-center gap-1 text-xs font-medium text-[#8b8680] hover:text-[#2d2a26] transition-colors">
            View all
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll */}
      <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 sm:px-6 lg:px-8 gap-4 pb-4">
        {products.map((product, index) => (
          <article
            key={product.id}
            className="group flex-shrink-0 w-[300px] sm:w-[340px] snap-start relative"
          >
            {/* Subtle offset shadow on hover */}
            <div className="absolute inset-0 bg-[#2d2a26]/20 rounded-2xl translate-x-0.5 translate-y-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300" />
            
            <div className="relative bg-white rounded-2xl overflow-hidden border border-[#e8e4df]/60 transition-all duration-300 group-hover:border-[#2d2a26]/20 group-hover:shadow-sm">
              {/* Large Image */}
              <div 
                className="relative h-[360px] sm:h-[400px] overflow-hidden bg-[#f5f0eb] cursor-pointer"
                onClick={() => onViewDetails(product)}
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  sizes="340px"
                  priority={index < 2}
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#2d2a26]/80 via-[#2d2a26]/20 to-transparent" />

                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div className="absolute top-4 left-4 flex gap-2">
                    {product.tags.slice(0, 2).map((tag, i) => (
                      <span 
                        key={i}
                        className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-medium text-white"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-lg font-semibold text-white mb-1 leading-tight">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-xs text-white/70 line-clamp-1 mb-3">
                      {product.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-[#d4a574]">
                      {formatPrice(product.price)}
                    </span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddToCart(product)
                      }}
                      disabled={!product.available}
                      className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-[#d4a574] hover:text-white transition-colors disabled:opacity-50 text-[#2d2a26]"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
