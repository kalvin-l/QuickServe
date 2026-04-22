'use client'

import { AdminModal } from '@/components/admin/ui'
import { getCategoryIcon } from '@/lib/utils'
import type { MenuItem } from '@/lib/api/queries/useMenu'

interface MenuDetailsModalProps {
  show: boolean
  item: MenuItem | null
  onClose: () => void
  onEdit: (itemId: string | number) => void
  onToggleAvailability: (item: MenuItem) => void
}

export function MenuDetailsModal({
  show,
  item,
  onClose,
  onEdit,
  onToggleAvailability,
}: MenuDetailsModalProps) {
  if (!item) return null

  const formatPrice = (price: number) => {
    return `₱${price.toFixed(2)}`
  }

  return (
    <AdminModal show={show} title={item.name} onClose={onClose} maxWidth="4xl">
      <div className="space-y-6">
        {/* Item Overview */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Item Image */}
            <div className="space-y-4">
              <div className="relative">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-64 bg-gradient-to-br from-[#ec7813]/20 to-primary-500/20 rounded-lg flex items-center justify-center">
                    <i
                      className={`${getCategoryIcon(item.category?.name?.toLowerCase() || 'uncategorized')} text-6xl text-[#ec7813]/40`}
                    ></i>
                  </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {item.featured && (
                    <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Featured
                    </span>
                  )}
                  {item.popular && (
                    <span className="bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Popular
                    </span>
                  )}
                </div>
                <div className="absolute bottom-3 left-3">
                  <span className="bg-black/70 backdrop-blur text-white px-3 py-1 rounded-full text-sm font-medium">
                    {item.category?.name || 'Uncategorized'}
                  </span>
                </div>
              </div>
            </div>

            {/* Item Details */}
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <i className="fas fa-utensils text-[#ec7813]"></i>
                  Item Details
                </h4>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Price
                  </label>
                  <p className="text-2xl font-bold text-[#ec7813]">
                    {formatPrice(item.price)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Category
                  </label>
                  <p className="text-base text-gray-900">{item.category?.name || 'Uncategorized'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Temperature
                  </label>
                  <div className="flex items-center gap-2">
                    <i
                      className={`fas ${
                        item.temperature === 'Cold'
                          ? 'fa-snowflake text-blue-500'
                          : 'fa-fire text-orange-500'
                      }`}
                    ></i>
                    <p className="text-base text-gray-900">{item.temperature || '-'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Sizes
                  </label>
                  <p className="text-base text-gray-900">1 size</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Availability
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.available ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  ></span>
                  <span
                    className={`text-sm font-medium ${
                      item.available ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {item.available ? 'Available' : 'Out of Stock'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Details */}
        {(item.prep_time || item.notes) && (
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <i className="fas fa-info-circle text-[#ec7813]"></i>
              Additional Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {item.prep_time && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Preparation Time
                  </label>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-clock text-[#ec7813]"></i>
                    <p className="text-base text-gray-900">{item.prep_time}</p>
                  </div>
                </div>
              )}
              {item.notes && (
                <div className={item.prep_time ? '' : 'md:col-span-2'}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Internal Notes
                  </label>
                  <p className="text-base text-gray-900">{item.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
            >
              Close
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggleAvailability(item)}
              className={`px-6 py-2 rounded-xl transition-all font-medium ${
                item.available
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <i className={`fas ${item.available ? 'fa-times' : 'fa-check'}`}></i>
                {item.available ? 'Mark Unavailable' : 'Mark Available'}
              </span>
            </button>
            <button
              onClick={() => {
                onEdit(item.id)
                onClose()
              }}
              className="px-6 py-2 rounded-xl bg-[#ec7813] text-white hover:bg-[#ea580c] transition-all font-medium"
            >
              <span className="flex items-center gap-2">
                <i className="fas fa-edit"></i>
                Edit Item
              </span>
            </button>
          </div>
        </div>
      </div>
    </AdminModal>
  )
}
