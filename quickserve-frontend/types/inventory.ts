/**
 * Inventory Types
 * Type definitions for inventory management system
 */

// ============================================================================
// Stock Unit Types
// ============================================================================

/**
 * Stock unit types for inventory tracking
 * - Count units: For discrete items (pieces, packs, boxes, dozen)
 * - Volume units: For liquids (milliliters, liters, gallons, fluid ounces)
 * - Weight units: For solids (grams, kilograms, ounces, pounds)
 */
export type StockUnit =
  // Count units (discrete items)
  | 'pcs' | 'pack' | 'box' | 'dozen'
  // Volume units (liquids)
  | 'ml' | 'l' | 'gal' | 'oz_fl'
  // Weight units (solids)
  | 'g' | 'kg' | 'oz' | 'lb'

/**
 * Container type for packaging tracking
 */
export type ContainerType =
  | 'Box' | 'Bottle' | 'Sack' | 'Bag' | 'Case'
  | 'Crate' | 'Drum' | 'Jar' | 'Can' | 'Pouch'

/**
 * Unit type categories
 */
export type UnitType = 'count' | 'volume' | 'weight'

/**
 * Stock status levels
 */
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

// ============================================================================
// Stock Level Interface
// ============================================================================

/**
 * Stock level information for display
 */
export interface StockLevel {
  /** Current stock quantity */
  current: number
  /** Unit of measurement */
  unit: StockUnit
  /** Human-readable unit name */
  unit_display: string
  /** Stock status (in_stock, low_stock, out_of_stock) */
  status: StockStatus
  /** Low stock threshold */
  threshold: number
  /** Stock level as percentage (for progress bars) */
  percentage: number
}

// ============================================================================
// Inventory Item Interface
// ============================================================================

/**
 * Inventory item with full stock information
 */
export interface InventoryItem {
  id: number
  name: string
  description?: string
  category?: {
    id: number
    name: string
  }
  created_at?: string
  updated_at?: string

  // Inventory fields
  stock_quantity: number
  stock_unit: StockUnit
  low_stock_threshold: number
  reorder_level: number
  reorder_quantity: number
  last_restocked_at?: string

  // Computed fields
  stock_status: StockStatus
  stock_level_percentage: number
  unit_display: string
  unit_type: UnitType
  needs_reorder: boolean
  days_since_restock?: number

  // Container tracking (optional)
  container_type?: ContainerType | null
  container_capacity?: number | null
  container_count?: number | null
}

// ============================================================================
// Inventory Stats Interface
// ============================================================================

/**
 * Inventory statistics for dashboard
 */
export interface InventoryStats {
  total_items: number
  in_stock_count: number
  low_stock_count: number
  out_of_stock_count: number
  total_value: number
  categories: {
    name: string
    count: number
  }[]
}

// ============================================================================
// Stock Adjustment Interface
// ============================================================================

/**
 * Stock adjustment request
 */
export interface StockAdjustment {
  /** Quantity to add (positive) or remove (negative) */
  quantity: number
  /** Reason for adjustment */
  reason: string
  /** Optional reference number (order ID, invoice, etc.) */
  reference?: string
}

/**
 * Predefined stock adjustment reasons
 */
export const STOCK_ADJUSTMENT_REASONS = [
  { value: 'sale', label: 'Sale', description: 'Sold to customer' },
  { value: 'restock', label: 'Restock', description: 'Restocked from supplier' },
  { value: 'damage', label: 'Damage', description: 'Item damaged' },
  { value: 'spoilage', label: 'Spoilage', description: 'Item spoiled/expired' },
  { value: 'theft', label: 'Theft', description: 'Item stolen' },
  { value: 'adjustment', label: 'Adjustment', description: 'Manual adjustment' },
  { value: 'return', label: 'Return', description: 'Customer return' },
  { value: 'transfer', label: 'Transfer', description: 'Transferred to/from another location' },
  { value: 'waste', label: 'Waste', description: 'Waste/spillage' },
] as const

export type StockAdjustmentReason = typeof STOCK_ADJUSTMENT_REASONS[number]['value']

// ============================================================================
// Inventory Filters Interface
// ============================================================================

/**
 * Inventory filter options
 */
export interface InventoryFilters {
  /** Search query */
  search: string
  /** Category filter */
  category: string
  /** Stock status filter */
  stockStatus: StockStatus | 'all'
  /** Unit type filter */
  unitType: UnitType | 'all'
  /** Container tracking filter */
  containerTracking: 'all' | 'with_containers' | 'without_containers'
}

// ============================================================================
// API Response Interfaces
// ============================================================================

/**
 * Response from inventory items list endpoint
 */
