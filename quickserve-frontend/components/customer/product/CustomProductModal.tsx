'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import type { Product, CartItem, Addon, SizeOption } from '@/types'
import type { CartAddon } from '@/features/cart/types/cart.types'
import Modal from '@/components/ui/modal/Modal'
import { formatPrice } from '@/lib/utils'
import { SIZE_PRICES } from '@/config/constants'
import { X, Minus, Plus, ShoppingBag, Droplets, CirclePlus, Cookie, FlaskRound, Grid3X3, Star, Check } from 'lucide-react'

export interface CustomProductModalProps {
  show: boolean
  product: Product | null
  onClose: () => void
  onAddToCart: (item: CartItem) => void
}

export default function CustomProductModal({
  show,
  product,
  onClose,
  onAddToCart
}: CustomProductModalProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({})
  const [quantity, setQuantity] = useState(1)

  const sizeOptions = useMemo((): Record<string, SizeOption> => {
    const labels = product?.size_labels || ['Small', 'Medium', 'Large']
    return labels.reduce((acc, label) => {
      const key = label.toLowerCase().replace(/\s+/g, '_')
      acc[key] = {
        id: key,
        name: label,
        price: SIZE_PRICES[label] ?? 0
      }
      return acc
    }, {} as Record<string, SizeOption>)
  }, [product])

  const groupedAddons = useMemo(() => {
    const addons = product?.addons || []
    const groups: Record<string, Addon[]> = {}

    addons.forEach((addon: any) => {
      if (!addon.available) return
      const category = addon.category || 'Extras'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(addon)
    })

    return groups
  }, [product])

  const hasAddons = Object.keys(groupedAddons).length > 0

  const getCategoryIcon = (category: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      'Milk': <Droplets className="w-4 h-4" />,
      'Extras': <CirclePlus className="w-4 h-4" />,
      'Toppings': <Cookie className="w-4 h-4" />,
      'Syrups': <FlaskRound className="w-4 h-4" />,
      'Sweeteners': <Grid3X3 className="w-4 h-4" />
    }
    return icons[category] || <CirclePlus className="w-4 h-4" />
  }

  useEffect(() => {
    if (show) {
      const sizeKeys = Object.keys(sizeOptions)
      setSelectedSize(sizeKeys.length > 1 ? sizeKeys[1] : sizeKeys[0])
      setSelectedAddons({})
      setQuantity(1)
    }
  }, [show, product, sizeOptions])

  const incrementQuantity = () => setQuantity(prev => prev + 1)
  const decrementQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1))

  const sizePriceValue = useMemo(() => {
    if (!selectedSize) return 0
    return sizeOptions[selectedSize]?.price ?? 0
  }, [selectedSize, sizeOptions])

  const addonsPriceValue = useMemo(() => {
    let total = 0
    Object.entries(selectedAddons).forEach(([addonId, quantity]) => {
      const addon = product?.addons?.find((a: any) => a.id === parseInt(addonId))
      if (addon && quantity > 0) {
        const addonPrice = addon.price_formatted || addon.price / 100
        total += addonPrice * quantity
      }
    })
    return total
  }, [selectedAddons, product])

  const totalPriceValue = useMemo(() => {
    const base = product?.price_formatted ?? product?.price ?? 0
    return (base + sizePriceValue + addonsPriceValue) * quantity
  }, [product, sizePriceValue, addonsPriceValue, quantity])

  const incrementAddon = (addonId: string, maxQty: number) => {
    const current = selectedAddons[addonId] || 0
    if (current < maxQty) {
      setSelectedAddons(prev => ({ ...prev, [addonId]: current + 1 }))
    }
  }

  const decrementAddon = (addonId: string) => {
    const current = selectedAddons[addonId] || 0
    if (current > 0) {
      setSelectedAddons(prev => ({ ...prev, [addonId]: current - 1 }))
    }
  }

  const getAddonQuantity = (addonId: string): number => {
    return selectedAddons[addonId] || 0
  }

  const handleAddToCart = useCallback(() => {
    if (!product) return

    const selectedAddonsList: CartAddon[] = []
    Object.entries(selectedAddons).forEach(([addonId, quantity]) => {
      if (quantity > 0) {
        const addon = product?.addons?.find((a: any) => a.id === parseInt(addonId))
        if (addon) {
          const addonPrice = addon.price_formatted || addon.price / 100
          selectedAddonsList.push({
            id: addon.id,
            name: addon.name,
            description: addon.description,
            price: addonPrice,
            category: addon.category,
            quantity,
            totalPrice: addonPrice * quantity
          })
        }
      }
    })

    const cartItem: CartItem = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      description: product.description,
      image: product.image || product.image_url || '',
      price: product.price_formatted ?? product.price ?? 0,
      quantity,
      customizations: {
        size: selectedSize ? sizeOptions[selectedSize]?.name : undefined,
        sizeKey: selectedSize || undefined,
        sizePrice: sizePriceValue,
        addons: selectedAddonsList
      },
      totalPrice: totalPriceValue
    }

    onAddToCart(cartItem)
    handleClose()
  }, [product, selectedSize, sizeOptions, selectedAddons, totalPriceValue, quantity, onAddToCart])

  const handleClose = useCallback(() => {
    setSelectedSize(null)
    setSelectedAddons({})
    setQuantity(1)
    onClose()
  }, [onClose])

  if (!product) return null

  const selectedAddonsCount = Object.values(selectedAddons).filter(q => q > 0).length

  return (
    <Modal show={show} onClose={handleClose} maxWidth="4xl">
      <div className="bg-white text-[#2d2a26] h-[90vh] md:h-auto md:max-h-[85vh] overflow-hidden flex flex-col">

        {/* Mobile Close Button */}
        <button
          onClick={handleClose}
          className="md:hidden absolute top-4 right-4 z-20 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#2d2a26] hover:bg-white transition-colors shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Two-Column / Mobile Single Column Layout */}
        <div className="flex flex-col md:grid md:grid-cols-5 h-full md:h-[700px]">
          
          {/* Left Column - Image (40% on desktop) */}
          <div className="relative md:col-span-2">
            <div className="relative h-56 sm:h-64 md:h-full md:min-h-[400px]">
              <Image
                src={product.image || product.image_url || ''}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
                priority
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/10" />
              
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

          {/* Right Column - Customization Options (60% on desktop) */}
          <div className="flex flex-col md:col-span-3 md:h-full md:overflow-hidden">
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
              {Object.keys(sizeOptions).length > 0 && (
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
                    {Object.entries(sizeOptions).map(([key, size]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedSize(key)}
                        className={`
                          relative py-3 px-2 rounded-xl border-2 transition-all duration-200
                          ${selectedSize === key
                            ? 'border-[#d4a574] bg-[#faf9f7]'
                            : 'border-[#e8e4df]/60 bg-white hover:border-[#d4a574]/50'
                          }
                        `}
                      >
                        <span className={`block text-sm font-medium ${
                          selectedSize === key ? 'text-[#d4a574]' : 'text-[#2d2a26]'
                        }`}>
                          {size.name}
                        </span>
                        <span className={`block text-xs mt-0.5 ${
                          selectedSize === key ? 'text-[#d4a574]' : 'text-[#8b8680]'
                        }`}>
                          {size.price > 0 ? '+' + formatPrice(size.price) : 'Free'}
                        </span>
                        {selectedSize === key && (
                          <div className="absolute top-2 right-2">
                            <Check className="w-3.5 h-3.5 text-[#d4a574]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Addons - 2 column grid on desktop */}
              {hasAddons && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#2d2a26] tracking-[0.15em] uppercase">
                      Add-ons
                    </h3>
                    {selectedAddonsCount > 0 && (
                      <span className="text-[10px] font-semibold text-[#d4a574] bg-[#faf9f7] px-2.5 py-1 rounded-full border border-[#e8e4df]/60">
                        {selectedAddonsCount} selected
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {Object.entries(groupedAddons).map(([category, addons]) => (
                      <div key={category} className="bg-[#faf9f7] rounded-xl p-4 border border-[#e8e4df]/60">
                        <h4 className="text-[11px] font-bold text-[#8b8680] uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
                          <span className="text-[#d4a574]">{getCategoryIcon(category)}</span>
                          {category}
                        </h4>
                        <div className="space-y-2.5">
                          {addons.map((addon: any) => {
                            const qty = getAddonQuantity(addon.id.toString())
                            return (
                              <div
                                key={addon.id}
                                className={`flex items-center justify-between p-2.5 rounded-lg transition-all ${
                                  qty > 0 ? 'bg-white shadow-sm' : 'bg-transparent'
                                }`}
                              >
                                <div className="flex-1 min-w-0 pr-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-[#2d2a26] truncate">
                                      {addon.name}
                                    </span>
                                    <span className="text-[10px] font-semibold text-[#d4a574] bg-[#faf9f7] px-1.5 py-0.5 rounded flex-shrink-0 border border-[#e8e4df]/60">
                                      +{formatPrice(addon.price_formatted || addon.price / 100)}
                                    </span>
                                  </div>
                                  {addon.description && (
                                    <p className="text-[11px] text-[#8b8680] mt-0.5 truncate">
                                      {addon.description}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => decrementAddon(addon.id.toString())}
                                    disabled={qty === 0}
                                    className="w-7 h-7 flex items-center justify-center rounded-md bg-[#2d2a26] text-white transition-all disabled:opacity-30 hover:bg-[#3d3a36]"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="text-sm font-semibold w-5 text-center text-[#2d2a26]">
                                    {qty}
                                  </span>
                                  <button
                                    onClick={() => incrementAddon(addon.id.toString(), addon.max_quantity || 5)}
                                    disabled={qty >= (addon.max_quantity || 5)}
                                    className="w-7 h-7 flex items-center justify-center rounded-md bg-[#2d2a26] text-white transition-all disabled:opacity-30 hover:bg-[#3d3a36]"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No customizations */}
              {!hasAddons && Object.keys(sizeOptions).length === 0 && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-[#faf9f7] mx-auto flex items-center justify-center mb-3 border border-[#e8e4df]/60">
                    <Star className="w-5 h-5 text-[#d4a574]" />
                  </div>
                  <p className="text-sm text-[#2d2a26] font-medium">No customizations available</p>
                  <p className="text-xs text-[#8b8680] mt-1">This item comes as is</p>
                </div>
              )}

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
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#2d2a26] text-white transition-all disabled:opacity-40 hover:bg-[#3d3a36]"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-semibold w-6 text-center text-[#2d2a26]">
                      {quantity}
                    </span>
                    <button
                      onClick={incrementQuantity}
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
                  <span className="text-[#5c5752]">{formatPrice(product?.price_formatted ?? product?.price ?? 0)}</span>
                </div>
                {sizePriceValue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8b8680]">Size upgrade</span>
                    <span className="text-[#d4a574]">+{formatPrice(sizePriceValue)}</span>
                  </div>
                )}
                {addonsPriceValue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8b8680]">Add-ons</span>
                    <span className="text-[#d4a574]">+{formatPrice(addonsPriceValue)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-[#8b8680]">Quantity</span>
                  <span className="text-[#5c5752]">×{quantity}</span>
                </div>
              </div>
            </div>

            {/* Footer - Add to Cart */}
            <div className="p-6 pt-4 border-t border-[#e8e4df]/60 bg-white shrink-0">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-[#8b8680]">Total</span>
                <span className="text-2xl font-semibold text-[#d4a574]">
                  {formatPrice(totalPriceValue)}
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
