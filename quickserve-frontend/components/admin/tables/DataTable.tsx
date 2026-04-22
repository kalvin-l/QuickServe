'use client'

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  PaginationState,
  SortingState,
  ColumnFiltersState,
  OnChangeFn,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { LoadingPage } from '@/components/ui/loading-spinner/LoadingSpinner'

interface DataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageSize?: number
  pageIndex?: number
  pageCount?: number
  onPageChange?: OnChangeFn<PaginationState>
  onSortingChange?: OnChangeFn<SortingState>
  onFiltersChange?: OnChangeFn<ColumnFiltersState>
  isLoading?: boolean
  enablePagination?: boolean
  enableSorting?: boolean
  enableFiltering?: boolean
  className?: string
  emptyMessage?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageSize = 10,
  pageIndex = 0,
  pageCount = -1,
  onPageChange,
  onSortingChange,
  onFiltersChange,
  isLoading = false,
  enablePagination = true,
  enableSorting = true,
  enableFiltering = true,
  className,
  emptyMessage = 'No data available',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      sorting,
      columnFilters,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater
      setSorting(newSorting)
      onSortingChange?.(newSorting)
    },
    onColumnFiltersChange: (updater) => {
      const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater
      setColumnFilters(newFilters)
      onFiltersChange?.(newFilters)
    },
    onPaginationChange: onPageChange,
    pageCount,
    enableSorting,
    enableFilters: enableFiltering,
    manualPagination: pageCount !== -1,
  })

  if (isLoading) {
    return <LoadingPage text="Loading data..." />
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="rounded-md border border-gray-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-4 py-3 text-left text-sm font-medium text-gray-700',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:bg-gray-100',
                      enableSorting && header.column.getCanSort() && 'cursor-pointer select-none hover:bg-gray-100'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {enableSorting && header.column.getCanSort() && (
                      <span className="ml-2">
                        {{
                          asc: '↑',
                          desc: '↓',
                        }[header.column.getIsSorted() as string] ?? '↕'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm text-gray-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {enablePagination && (
        <TablePagination
          table={table}
          pageCount={pageCount}
          pageIndex={pageIndex}
          pageSize={pageSize}
        />
      )}
    </div>
  )
}

import * as React from 'react'

function TablePagination<TData>({
  table,
  pageCount,
  pageIndex,
  pageSize,
}: {
  table: ReturnType<typeof useReactTable<TData>>
  pageCount: number
  pageIndex: number
  pageSize: number
}) {
  const canPreviousPage = pageIndex > 0
  const canNextPage = pageCount === -1 ? table.getCanNextPage() : pageIndex < pageCount - 1

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex-1 text-sm text-gray-600">
        Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, table.getFilteredRowModel().rows.length)} of{' '}
        {table.getFilteredRowModel().rows.length} results
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => table.previousPage()}
          disabled={!canPreviousPage}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700">
          Page {pageIndex + 1} {pageCount !== -1 && `of ${pageCount}`}
        </span>
        <button
          onClick={() => table.nextPage()}
          disabled={!canNextPage}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export type { ColumnDef }
