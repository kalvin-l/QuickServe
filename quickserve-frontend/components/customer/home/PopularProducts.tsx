'use client'

import React from 'react'
import type { Product } from '@/types'
import ProductGrid from '../product/ProductGrid'

export interface PopularProductsProps {
  products: Product[]
  onAddToCart: (product: Product) => void
  onViewDetails: (product: Product) => void
  onCustomize: (product: Product) => void
}

/**
 * PopularProducts component - Displays popular products in a grid
 */
export default function PopularProducts({
  products,
  onAddToCart,
  onViewDetails,
  onCustomize
}: PopularProductsProps) {
  return (
    <ProductGrid
      products={products}
      title="Popular"
      subtitle="Handpicked favorites by our customers"
      onAddToCart={onAddToCart}
      onViewDetails={onViewDetails}
      onCustomize={onCustomize}
    />
  )
}
