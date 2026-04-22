/**
 * Table Hooks
 * React Query hooks for table operations with optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tableService } from '../services/tableService'
import type { Table, TableCreate, TableUpdate, TableListParams } from '../types/table'

/**
 * Hook to fetch paginated tables with filters
 */
export function useTables(params?: TableListParams) {
  return useQuery({
    queryKey: ['tables', params],
    queryFn: () => tableService.getAll(params),
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Hook to fetch a single table by ID
 */
export function useTable(id: number) {
  return useQuery({
    queryKey: ['table', id],
    queryFn: () => tableService.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Hook to fetch table statistics
 */
export function useTableStats() {
  return useQuery({
    queryKey: ['table-stats'],
    queryFn: () => tableService.getStats(),
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Hook to create a new table
 */
export function useCreateTable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TableCreate) => tableService.create(data),

    // Optimistic update
    onMutate: async (newTable) => {
      await queryClient.cancelQueries({ queryKey: ['tables'] })

      const previousTables = queryClient.getQueryData(['tables'])

      // Optimistically add to cache
      queryClient.setQueryData(['tables', {}], (old: any) => {
        if (!old) {
          return {
            items: [{
              ...newTable,
              id: Date.now(), // Temporary ID
              occupied: 0,
              available_seats: newTable.capacity,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }],
            total: 1,
          }
        }

        return {
          ...old,
          items: [
            ...old.items,
            {
              ...newTable,
              id: Date.now(), // Temporary ID
              occupied: 0,
              available_seats: newTable.capacity,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          ],
          total: old.total + 1,
        }
      })

      return { previousTables }
    },

    // Rollback on error
    onError: (err, newTable, context) => {
      queryClient.setQueryData(['tables'], context?.previousTables)
    },

    // Refetch on success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['table-stats'] })
    },
  })
}

/**
 * Hook to update a table
 */
export function useUpdateTable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TableUpdate }) =>
      tableService.update(id, data),

    // Optimistic update
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tables'] })
      await queryClient.cancelQueries({ queryKey: ['table', id] })

      const previousTables = queryClient.getQueryData(['tables'])
      const previousTable = queryClient.getQueryData(['table', id])

      // Optimistically update table in list
      queryClient.setQueryData(['tables', {}], (old: any) => {
        if (!old || !old.items) return old
        return {
          ...old,
          items: old.items.map((t: Table) =>
            t.id === id ? { ...t, ...data } : t
          ),
        }
      })

      // Optimistically update single table
      queryClient.setQueryData(['table', id], (old: any) => ({
        ...old,
        ...data,
      }))

      return { previousTables, previousTable }
    },

    // Rollback on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(['tables'], context?.previousTables)
      if (variables.id) {
        queryClient.setQueryData(['table', variables.id], context?.previousTable)
      }
    },

    // Refetch on success
    onSettled: (_, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['table', variables.id] })
      }
      queryClient.invalidateQueries({ queryKey: ['table-stats'] })
    },
  })
}

/**
 * Hook to delete a table
 */
export function useDeleteTable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, hardDelete }: { id: number; hardDelete?: boolean }) =>
      tableService.delete(id, hardDelete),

    // Optimistic update
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['tables'] })

      const previousTables = queryClient.getQueryData(['tables'])

      // Optimistically remove from cache
      queryClient.setQueryData(['tables', {}], (old: any) => {
        if (!old || !old.items) return old
        return {
          ...old,
          items: old.items.filter((t: Table) => t.id !== id),
          total: old.total - 1,
        }
      })

      return { previousTables }
    },

    // Rollback on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(['tables'], context?.previousTables)
    },

    // Refetch on success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['table-stats'] })
    },
  })
}

/**
 * Hook to validate QR code
 */
export function useValidateQR() {
  return useMutation({
    mutationFn: (qrCode: string) => tableService.validateQR(qrCode),
  })
}

/**
 * Hook to regenerate QR codes
 */
export function useRegenerateQR() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => tableService.regenerateQR(id),

    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['table', id] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
  })
}

/**
 * Hook to update table status
 */
export function useUpdateTableStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      tableService.updateStatus(id, status),

    // Optimistic update
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tables'] })
      await queryClient.cancelQueries({ queryKey: ['table', id] })

      const previousTables = queryClient.getQueryData(['tables'])

      // Optimistically update status
      queryClient.setQueryData(['tables', {}], (old: any) => {
        if (!old || !old.items) return old
        return {
          ...old,
          items: old.items.map((t: Table) =>
            t.id === id ? { ...t, status } : t
          ),
        }
      })

      return { previousTables }
    },

    // Rollback on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(['tables'], context?.previousTables)
    },

    // Refetch on success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['table-stats'] })
    },
  })
}

/**
 * Hook to download QR code image
 */
export function useDownloadQR() {
  return useMutation({
    mutationFn: (request: { tableId: number; size: 'small' | 'medium' | 'large'; format: 'png' | 'pdf' }) =>
      tableService.downloadQR(request),
  })
}

/**
 * Hook to download print template
 */
export function useDownloadPrintTemplate() {
  return useMutation({
    mutationFn: (tableId: number) => tableService.downloadPrintTemplate(tableId),
  })
}

/**
 * Hook to download all QR codes
 */
export function useDownloadAllQRs() {
  return useMutation({
    mutationFn: (params: { size?: 'small' | 'medium' | 'large'; location?: string }) =>
      tableService.downloadAllQRs(params.size, params.location),
  })
}

/**
 * Hook to validate access code
 */
export function useValidateAccessCode() {
  return useMutation({
    mutationFn: (accessCode: string) =>
      tableService.validateAccessCode({ access_code: accessCode }),
  })
}

/**
 * Hook to get scan analytics for a table
 */
export function useScanAnalytics(tableId: number) {
  return useQuery({
    queryKey: ['table-analytics', tableId],
    queryFn: () => tableService.getScanAnalytics(tableId),
    enabled: !!tableId,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Hook to set QR expiration
 */
export function useSetQRExpiration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tableId, expiresAt }: { tableId: number; expiresAt: string | null }) =>
      tableService.setQRExpiration(tableId, { expires_at: expiresAt }),

    onSuccess: (_, { tableId }) => {
      queryClient.invalidateQueries({ queryKey: ['table', tableId] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
  })
}
