/**
 * React Query Hooks for Menu Items
 * Uses the menu service to fetch and manage menu data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { menuService } from '../services/menuService'
import { categoryService } from '../services/categoryService'
import type {
  MenuItem,
  MenuItemsParams,
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from '../services/menuService'

// Query keys
export const menuKeys = {
  all: ['menu'] as const,
  items: (params?: MenuItemsParams) => ['menu', 'items', params] as const,
  item: (id: number) => ['menu', 'item', id] as const,
  categories: ['menu', 'categories'] as const,
  addons: (availableOnly: boolean) => ['menu', 'addons', availableOnly] as const,
}

/**
 * Hook to fetch menu items with filters
 */
export function useMenuItems(params: MenuItemsParams = {}) {
  return useQuery({
    queryKey: menuKeys.items(params),
    queryFn: () => menuService.getMenuItems(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch single menu item
 */
export function useMenuItem(id: number) {
  return useQuery({
    queryKey: menuKeys.item(id),
    queryFn: () => menuService.getMenuItem(id),
    enabled: !!id,
  })
}

/**
 * Hook to fetch categories
 */
export function useCategories() {
  return useQuery({
    queryKey: menuKeys.categories,
    queryFn: () => categoryService.getCategories('menu'),
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

/**
 * Hook to fetch addons
 */
export function useAddons(availableOnly = true) {
  return useQuery({
    queryKey: menuKeys.addons(availableOnly),
    queryFn: () => menuService.getAddons(availableOnly),
    staleTime: 1000 * 60 * 15, // 15 minutes
  })
}

/**
 * Hook to create menu item
 */
export function useCreateMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateMenuItemInput) => menuService.createMenuItem(data),
    onSuccess: () => {
      // Invalidate and refetch menu items
      queryClient.invalidateQueries({ queryKey: menuKeys.items() })
    },
  })
}

/**
 * Hook to update menu item
 */
export function useUpdateMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMenuItemInput }) =>
      menuService.updateMenuItem(id, data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: menuKeys.items() })
      queryClient.invalidateQueries({ queryKey: menuKeys.item(variables.id) })
    },
  })
}

/**
 * Hook to delete menu item
 */
export function useDeleteMenuItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => menuService.deleteMenuItem(id),
    onSuccess: () => {
      // Invalidate and refetch menu items
      queryClient.invalidateQueries({ queryKey: menuKeys.items() })
    },
  })
}

/**
 * Hook to toggle availability
 */
export function useToggleAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => menuService.toggleAvailability(id),
    onSuccess: () => {
      // Invalidate and refetch menu items
      queryClient.invalidateQueries({ queryKey: menuKeys.items() })
    },
  })
}

/**
 * Hook to upload image
 */
export function useUploadImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      menuService.uploadImage(id, file),
    onSuccess: (_, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: menuKeys.items() })
      queryClient.invalidateQueries({ queryKey: menuKeys.item(variables.id) })
    },
  })
}

// Export types for use in components
export type { MenuItem, MenuItemsParams, CreateMenuItemInput, UpdateMenuItemInput }

