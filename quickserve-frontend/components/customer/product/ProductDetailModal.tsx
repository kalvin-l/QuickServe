'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import type { Product, CartItem, SizeOption } from '@/types'
import Modal from '@/components/ui/modal/Modal'
import { formatPrice } from '@/lib/utils'
import { SIZE_PRICES } from '@/config/constants'
import { X, Minus, Plus, ShoppingBag, Star, Check } from 'lucide-react'

export interface ProductDetailModalProps {
  show: boolean
  product: Product | null
  onClose: () => void
  onAddToCart: (item: CartItem) => void
}

export default function ProductDetailModal({
  show,
  product,
  onClose,
  onAddToCart
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState<string>('')

  const sizeOptions: SizeOption[] = useMemo(() => {
    const labels = product?.size_labels || ['Small', 'Medium', 'Large']
    return labels.map((label) => {
      const id = label.toLowerCase().replace(/\s+/g, '_')
      return {
        id,
        name: label,
        price: SIZE_PRICES[label] ?? 0
      }
    })
  }, [product])

  useEffect(() => {
    if (show) {
      setQuantity(1)
      const defaultSize = sizeOptions.length > 0 ? sizeOptions[0].id : 'medium'
      setSelectedSize(defaultSize)
    }
  }, [show, product, sizeOptions])

  const sizePrice = sizeOptions.find(s => s.id === selectedSize)?.price ?? 0
  const itemPrice = (product?.price ?? 0) + sizePrice
  const totalPrice = itemPrice * quantity

  const incrementQuantity = () => setQuantity(prev => prev + 1)
  const decrementQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1))

  const handleAddToCart = useCallback(() => {
    if (!product) return

    const selectedSizeOption = sizeOptions.find(s => s.id === selectedSize)

    const cartItem: CartItem = {
      id: `${product.id}-${selectedSize}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      description: product.description,
      image: product.image || product.image_url || '',
      price: product.price,
      quantity,
      customizations: {
        size: selectedSizeOption?.name,
        sizeKey: selectedSize,
        sizePrice
      },
      totalPrice
    }

    onAddToCart(cartItem)
    onClose()
  }, [product, quantity, selectedSize, sizePrice, sizeOptions, totalPrice, onAddToCart, onClose])

  const handleClose = useCallback(() => {
    setQuantity(1)
    setSelectedSize('medium')
    onClose()
  }, [onClose])

  if (!product) return null

  return (
    <Modal show={show} onClose={handleClose} maxWidth="3xl">
      <div className="bg-white text-[#2d2a26] h-[90vh] md:h-auto md:max-h-[85vh] overflow-hidden flex flex-col">

        {/* Mobile Close Button - outside grid */}
        <button
          onClick={handleClose}
          className="md:hidden absolute top-4 right-4 z-20 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#2d2a26] hover:bg-white transition-colors shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Two-Column / Mobile Single Column Layout */}
        <div className="flex flex-col md:grid md:grid-cols-2 h-full md:h-[600px]">
          
          {/* Left Column - Image (Desktop) / Header (Mobile) */}
          <div className="relative md:h-full">
            {/* Image Container */}
            <div className="relative h-56 sm:h-64 md:h-full md:min-h-[400px]">
              <Image
                src={product.image || product.image_url || ''}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/20" />
              
              {/* Desktop Close Button */}
              <button
                onClick={handleClose}
                className="hidden md:flex absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full items-center justify-center text-[#2d2a26] hover:bg-white transition-colors shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title Overlay - Mobile Only */}
              <div className="md:hidden absolute bottom-4 left-6 right-6">
                <h2 className="text-2xl sm:text-3xl font-semibold text-white drop-shadow-lg">
                  {product.name}
                </h2>
                {product.rating && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Star className="w-4 h-4 text-[#d4a574] fill-[#d4a574]" />
                    <span className="text-white font-medium text-sm">{Number(product.rating).toFixed(1)}</span>
                    <span className="text-white/70 text-sm">({product.reviewCount || 0} reviews)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Content */}
          <div className="flex flex-col md:h-full md:overflow-hidden">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 -webkit-overflow-scrolling: touch touch-pan-y overscroll-behavior-y-contain">
              
              {/* Desktop Title */}
              <div className="hidden md:block">
                <h2 className="text-2xl font-semibold text-[#2d2a26] tracking-tight">
                  {product.name}
                </h2>
                {product.rating && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Star className="w-4 h-4 text-[#d4a574] fill-[#d4a574]" />
                    <span className="text-[#2d2a26] font-medium text-sm">{Number(product.rating).toFixed(1)}</span>
                    <span className="text-[#8b8680] text-sm">({product.reviewCount || 0} reviews)</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-[#5c5752] text-sm leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Size Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[#2d2a26] tracking-[0.15em] uppercase">
                    Select Size
                  </h3>
                  <span className="text-[10px] font-semibold text-[#d4a574] bg-[#faf9f7] px-2.5 py-1 rounded-full uppercase tracking-wider border border-[#e8e4df]/60">
                    Required
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {sizeOptions.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(size.id)}
                      className={`
                        relative py-3 px-2 rounded-xl border-2 transition-all duration-200
                        ${selectedSize === size.id
                          ? 'border-[#d4a574] bg-[#faf9f7]'
                          : 'border-[#e8e4df]/60 bg-white hover:border-[#d4a574]/50'
                        }
                      `}
                    >
                      <span className={`block text-sm font-medium ${
                        selectedSize === size.id ? 'text-[#d4a574]' : 'text-[#2d2a26]'
                      }`}>
                        {size.name}
                      </span>
                      <span className={`block text-xs mt-0.5 ${
                        selectedSize === size.id ? 'text-[#d4a574]' : 'text-[#8b8680]'
                      }`}>
                        {size.price > 0 ? '+' + formatPrice(size.price) : 'Standard'}
                      </span>
                      {selectedSize === size.id && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-3.5 h-3.5 text-[#d4a574]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="bg-[#faf9f7] rounded-xl p-4 border border-[#e8e4df]/60">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#2d2a26]">Quantity</h3>
                    <p className="text-xs text-[#8b8680] mt-0.5">How many would you like?</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      type="button"
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#2d2a26] text-white transition-all disabled:opacity-40 hover:bg-[#3d3a36]"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-semibold w-6 text-center text-[#2d2a26]">
                      {quantity}
                    </span>
                    <button
                      onClick={incrementQuantity}
                      type="button"
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#2d2a26] text-white transition-all hover:bg-[#3d3a36]"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              <div className="space-y-2 pt-2 border-t border-[#e8e4df]/60">
                <div className="flex justify-between text-sm">
                  <span className="text-[#8b8680]">Base price</span>
                  <span className="text-[#5c5752]">{formatPrice(product.price)}</span>
                </div>
                {sizePrice > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8b8680]">Size upgrade</span>
                    <span className="text-[#d4a574]">+{formatPrice(sizePrice)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-[#8b8680]">Quantity</span>
                  <span className="text-[#5c5752]">×{quantity}</span>
                </div>
              </div>
            </div>

            {/* Footer - Add to Cart (Sticky on mobile, fixed on desktop) */}
            <div className="p-6 pt-4 border-t border-[#e8e4df]/60 bg-white shrink-0">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-[#8b8680]">Total</span>
                <span className="text-2xl font-semibold text-[#d4a574]">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              <button
                onClick={handleAddToCart}
                type="button"
                className="w-full bg-[#2d2a26] text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-[#3d3a36] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
              >
                <ShoppingBag className="w-5 h-5" />
                Add to Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
