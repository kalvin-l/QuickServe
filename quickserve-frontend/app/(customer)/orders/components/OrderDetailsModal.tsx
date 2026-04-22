'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/modal/Modal'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import {
  X, CheckCircle, Clock, ArrowRight, Receipt, Calendar,
  MapPin, Users, Coffee, Wallet, Trash2, RefreshCw
} from 'lucide-react'
import OrderStatusTimeline from './OrderStatusTimeline'
import type { StoredOrder } from '@/features/customer-orders/types/orderHistory.types'
import { useOrderHistory } from '@/features/customer-orders'
import { useCart } from '@/features/cart'
import { toast } from 'react-hot-toast'
import { customerMenuService } from '@/lib/api/services/customerMenuService'
import { formatDate, formatTime } from '@/lib/utils'

interface OrderDetailsModalProps {
  order: StoredOrder | null
  isOpen: boolean
  onClose: () => void
}

export default function OrderDetailsModal({ order, isOpen, onClose }: OrderDetailsModalProps) {
  const router = useRouter()
  const { removeOrder } = useOrderHistory()
  const { clearCart, addToCart } = useCart()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isReordering, setIsReordering] = useState(false)

  if (!order) return null

  const handleDeleteOrder = () => {
    removeOrder(order.id)
    onClose()
  }

  const handleReorder = async () => {
    setIsReordering(true)
    try {
      // Clear existing cart first
      clearCart()

      console.log('[Reorder] Starting reorder with items:', order.items)

      // Fetch all products once for name-based fallback lookup
      const allProductsResponse = await customerMenuService.getAllProducts({})
      const allProducts = allProductsResponse.products

      console.log('[Reorder] Total products from backend:', allProducts.length)
      console.log('[Reorder] Available product names:', allProducts.map(p => p.name))

      // Add each item to cart
      for (const item of order.items) {
        // Use menu_item_id (product ID) - fallback to item.id for old orders
        const productId = item.menu_item_id || item.id

        console.log('[Reorder] Processing item:', {
          item_name: item.item_name,
          menu_item_id: item.menu_item_id,
          item_id: item.id,
          using_product_id: productId,
          stored_image: item.item_image
        })

        // Fetch product from backend with real image
        let fullProduct
        let idLookupFailed = false
        try {
          console.log('[Reorder] Fetching product from backend for ID:', productId)
          fullProduct = await customerMenuService.getProduct(productId)
          console.log('[Reorder] Backend product response:', fullProduct)
        } catch (error) {
          // If backend fetch fails, mark for potential fallback logging
          idLookupFailed = true
          console.log('[Reorder] Product ID not found on backend, will try name search:', productId)
        }

        // If ID lookup failed, try to find by name (fallback for deleted/renamed products)
        if (!fullProduct) {
          console.log('[Reorder] Searching for product by name:', item.item_name)

          // Try to find product by name (case-insensitive)
          fullProduct = allProducts.find(p =>
            p.name.toLowerCase().trim() === item.item_name?.toLowerCase().trim()
          )

          if (fullProduct) {
            console.log('[Reorder] Found product by name search:', fullProduct.name)
            console.log('[Reorder] Product image from name search:', {
              image: fullProduct.image,
              image_url: fullProduct.image_url
            })
          } else {
            // Only log error if BOTH ID and name search failed (actual failure)
            if (idLookupFailed) {
              console.error('[Reorder] Product not found - neither ID nor name matched:', {
                searchedId: productId,
                searchedName: item.item_name,
                availableNames: allProducts.map(p => `"${p.name}"`).join(', ')
              })
            } else {
              console.warn('[Reorder] Product name not found:', item.item_name)
            }
          }
        }

        // Calculate unit price from the stored order item
        // Use item_total_in_pesos to get the correct price in pesos (not cents)
        const unitPrice = item.item_total_in_pesos / item.quantity

        console.log('[Reorder] Product to add to cart:', fullProduct ? {
          ...fullProduct,
          price: unitPrice,
        } : {
          id: productId,
          name: item.item_name,
          description: '',
          price: unitPrice,
          image: item.item_image || '',
          image_url: item.item_image || '',
          category: '',
          rating: 0,
          reviewCount: 0,
          tags: [],
          available: true,
          addons: [],
          size_labels: [],
        })

        // Create product object with full data if available, fallback to minimal data
        const product = fullProduct ? {
          ...fullProduct,
          price: unitPrice, // Override with stored price to match original order
        } : {
          id: productId,
          name: item.item_name,
          description: '',
          price: unitPrice,
          image: item.item_image || '',
          image_url: item.item_image || '',
          category: '',
          rating: 0,
          reviewCount: 0,
          tags: [],
          available: true,
          addons: [],
          size_labels: [],
        }

        // Customizations from stored data
        const customizations = {
          size: item.size_label,
          sizeLabel: item.size_label,
          sizeKey: item.size_label?.toLowerCase() || 'default',
          sizePrice: 0,
          temperature: item.temperature,
          addons: [],
        }

        await addToCart(product, item.quantity, customizations)
        console.log('[Reorder] Added to cart successfully:', {
          productId,
          name: product.name,
          image: product.image,
          image_url: product.image_url
        })
      }

      console.log('[Reorder] All items added, navigating to checkout')
      toast.success('Items added to cart')

      // Navigate to checkout after a short delay
      setTimeout(() => {
        router.push('/checkout')
      }, 500)
    } catch (error) {
      console.error('[Reorder] Reorder failed:', error)
      toast.error('Failed to reorder items')
    } finally {
      setIsReordering(false)
    }
  }

  return (
    <Modal show={isOpen} onClose={onClose} maxWidth="md">
      <div className="bg-[#faf9f7]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e8e4df]/60 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-[#d4a574]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#2d2a26] tracking-tight">Order Details</h3>
              <p className="text-xs text-[#8b8680]">{order.order_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-[#8b8680] hover:text-[#2d2a26] hover:bg-[#faf9f7] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          
          {/* Status Card */}
          <div className="relative bg-white rounded-xl p-5 border border-[#e8e4df]/60 shadow-sm">
            <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
            <OrderStatusTimeline currentStatus={order.status} />
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 border border-[#e8e4df]/60">
              <div className="flex items-center gap-1.5 text-[#8b8680] mb-2">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Date</span>
              </div>
              <p className="text-sm font-semibold text-[#2d2a26]">
                {formatDate(order.created_at)}
              </p>
              <p className="text-xs text-[#8b8680]">
                {formatTime(order.created_at)}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#e8e4df]/60">
              <div className="flex items-center gap-1.5 text-[#8b8680] mb-2">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Table</span>
              </div>
              <p className="text-sm font-semibold text-[#2d2a26]">
                {order.table_number ? `T${order.table_number}` : 'Takeout'}
              </p>
              <p className="text-xs text-[#8b8680]">{order.table_number ? 'Dine-in' : 'Pickup'}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#e8e4df]/60">
              <div className="flex items-center gap-1.5 text-[#8b8680] mb-2">
                <Users className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Type</span>
              </div>
              <p className="text-sm font-semibold text-[#2d2a26] capitalize">
                {order.order_type === 'group_host' ? 'Group' : 
                 order.order_type === 'group_split' ? 'Split' : 'Solo'}
              </p>
              <p className="text-xs text-[#8b8680]">{order.items.length} items</p>
            </div>
          </div>

          {/* Items */}
          <div>
            <h4 className="text-xs font-bold text-[#2d2a26] tracking-[0.15em] uppercase mb-3">
              Order Items ({order.items.length})
            </h4>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div 
                  key={item.id} 
                  className="relative bg-white rounded-xl p-4 border border-[#e8e4df]/60 shadow-sm"
                >
                  <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[#d4a574]">{item.quantity}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#2d2a26]">{item.item_name}</p>
                      {(item.size_label || item.temperature) && (
                        <p className="text-xs text-[#8b8680] mt-1 flex items-center gap-1">
                          <Coffee className="w-3 h-3" />
                          {[item.size_label, item.temperature].filter(Boolean).join(' • ')}
                        </p>
                      )}
                      {item.special_instructions && (
                        <p className="text-xs text-[#5c5752] italic mt-2 bg-[#faf9f7] px-2 py-1.5 rounded-lg">
                          &ldquo;{item.special_instructions}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#2d2a26]">₱{item.item_total_in_pesos.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment */}
          {order.payment && (
            <div className="relative bg-white rounded-xl p-4 border border-[#e8e4df]/60">
              <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center text-[#d4a574]">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#2d2a26] capitalize">
                      {order.payment.method.replace('_', ' ')}
                    </p>
                    {order.payment.payment_reference && (
                      <p className="text-xs text-[#8b8680] font-mono">
                        {order.payment.payment_reference.slice(0, 16)}
                      </p>
                    )}
                  </div>
                </div>
                {order.payment.status === 'completed' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Paid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#faf9f7] text-[#8b8680] rounded-full text-xs font-medium capitalize">
                    <Clock className="w-3.5 h-3.5" />
                    {order.payment.status}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="relative bg-white rounded-xl p-5 border border-[#e8e4df]/60">
            <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-xl -z-10" />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#8b8680]">Subtotal</span>
                <span className="font-medium text-[#5c5752]">₱{order.subtotal_in_pesos.toFixed(2)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8b8680]">Tax</span>
                  <span className="font-medium text-[#5c5752]">₱{order.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-[#e8e4df]/60 flex items-center justify-between">
                <span className="font-semibold text-[#2d2a26]">Total Amount</span>
                <span className="text-2xl font-bold text-[#d4a574]">₱{order.total_in_pesos.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-white rounded-xl p-4 border border-[#e8e4df]/60">
              <h4 className="text-xs font-bold text-[#2d2a26] tracking-[0.15em] uppercase mb-2">
                Notes
              </h4>
              <p className="text-sm text-[#5c5752]">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-[#e8e4df]/60 bg-white">
          <div className="flex items-center gap-3">
            {/* Delete Order Button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 px-4 py-3.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>

            {/* Reorder Button */}
            <button
              onClick={handleReorder}
              disabled={isReordering}
              className="flex-1 bg-[#2d2a26] hover:bg-[#3d3a36] disabled:bg-[#8b8680] disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isReordering ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Reorder
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteOrder}
        title="Delete This Order?"
        message="This will remove this order from your history. This action cannot be undone."
        confirmText="Delete Order"
        cancelText="Cancel"
        variant="danger"
      />
    </Modal>
  )
}
