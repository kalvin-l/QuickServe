/**
 * Table Transfer Selector Component
 *
 * Allows users to select a different table when resuming a paused session.
 * Shows available tables and their locations.
 *
 * Phase 5: UI/UX Polish - Smart Contextual End
 */

import React, { useState, useEffect } from 'react'
import { ArrowLeft, Check, Users, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Table {
  id: number
  table_number: number
  location: string
  capacity: number
  available_seats: number
}

interface TableTransferSelectorProps {
  availableTables: Table[]
  originalTableId: number
  onTableSelect: (tableId: number) => void
  onCancel: () => void
  isLoading?: boolean
}

export function TableTransferSelector({
  availableTables,
  originalTableId,
  onTableSelect,
  onCancel,
  isLoading = false,
}: TableTransferSelectorProps) {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string>('all')

  // Group tables by location
  const locations = ['all', ...Array.from(new Set(availableTables.map((t) => t.location)))]

  // Filter tables by location
  const filteredTables =
    selectedLocation === 'all'
      ? availableTables
      : availableTables.filter((t) => t.location === selectedLocation)

  // Auto-select original table if available
  useEffect(() => {
    if (!selectedTableId && availableTables.length > 0) {
      const originalTable = availableTables.find((t) => t.id === originalTableId)
      if (originalTable) {
        setSelectedTableId(originalTable.id)
      }
    }
  }, [availableTables, originalTableId, selectedTableId])

  const handleTableClick = (tableId: number) => {
    setSelectedTableId(tableId)
  }

  const handleConfirm = () => {
    if (selectedTableId) {
      onTableSelect(selectedTableId)
    }
  }

  const getLocationLabel = (location: string): string => {
    return location.charAt(0).toUpperCase() + location.slice(1)
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">
            Transfer to Different Table
          </h2>
          <p className="text-gray-500 mt-1">
            Choose where to resume your session
          </p>
        </div>
      </div>

      {/* Location Filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {locations.map((location) => (
          <button
            key={location}
            onClick={() => setSelectedLocation(location)}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors',
              selectedLocation === location
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {location === 'all' ? 'All Locations' : getLocationLabel(location)}
          </button>
        ))}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 max-h-80 overflow-y-auto">
        {filteredTables.map((table) => {
          const isSelected = selectedTableId === table.id
          const isOriginal = table.id === originalTableId

          return (
            <button
              key={table.id}
              onClick={() => handleTableClick(table.id)}
              disabled={isLoading}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                'hover:border-blue-300 hover:shadow-md',
                isSelected
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-gray-900">
                      Table {table.table_number}
                    </span>
                    {isOriginal && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {getLocationLabel(table.location)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {table.capacity} seats
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          )
        })}

        {filteredTables.length === 0 && (
          <div className="col-span-2 py-8 text-center text-gray-500">
            <p>No tables available in this location</p>
          </div>
        )}
      </div>

      {/* Confirm Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!selectedTableId || isLoading}
          className={cn(
            'flex-1 px-4 py-3 rounded-xl font-semibold transition-colors',
            selectedTableId
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed',
            isLoading && 'opacity-50'
          )}
        >
          {isLoading ? (
            'Loading...'
          ) : (
            <>
              Resume at Table {filteredTables.find((t) => t.id === selectedTableId)?.table_number || '...'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/**
 * Table Transfer Modal
 * Full-screen modal wrapper for TableTransferSelector
 */
export function TableTransferModal({
  availableTables,
  originalTableId,
  onTableSelect,
  onCancel,
  isLoading,
}: TableTransferSelectorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <TableTransferSelector
        availableTables={availableTables}
        originalTableId={originalTableId}
        onTableSelect={onTableSelect}
        onCancel={onCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
