'use client'

import { Eye, Edit, Check, X, Trash2, Plus, Utensils, Snowflake, Flame } from 'lucide-react'
import { CardWrapper } from '@/components/admin/ui'
import { getCategoryIcon } from '@/lib/utils'
import type { MenuItem } from '@/lib/api/queries/useMenu'

interface MenuGridViewProps {
  items: MenuItem[]
  onViewDetails: (item: MenuItem) => void
  onEdit: (itemId: string | number) => void
  onToggleAvailability: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
}

export function MenuGridView({
  items,
  onViewDetails,
  onEdit,
  onToggleAvailability,
  onDelete,
}: MenuGridViewProps) {
  const formatPrice = (price: number) => {
    return `₱${price.toFixed(2)}`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Menu Item Cards */}
      {items.map((item) => (
        <CardWrapper key={item.id} className="p-0 overflow-hidden">
          <div className="relative group">
            {/* Image */}
            <div className="relative aspect-[3/2] bg-[#f5f0eb] overflow-hidden">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#d4a574]/20 to-[#d4a574]/5">
                  <Utensils className="w-10 h-10 text-[#d4a574]/40" />
                </div>
              )}
              {/* Hover quick actions */}
              <div className="absolute inset-x-3 bottom-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onViewDetails(item)}
                  className="p-1.5 rounded-lg bg-white/90 text-[#5c5752] hover:bg-white transition shadow-sm"
                  title="View"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEdit(item.id)}
                  className="p-1.5 rounded-lg bg-white/90 text-[#5c5752] hover:bg-white transition shadow-sm"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onToggleAvailability(item)}
                  className="p-1.5 rounded-lg bg-white/90 text-[#5c5752] hover:bg-white transition shadow-sm"
                  title={item.available ? 'Mark Unavailable' : 'Mark Available'}
                >
                  {item.available ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => onDelete(item)}
                  className="p-1.5 rounded-lg bg-white/90 text-[#ef4444] hover:bg-white transition shadow-sm"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Header: name + price */}
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-semibold text-lg text-[#2d2a26] truncate flex-1 mr-2 tracking-tight">
                  {item.name}
                </h4>
                <span className="text-xl font-bold text-[#d4a574]">{formatPrice(item.price_in_pesos)}</span>
              </div>

              {/* Description */}
              <p className="text-[#5c5752] text-sm line-clamp-2 mb-4 leading-relaxed">
                {item.description}
              </p>

              {/* Category and Temperature badges */}
              <div className="flex items-center gap-2 mb-4">
                {item.category ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f5f0eb] text-[#5c5752] rounded-full text-xs font-medium">
                    <span className="text-sm">{getCategoryIcon(item.category.name.toLowerCase())}</span>
                    {item.category.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f5f0eb] text-[#5c5752] rounded-full text-xs font-medium">
                    <Utensils className="w-3.5 h-3.5" />
                    Uncategorized
                  </span>
                )}
                {item.temperature && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f5f0eb] text-[#5c5752] rounded-full text-xs font-medium">
                    {item.temperature === 'Cold' ? <Snowflake className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5" />}
                    {item.temperature}
                  </span>
                )}
              </div>

              {/* Availability */}
              <div className="flex items-center justify-between pt-3 border-t border-[#e8e4df]/60">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${item.available ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}></span>
                  <span className="text-sm font-medium text-[#5c5752]">
                    {item.available ? 'Available' : 'Out of Stock'}
                  </span>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={item.available}
                    onChange={() => onToggleAvailability(item)}
                  />
                  <span
                    className={`w-11 h-6 rounded-full relative transition-colors ${
                      item.available ? 'bg-[#22c55e]' : 'bg-[#e8e4df]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        item.available ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    ></span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </CardWrapper>
      ))}

      {/* Add New Item Card */}
      <div
        onClick={() => window.location.href = '/admin/menu/create'}
        className="bg-[#f5f0eb] border-2 border-dashed border-[#e8e4df] rounded-2xl min-h-[420px] flex items-center justify-center hover:border-[#d4a574] hover:bg-[#ebe5de] transition-all cursor-pointer group"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white border border-[#e8e4df]/60 flex items-center justify-center group-hover:bg-[#d4a574]/10 group-hover:border-[#d4a574]/30 transition-all">
            <Plus className="w-7 h-7 text-[#8b8680] group-hover:text-[#d4a574] transition-colors" />
          </div>
          <p className="font-medium text-[#5c5752] group-hover:text-[#2d2a26] transition-colors">Add New Item</p>
          <p className="text-sm text-[#8b8680] mt-1">Click to add a new menu item</p>
        </div>
      </div>
    </div>
  )
}
