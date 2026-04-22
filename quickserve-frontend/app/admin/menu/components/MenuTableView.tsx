'use client'

import { Eye, Edit, Check, X, Trash2, Utensils, Star, Heart } from 'lucide-react'
import TableActionsDropdown, { type Action } from '@/components/admin/ui/TableActionsDropdown'
import type { MenuItem } from '@/lib/api/queries/useMenu'

interface MenuTableViewProps {
  items: MenuItem[]
  onViewDetails: (item: MenuItem) => void
  onEdit: (itemId: string | number) => void
  onToggleAvailability: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
}

export function MenuTableView({
  items,
  onViewDetails,
  onEdit,
  onToggleAvailability,
  onDelete,
}: MenuTableViewProps) {
  const formatPrice = (price: number) => {
    return `₱${price.toFixed(2)}`
  }

  // Get menu item actions for TableActionsDropdown
  const getMenuActions = (item: MenuItem): Action[] => {
    return [
      {
        key: 'view',
        label: 'View Details',
        icon: Eye,
        onClick: () => onViewDetails(item),
      },
      {
        key: 'edit',
        label: 'Edit',
        icon: Edit,
        onClick: () => onEdit(item.id),
      },
      {
        key: 'toggle',
        label: item.available ? 'Mark Unavailable' : 'Mark Available',
        icon: item.available ? X : Check,
        colorClass: item.available
          ? 'text-[#f59e0b] hover:bg-[#fef3c7]'
          : 'text-[#22c55e] hover:bg-[#f0fdf4]',
        onClick: () => onToggleAvailability(item),
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        colorClass: 'text-[#ef4444] hover:bg-[#fef2f2]',
        onClick: () => onDelete(item),
      },
    ]
  }

  return (
    <div className="relative bg-white rounded-2xl shadow-sm overflow-hidden border border-[#e8e4df]/60">
      <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10"></div>
      {items.length === 0 ? (
        <div className="p-12 text-center">
          <Utensils className="w-10 h-10 text-[#e8e4df] mx-auto mb-4" />
          <p className="text-[#8b8680]">No menu items found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e8e4df]/60">
            <thead className="bg-[#faf9f7]">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                  Temperature
                </th>
                <th className="px-6 py-3 text-right text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#e8e4df]/60">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-[#faf9f7] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="shrink-0 h-12 w-12">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-12 w-12 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#d4a574]/20 to-[#d4a574]/5 flex items-center justify-center">
                            <Utensils className="w-5 h-5 text-[#d4a574]/60" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-[#2d2a26]">{item.name}</div>
                        <div className="text-xs text-[#8b8680] line-clamp-1 max-w-50">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-[#2d2a26]">{item.category?.name || 'Uncategorized'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-[#d4a574]">
                      {formatPrice(item.price_in_pesos)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.available ? 'bg-[#f0fdf4] text-[#22c55e]' : 'bg-[#fef2f2] text-[#ef4444]'
                        }`}
                      >
                        {item.available ? 'Available' : 'Out of Stock'}
                      </span>
                      {item.featured && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#fef3c7] text-[#f59e0b]">
                          <Star className="w-3 h-3" />Featured
                        </span>
                      )}
                      {item.popular && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#fdf2f8] text-[#ec4899]">
                          <Heart className="w-3 h-3" />Popular
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b8680]">
                    {item.temperature || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <TableActionsDropdown actions={getMenuActions(item)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
