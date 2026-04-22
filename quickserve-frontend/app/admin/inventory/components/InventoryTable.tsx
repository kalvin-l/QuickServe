/**
 * Inventory Table Component
 * Table view of inventory items with stock levels and actions
 */

'use client'

import { Eye, Edit, Plus, Minus, Package, Utensils, Box } from 'lucide-react'
import TableActionsDropdown, { type Action } from '@/components/admin/ui/TableActionsDropdown'
import type { InventoryItem } from '@/types/inventory'
import { getStockStatusConfig, formatStockQuantity } from '@/types/inventory'

interface InventoryTableProps {
  items: InventoryItem[]
  onViewDetails: (item: InventoryItem) => void
  onEdit: (itemId: number) => void
  onAdjustStock: (item: InventoryItem) => void
  onRestock: (item: InventoryItem) => void
}

export function InventoryTable({
  items,
  onViewDetails,
  onEdit,
  onAdjustStock,
  onRestock,
}: InventoryTableProps) {
  // Get table actions for each item
  const getInventoryActions = (item: InventoryItem): Action[] => {
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
        key: 'adjust',
        label: 'Adjust Stock',
        icon: Plus,
        colorClass: 'text-[#d4a574] hover:bg-[#f5f0eb]',
        onClick: () => onAdjustStock(item),
      },
      {
        key: 'restock',
        label: 'Restock',
        icon: Package,
        colorClass: 'text-[#22c55e] hover:bg-[#f0fdf4]',
        onClick: () => onRestock(item),
      },
    ]
  }

  // Format price
  const formatPrice = (price: number) => {
    return `₱${price.toFixed(2)}`
  }

  // Get stock level bar width
  const getStockLevelWidth = (item: InventoryItem) => {
    const percentage = Math.min(item.stock_level.percentage, 100)
    return `${percentage}%`
  }

  // Get stock level bar color
  const getStockLevelColor = (item: InventoryItem) => {
    const status = item.stock_level.status
    if (status === 'out_of_stock') return 'bg-[#ef4444]'
    if (status === 'low_stock') return 'bg-[#f59e0b]'
    return 'bg-[#22c55e]'
  }

  return (
    <div className="relative bg-white rounded-2xl shadow-sm overflow-hidden border border-[#e8e4df]/60">
      <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-[#d4a574]/5 rounded-2xl -z-10"></div>

      {items.length === 0 ? (
        <div className="p-12 text-center">
          <Utensils className="w-10 h-10 text-[#e8e4df] mx-auto mb-4" />
          <p className="text-[#8b8680]">No inventory items found</p>
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
                  Stock & Containers
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-[10px] font-medium text-[#8b8680] uppercase tracking-[0.15em]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#e8e4df]/60">
              {items.map((item) => {
                const statusConfig = getStockStatusConfig(item.stock_level.status)
                return (
                  <tr key={item.id} className="hover:bg-[#faf9f7] transition-colors">
                    {/* Item Name and Image */}
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
                          {item.description && (
                            <div className="text-xs text-[#8b8680] line-clamp-1 max-w-50">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-[#2d2a26]">
                        {item.category?.name || 'Uncategorized'}
                      </span>
                    </td>

                    {/* Stock Level */}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {/* Items WITH containers - prominent display */}
                        {item.container_type && item.container_capacity ? (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-[#f8f5ef] to-[#f0e9e4] border border-[#e8e4df]/60">
                            {/* Container badge */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#d4a574] text-white text-xs shadow-sm">
                                <Box className="w-4 h-4" />
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-[#5c5752] mb-0.5">Container</div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-bold text-[#2d2a26]">
                                    {item.container_capacity.toLocaleString()} {item.stock_unit}
                                  </span>
                                  <span className="text-xs text-[#8b8680]">/</span>
                                  <span className="text-sm font-medium text-[#d4a574]">
                                    {item.container_type}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Total containers */}
                            {item.container_count !== null && item.container_count !== undefined && (
                              <div className="ml-9 pl-2 border-l-2 border-[#e8e4df]/40">
                                <div className="text-xs text-[#5c5752]">Total</div>
                                <div className="text-base font-bold text-[#2d2a26]">
                                  {item.container_count} {item.container_type}
                                  {item.container_count !== 1 ? 'es' : ''}
                                </div>
                              </div>
                            )}

                            {/* Stock quantity */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#e8e4df]/40">
                            <span className="text-xs text-[#5c5752]">Current Stock</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-[#2d2a26]">
                                {item.stock_quantity.toLocaleString()}
                              </span>
                              <span className="text-xs text-[#8b8680]">{item.stock_unit}</span>
                            </div>
                          </div>
                        </div>
                        ) : (
                          /* Items WITHOUT containers - regular display */
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-base font-semibold text-[#2d2a26]">
                                  {item.stock_quantity.toLocaleString()}
                                </span>
                                <span className="text-sm text-[#8b8680]">{item.stock_unit}</span>
                              </div>
                              <div className="text-xs text-[#5c5752] mt-0.5">
                                Reorder at: {item.low_stock_threshold} {item.stock_unit}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Progress Bar */}
                        <div className="w-full bg-[#e8e4df]/60 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${getStockLevelColor(item)} transition-all`}
                            style={{ width: getStockLevelWidth(item) }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Unit */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#faf9f7] text-[#2d2a26] text-xs font-medium">
                        {item.stock_level.unit_display}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </span>
                        {item.needs_reorder && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#fef3c7] text-[#f59e0b]">
                            <Package className="w-3 h-3" />
                            Reorder
                          </span>
                        )}
                        {item.container_type && item.container_capacity && (
                          <span className="text-xs text-[#5c5752]">
                            📦 {item.container_type}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <TableActionsDropdown actions={getInventoryActions(item)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
