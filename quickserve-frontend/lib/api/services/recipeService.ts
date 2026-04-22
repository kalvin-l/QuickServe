/**
 * Recipe Service
 * Handles all recipe/ingredient API calls to FastAPI backend
 */

import { apiClient } from '../client'
import type {
  RecipeIngredient,
  RecipeIngredientInput,
  RecipeCheckResult,
  RecipeDeductionResult,
  AllRecipesResponse
} from '@/types/recipe'

class RecipeService {
  /**
   * Get ingredients for a menu item
   */
  async getMenuItemIngredients(menuItemId: number): Promise<RecipeIngredient[]> {
    return apiClient.get<RecipeIngredient[]>(`/recipes/menu-items/${menuItemId}/ingredients`)
  }

  /**
   * Add ingredient to menu item
   */
  async addIngredient(
    menuItemId: number,
    ingredient: RecipeIngredientInput
  ): Promise<RecipeIngredient> {
    return apiClient.post<RecipeIngredient>(
      `/recipes/menu-items/${menuItemId}/ingredients`,
      {
        ...ingredient,
        // Ensure multipliers have defaults
        multiplier_small: ingredient.multiplier_small ?? 0.8,
        multiplier_medium: ingredient.multiplier_medium ?? 1.0,
        multiplier_large: ingredient.multiplier_large ?? 1.2
      }
    )
  }

  /**
   * Update ingredient
   */
  async updateIngredient(
    ingredientId: number,
    updates: {
      quantity?: number
      unit?: string
      priority?: number
    }
  ): Promise<{ success: boolean; id: number }> {
    const params = new URLSearchParams()
    if (updates.quantity !== undefined) params.set('quantity', updates.quantity.toString())
    if (updates.unit !== undefined) params.set('unit', updates.unit)
    if (updates.priority !== undefined) params.set('priority', updates.priority.toString())

    return apiClient.patch<{ success: boolean; id: number }>(
      `/recipes/ingredients/${ingredientId}?${params.toString()}`
    )
  }

  /**
   * Remove ingredient
   */
  async removeIngredient(ingredientId: number): Promise<void> {
    return apiClient.delete<void>(`/recipes/ingredients/${ingredientId}`)
  }

  /**
   * Check inventory availability for a menu item
   */
  async checkInventoryAvailability(
    menuItemId: number,
    quantity: number = 1
  ): Promise<RecipeCheckResult> {
    return apiClient.get<RecipeCheckResult>(
      `/recipes/menu-items/${menuItemId}/check-inventory?quantity=${quantity}`
    )
  }

  /**
   * Deduct inventory for a menu item (usually called by order system)
   */
  async deductInventory(
    menuItemId: number,
    quantity: number = 1
  ): Promise<RecipeDeductionResult> {
    return apiClient.post<RecipeDeductionResult>(
      `/recipes/menu-items/${menuItemId}/deduct-inventory?quantity=${quantity}`
    )
  }

  /**
   * Get all recipes for order processing (internal use)
   */
  async getAllRecipes(): Promise<AllRecipesResponse> {
    return apiClient.get<AllRecipesResponse>('/recipes/all-recipes')
  }
}

// Export singleton instance
export const recipeService = new RecipeService()