export interface InventoryListResponse {
  items: InventoryItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Low stock report response
 */
export interface LowStockReport {
  items: InventoryItem[]
  total_count: number
  categories: Record<string, number>
}

/**
 * Bulk restock response
 */
export interface BulkRestockResponse {
  results: Record<number, boolean>
  summary: {
    total: number
    success: number
    failed: number
  }
}

// ============================================================================
// Create Inventory Item Interface
// ============================================================================

/**
 * Input for creating a new inventory item
 */
export interface CreateInventoryItemInput {
  name: string
  description?: string
  category_id?: number | null
  // Inventory fields
  stock_quantity: number
  stock_unit: StockUnit
  low_stock_threshold: number
  reorder_level: number
  reorder_quantity: number
  // Container tracking (optional)
  container_type?: ContainerType | null
  container_capacity?: number | null
}

/**
 * Input for updating an inventory item
 */
export interface UpdateInventoryItemInput {
  name?: string
  description?: string
  category_id?: number | null
  stock_quantity?: number
  stock_unit?: StockUnit
  low_stock_threshold?: number
  reorder_level?: number
  reorder_quantity?: number
  // Container tracking (optional)
  container_type?: ContainerType | null
  container_capacity?: number | null
}

// ============================================================================
// Stock Unit Display Info
// ============================================================================

/**
 * Stock unit metadata for display
 */
export interface StockUnitInfo {
  value: StockUnit
  label: string
  type: UnitType
  icon: string
}

/**
 * Stock units organized by type
 */
export const STOCK_UNITS_BY_TYPE: Record<UnitType, StockUnitInfo[]> = {
  count: [
    { value: 'pcs', label: 'Pieces', type: 'count', icon: '📦' },
    { value: 'pack', label: 'Pack', type: 'count', icon: '📦' },
    { value: 'box', label: 'Box', type: 'count', icon: '📦' },
    { value: 'dozen', label: 'Dozen', type: 'count', icon: '📦' },
  ],
  volume: [
    { value: 'ml', label: 'Milliliters', type: 'volume', icon: '💧' },
    { value: 'l', label: 'Liters', type: 'volume', icon: '💧' },
    { value: 'gal', label: 'Gallons', type: 'volume', icon: '💧' },
    { value: 'oz_fl', label: 'Fl. Oz', type: 'volume', icon: '💧' },
  ],
  weight: [
    { value: 'g', label: 'Grams', type: 'weight', icon: '⚖️' },
    { value: 'kg', label: 'Kilograms', type: 'weight', icon: '⚖️' },
    { value: 'oz', label: 'Ounces', type: 'weight', icon: '⚖️' },
    { value: 'lb', label: 'Pounds', type: 'weight', icon: '⚖️' },
  ],
}

/**
 * Get stock unit info by value
 */
export function getStockUnitInfo(unit: StockUnit): StockUnitInfo | undefined {
  for (const typeUnits of Object.values(STOCK_UNITS_BY_TYPE)) {
    const found = typeUnits.find(u => u.value === unit)
    if (found) return found
  }
  return undefined
}

/**
 * Get all stock units as flat array
 */
export function getAllStockUnits(): StockUnitInfo[] {
  return Object.values(STOCK_UNITS_BY_TYPE).flat()
}

/**
 * Get units by type
 */
export function getUnitsByType(type: UnitType): StockUnitInfo[] {
  return STOCK_UNITS_BY_TYPE[type] || []
}

/**
 * Get display name for unit
 */
export function getUnitDisplay(unit: StockUnit): string {
  const info = getStockUnitInfo(unit)
  return info?.label || unit
}

/**
 * Get unit type
 */
export function getUnitType(unit: StockUnit): UnitType {
  const info = getStockUnitInfo(unit)
  return info?.type || 'count'
}

/**
 * Get unit icon
 */
export function getUnitIcon(unit: StockUnit): string {
  const info = getStockUnitInfo(unit)
  return info?.icon || '📦'
}

/**
 * Format stock quantity with unit
 * Example: "12 L", "150 pcs", "2.5 kg"
 */
export function formatStockQuantity(quantity: number, unit: StockUnit): string {
  const display = getUnitDisplay(unit)
  return `${quantity} ${display}`
}

/**
 * Format currency for inventory values
 */
export function formatInventoryValue(value: number): string {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Get stock status config for badges
 */
export const STOCK_STATUS_CONFIG: Record<StockStatus, {
  label: string
  color: string
  bg: string
  icon: string
}> = {
  in_stock: {
    label: 'In Stock',
    color: 'text-green-600',
    bg: 'bg-green-100',
    icon: '✓',
  },
  low_stock: {
    label: 'Low Stock',
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    icon: '⚠',
  },
  out_of_stock: {
    label: 'Out of Stock',
    color: 'text-red-600',
    bg: 'bg-red-100',
    icon: '✗',
  },
}

/**
 * Get stock status config
 */
export function getStockStatusConfig(status: StockStatus) {
  return STOCK_STATUS_CONFIG[status]
}
