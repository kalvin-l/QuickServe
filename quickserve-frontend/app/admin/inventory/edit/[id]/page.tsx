/**
 * Edit Inventory Item Page
 * Form for editing existing inventory items with stock tracking
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Plus, Package, Save, AlertCircle, X } from 'lucide-react'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import FormInput from '@/components/admin/forms/FormInput'
import FormSelect from '@/components/admin/forms/FormSelect'
import FormTextarea from '@/components/admin/forms/FormTextarea'
import CardWrapper from '@/components/admin/ui/CardWrapper'
import { useUpdateInventoryItem, useInventoryItem } from '@/lib/api/queries/useInventory'
import { categoryService } from '@/lib/api/services/categoryService'
import { STOCK_UNITS_BY_TYPE, type StockUnit, type InventoryItem, type ContainerType } from '@/types/inventory'
import { LoadingSpinner } from '@/components/ui/loading-spinner/LoadingSpinner'
import { InlineError } from '@/components/error'

export default function EditInventoryItemPage() {
  const router = useRouter()
  const params = useParams()
  const itemId = Number(params.id)

  const updateMutation = useUpdateInventoryItem()
  const { data: item, isLoading: itemLoading, error: itemError, refetch } = useInventoryItem(itemId, !!itemId)

  // Form state
  const [formData, setFormData] = useState({
    // Basic info
    name: '',
    description: '',
    category_id: '',

    // Stock info
    stock_quantity: '',
    stock_unit: 'pcs' as StockUnit,
    low_stock_threshold: '10',
    reorder_level: '5',
    reorder_quantity: '50',

    // Container tracking (optional)
    container_type: '' as ContainerType | '',
    container_capacity: '',

    // Internal notes
    notes: '',
  })

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Categories state
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  // Create category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)

  // Load categories and populate form when item is loaded
  useEffect(() => {
    loadCategories()
  }, [])

  // Populate form when item data is loaded
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        category_id: item.category?.id ? String(item.category.id) : '',
        stock_quantity: String(item.stock_quantity || 0),
        stock_unit: item.stock_unit || 'pcs',
        low_stock_threshold: String(item.low_stock_threshold || 10),
        reorder_level: String(item.reorder_level || 5),
        reorder_quantity: String(item.reorder_quantity || 50),
        container_type: item.container_type || '',
        container_capacity: item.container_capacity ? String(item.container_capacity) : '',
        notes: item.notes || '',
      })
    }
  }, [item])

  // Function to load categories
  const loadCategories = () => {
    setCategoriesLoading(true)
    categoryService.getCategoriesForSelect('inventory').then(setCategories).finally(() => {
      setCategoriesLoading(false)
    })
  }

  // Categories with "Create new" option
  const categoryOptions = useMemo(() => [
    ...categories,
    { value: 'create_new', label: '+ Create new category...' },
  ], [categories])

  // Calculate form progress
  const formProgress = useMemo(() => {
    const requiredFields = ['name', 'stock_quantity', 'stock_unit']
    const completedFields = requiredFields.filter(field => {
      const value = formData[field as keyof typeof formData]
      return value !== '' && value !== null && value !== undefined
    })
    return Math.round((completedFields.length / requiredFields.length) * 100)
  }, [formData])

  // Get unit options by type
  const unitOptions = useMemo(() => {
    const allUnits = Object.values(STOCK_UNITS_BY_TYPE).flat()
    return allUnits.map(unit => ({ value: unit.value, label: unit.label }))
  }, [])

  // Handle form input change
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  // Handle category change - show modal if "create_new" is selected
  const handleCategoryChange = (value: string) => {
    if (value === 'create_new') {
      setShowCategoryModal(true)
      setNewCategoryName('')
      setCategoryError(null)
    } else {
      handleInputChange('category_id', value)
    }
  }

  // Create new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setCategoryError('Please enter a category name')
      return
    }

    setIsCreatingCategory(true)
    setCategoryError(null)

    try {
      const newCategory = await categoryService.createCategory({
        name: newCategoryName.trim(),
        scope: 'inventory',
      })

      // Reload categories first
      await loadCategories()

      // Set the new category as selected
      const categoryId = String(newCategory.id)
      setFormData(prev => ({ ...prev, category_id: categoryId }))

      // Close modal
      setShowCategoryModal(false)
      setNewCategoryName('')
    } catch (err: any) {
      setCategoryError(err.response?.data?.detail || err.message || 'Failed to create category')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Please enter an item name')
      return false
    }

    if (!formData.stock_quantity || isNaN(Number(formData.stock_quantity)) || Number(formData.stock_quantity) < 0) {
      setError('Please enter a valid stock quantity (0 or greater)')
      return false
    }

    if (!formData.low_stock_threshold || isNaN(Number(formData.low_stock_threshold)) || Number(formData.low_stock_threshold) < 0) {
      setError('Please enter a valid low stock threshold (0 or greater)')
      return false
    }

    if (!formData.reorder_level || isNaN(Number(formData.reorder_level)) || Number(formData.reorder_level) < 0) {
      setError('Please enter a valid reorder level (0 or greater)')
      return false
    }

    if (!formData.reorder_quantity || isNaN(Number(formData.reorder_quantity)) || Number(formData.reorder_quantity) < 1) {
      setError('Please enter a valid reorder quantity (1 or greater)')
      return false
    }

    return true
  }

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category_id: formData.category_id && formData.category_id !== '' ? Number(formData.category_id) : undefined,
        // Menu fields - keep existing values
        price: 0,
        temperature: undefined,
        prep_time: undefined,
        featured: false,
        popular: false,
        available: false,
        notes: formData.notes.trim() || undefined,
        status: 'draft',
        // Inventory fields
        stock_quantity: Number(formData.stock_quantity),
        stock_unit: formData.stock_unit,
        low_stock_threshold: Number(formData.low_stock_threshold),
        reorder_level: Number(formData.reorder_level),
        reorder_quantity: Number(formData.reorder_quantity),
        // Container tracking (optional)
        ...(formData.container_type && { container_type: formData.container_type }),
        ...(formData.container_capacity && { container_capacity: Number(formData.container_capacity) }),
      }

      await updateMutation.mutateAsync({ itemId, data: payload })

      // Redirect to inventory list on success
      router.push('/admin/inventory')
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to update inventory item')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state while fetching item
  if (itemLoading) {
    return (
      <AdminLayout
        pageTitle="Edit Inventory Item"
        pageSubtitle="Update inventory item details and stock settings"
      >
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner type="branded" size="xl" />
          <p className="mt-4 text-[#5c5752]">Loading item...</p>
        </div>
      </AdminLayout>
    )
  }

  // Show error if item not found
  if (itemError) {
    return (
      <AdminLayout
        pageTitle="Edit Inventory Item"
        pageSubtitle="Update inventory item details and stock settings"
      >
        <InlineError
          message="Failed to load inventory item. It may have been deleted."
          onRetry={() => refetch()}
        />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      pageTitle="Edit Inventory Item"
      pageSubtitle={item?.name ? `Editing: ${item.name}` : 'Update inventory item details and stock settings'}
    >
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-[#faf9f7]/95 backdrop-blur-sm border-b border-[#e8e4df]/60 mb-6">
        <div className="flex items-center justify-between">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#5c5752] hover:text-[#2d2a26] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Inventory</span>
          </button>

          {/* Progress indicator */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-[#8b8680]">
              Form Progress: {formProgress}%
            </div>
            <div className="w-32 h-2 bg-[#e8e4df] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#d4a574] transition-all duration-300"
                style={{ width: `${formProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Form Column - 2/3 width */}
        <div className="xl:col-span-2">
          <form id="edit-inventory-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <CardWrapper>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#d4a574]/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#d4a574]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#2d2a26]">Basic Information</h2>
                  <p className="text-sm text-[#8b8680]">Item name, description, and category</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Item Name"
                  placeholder="e.g., House Blend Coffee Beans"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className="md:col-span-2"
                />

                <FormTextarea
                  label="Description"
                  placeholder="Describe this inventory item..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="md:col-span-2"
                />

                <FormSelect
                  label="Category"
                  placeholder="Select a category"
                  value={formData.category_id}
                  onChange={handleCategoryChange}
                  options={categoryOptions}
                  disabled={categoriesLoading}
                  className="md:col-span-2"
                />
              </div>
            </CardWrapper>

            {/* Stock Information Section */}
            <CardWrapper>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#2d2a26]">Stock Information</h2>
                  <p className="text-sm text-[#8b8680]">Current stock, unit type, and alert thresholds</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Current Stock Quantity"
                  type="number"
                  placeholder="0"
                  value={formData.stock_quantity}
                  onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                  min="0"
                  required
                />

                <FormSelect
                  label="Unit of Measurement"
                  value={formData.stock_unit}
                  onChange={(value) => handleInputChange('stock_unit', value)}
                  options={unitOptions}
                  required
                />

                <FormInput
                  label="Low Stock Threshold"
                  type="number"
                  placeholder="10"
                  value={formData.low_stock_threshold}
                  onChange={(e) => handleInputChange('low_stock_threshold', e.target.value)}
                  min="0"
                  required
                />

                <FormInput
                  label="Reorder Level"
                  type="number"
                  placeholder="5"
                  value={formData.reorder_level}
                  onChange={(e) => handleInputChange('reorder_level', e.target.value)}
                  min="0"
                  required
                />

                <FormInput
                  label="Reorder Quantity"
                  type="number"
                  placeholder="50"
                  value={formData.reorder_quantity}
                  onChange={(e) => handleInputChange('reorder_quantity', e.target.value)}
                  min="1"
                  required
                />
              </div>

              {/* Stock Level Info */}
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Stock Levels:</strong> When stock drops to {formData.reorder_level || 5} {formData.stock_unit},
                  it will be marked for reordering. Low stock alert triggers at {formData.low_stock_threshold || 10} {formData.stock_unit}.
                </p>
              </div>
            </CardWrapper>

            {/* Container Tracking Section */}
            <CardWrapper>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#2d2a26]">Container Tracking</h2>
                  <p className="text-sm text-[#8b8680]">Optional: Track stock in boxes, bottles, or other containers</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormSelect
                  label="Container Type"
                  placeholder="None"
                  value={formData.container_type}
                  onChange={(value) => handleInputChange('container_type', value)}
                  options={[
                    { value: '', label: 'None' },
                    { value: 'Box', label: 'Box' },
                    { value: 'Bottle', label: 'Bottle' },
                    { value: 'Sack', label: 'Sack' },
                    { value: 'Bag', label: 'Bag' },
                    { value: 'Case', label: 'Case' },
                    { value: 'Crate', label: 'Crate' },
                    { value: 'Drum', label: 'Drum' },
                    { value: 'Jar', label: 'Jar' },
                    { value: 'Can', label: 'Can' },
                    { value: 'Pouch', label: 'Pouch' },
                  ]}
                  optional
                />
                {formData.container_type ? (
                  <div>
                    <label className="block text-sm font-medium text-[#2d2a26] mb-2">
                      1 {formData.container_type} = <span className="text-[#d4a574]">___ {formData.stock_unit}</span>
                    </label>
                    <input
                      type="number"
                      placeholder="100"
                      value={formData.container_capacity}
                      onChange={(e) => handleInputChange('container_capacity', e.target.value)}
                      min="1"
                      className="w-full px-4 py-2.5 rounded-lg border border-[#e8e4df]/60 bg-white text-[#2d2a26] placeholder:text-[#8b8680] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all"
                    />
                    <p className="text-xs text-[#8b8680] mt-1">
                      How many {formData.stock_unit} fit in one {formData.container_type}?
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-[#8b8680] p-2.5 border border-dashed border-[#e8e4df]/60 rounded-lg">
                    Select a container type first
                  </div>
                )}
              </div>

              {/* Container Configuration Preview */}
              {formData.container_type && formData.container_capacity && (
                <div className="mt-4 p-4 bg-[#f5f0eb] rounded-xl border border-[#e8e4df]/60">
                  <p className="text-sm font-medium text-[#2d2a26] mb-2">
                    ✅ Container Configuration:
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm text-[#8b8680]">
                      1 {formData.container_type} = <span className="font-semibold text-[#2d2a26]">{Number(formData.container_capacity).toLocaleString()} {formData.stock_unit}</span>
                    </p>
                    {formData.stock_quantity && (
                      <p className="text-sm text-[#8b8680]">
                        Current stock ({Number(formData.stock_quantity).toLocaleString()} {formData.stock_unit}) =
                        <span className="font-semibold text-[#d4a574] ml-1">
                          {(Number(formData.stock_quantity) / Number(formData.container_capacity)).toFixed(2)} {formData.container_type}{(Number(formData.stock_quantity) / Number(formData.container_capacity)) !== 1 ? 'es' : ''}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardWrapper>

            {/* Notes Section */}
            <CardWrapper>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Save className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#2d2a26]">Notes</h2>
                  <p className="text-sm text-[#8b8680]">Internal notes for tracking</p>
                </div>
              </div>

              <FormTextarea
                label="Internal Notes"
                placeholder="Add any internal notes about this item (e.g., supplier, location, reorder notes)..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                maxLength={1000}
              />
            </CardWrapper>
          </form>
        </div>

        {/* Sidebar Column - 1/3 width */}
        <div className="xl:col-span-1">
          <div className="sticky top-40 space-y-6">
            {/* Actions Card */}
            <CardWrapper>
              <h3 className="font-semibold text-[#2d2a26] mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  type="submit"
                  form="edit-inventory-form"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg bg-[#d4a574] text-white hover:bg-[#c49a6b] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full px-4 py-3 rounded-lg border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#faf9f7] transition-all font-medium"
                >
                  Cancel
                </button>
              </div>
            </CardWrapper>

            {/* Quick Tips */}
            <CardWrapper>
              <h3 className="font-semibold text-[#2d2a26] mb-4">Quick Tips</h3>
              <ul className="space-y-3 text-sm text-[#5c5752]">
                <li className="flex gap-2">
                  <span className="text-[#d4a574]">•</span>
                  <span>Set low stock threshold to trigger alerts when running low</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#d4a574]">•</span>
                  <span>Reorder level is when the item should be reordered</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#d4a574]">•</span>
                  <span>Reorder quantity is the suggested restock amount</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#d4a574]">•</span>
                  <span>Items are in draft status - publish from menu to sell</span>
                </li>
              </ul>
            </CardWrapper>

            {/* Stock Units Reference */}
            <CardWrapper>
              <h3 className="font-semibold text-[#2d2a26] mb-4">Stock Units</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5c5752]">Count units:</span>
                  <span className="text-[#2d2a26]">pcs, pack, box, dozen</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5c5752]">Volume units:</span>
                  <span className="text-[#2d2a26]">ml, l, gal, fl oz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5c5752]">Weight units:</span>
                  <span className="text-[#2d2a26]">g, kg, oz, lb</span>
                </div>
              </div>
            </CardWrapper>
          </div>
        </div>
      </div>

      {/* Create Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#2d2a26]">Create New Category</h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-[#8b8680] hover:text-[#2d2a26] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {categoryError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {categoryError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2d2a26] mb-2">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Beverages"
                  className="w-full px-4 py-2.5 rounded-lg border border-[#e8e4df]/60 bg-white text-[#2d2a26] placeholder:text-[#8b8680] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 transition-all"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  disabled={isCreatingCategory}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#faf9f7] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCategory}
                  disabled={isCreatingCategory || !newCategoryName.trim()}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#d4a574] text-white hover:bg-[#c49a6b] transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingCategory ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
