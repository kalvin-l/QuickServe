'use client'

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { apiClient } from '../client'
import type { Product } from '@/types/product'
import toast from 'react-hot-toast'

// Query keys
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...productKeys.details(), id] as const,
}

// API functions
async function fetchProducts(filters?: Record<string, any>): Promise<Product[]> {
  // For now, use mock data
  const { products } = await import('@/data/products')
  let filteredProducts = [...products]

  // Apply filters if provided
  if (filters) {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filteredProducts = filteredProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm) ||
          p.description.toLowerCase().includes(searchTerm)
      )
    }
    if (filters.category && filters.category !== 'all') {
      filteredProducts = filteredProducts.filter((p) => p.category === filters.category)
    }
    if (filters.available !== undefined) {
      filteredProducts = filteredProducts.filter((p) =>
        filters.available ? p.available !== false : p.available === false
      )
    }
  }

  return filteredProducts
}

async function fetchProduct(id: string | number): Promise<Product> {
  // For now, use mock data
  const { products } = await import('@/data/products')
  const product = products.find((p) => p.id === id)

  if (!product) {
    throw new Error(`Product with id ${id} not found`)
  }

  return product
}

async function createProduct(data: Partial<Product>): Promise<Product> {
  // TODO: Implement API call
  const response = await apiClient.post<Product>('/products', data)
  return response
}

async function updateProduct(id: string | number, data: Partial<Product>): Promise<Product> {
  // TODO: Implement API call
  const response = await apiClient.put<Product>(`/products/${id}`, data)
  return response
}

async function deleteProduct(id: string | number): Promise<void> {
  // TODO: Implement API call
  await apiClient.delete<void>(`/products/${id}`)
}

async function toggleProductAvailability(id: string | number): Promise<Product> {
  // TODO: Implement API call
  const response = await apiClient.patch<Product>(`/products/${id}/toggle`, {})
  return response
}

// Query hooks
export function useProducts(filters?: Record<string, any>, options?: Omit<UseQueryOptions<Product[], Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: productKeys.list(filters || {}),
    queryFn: () => fetchProducts(filters),
    ...options,
  })
}

export function useProduct(id: string | number, options?: Omit<UseQueryOptions<Product, Error>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProduct(id),
    enabled: !!id,
    ...options,
  })
}

// Mutation hooks
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      toast.success('Product created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create product: ${error.message}`)
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<Product> }) =>
      updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) })
      toast.success('Product updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update product: ${error.message}`)
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      toast.success('Product deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete product: ${error.message}`)
    },
  })
}

export function useToggleProductAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: toggleProductAvailability,
    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) })
      toast.success('Product availability updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update availability: ${error.message}`)
    },
  })
}
