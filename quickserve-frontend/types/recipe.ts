// Recipe/Ingredient Types

export type RecipeUnit = 'g' | 'ml' | 'l' | 'kg' | 'pcs' | 'pack' | 'box' | 'dozen' | 'oz' | 'lb' | 'oz_fl' | 'gal'
export type RecipeSize = 'small' | 'medium' | 'large'

export interface RecipeIngredient {
  id: number
  menu_item_id: number
  inventory_item_id: number
  quantity: number  // Base quantity
  unit: string
  priority: number
  // Size multipliers
  multiplier_small?: number
  multiplier_medium?: number
  multiplier_large?: number
  // Computed/calculated fields
  inventory_item_name: string
  inventory_item_unit: string
  current_stock: number
  stock_unit: string
  stock_sufficient: boolean
  // Calculated quantities for display
  quantity_small?: number
  quantity_medium?: number
  quantity_large?: number
}

export interface RecipeIngredientInput {
  inventory_item_id: number
  quantity: number  // Base quantity
  unit: string
  priority?: number
  multiplier_small?: number
  multiplier_medium?: number
  multiplier_large?: number
}

export interface MenuItemWithRecipe {
  id: number
  name: string
  price: number
  ingredients: RecipeIngredient[]
}

export interface RecipeCheckResult {
  can_make: boolean
  insufficient_items: Array<{
    ingredient_name: string
    available: number
    needed: number
    unit: string
  }>
}

export interface RecipeDeductionResult {
  success: boolean
  insufficient_items: Array<{
    menu_item: string
    ingredient: string
    available?: number
    needed?: number
    unit?: string
    error?: string
  }>
}

export interface AllRecipesResponse {
  recipes: Record<number, Array<{
    inventory_item_id: number
    inventory_item_name: string
    quantity: number
    unit: string
    priority: number
  }>>
}
