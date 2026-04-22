'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Trash2, Plus, Save, Utensils, Folder, Puzzle, Beaker, Settings, Search, Image as ImageIcon, Coffee, Cake, PlusCircle, Box } from 'lucide-react'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { categoryService } from '@/lib/api/services/categoryService'
import { addonService } from '@/lib/api/services/addonService'
import { inventoryService } from '@/lib/api/services/inventoryService'
import { recipeService } from '@/lib/api/services/recipeService'
import type { RecipeIngredient } from '@/types/recipe'
import { LoadingSpinner } from '@/components/ui/loading-spinner/LoadingSpinner'

interface Ingredient {
  id: number | null
  inventory_item_id: number
  inventory_item_name: string
  quantity: number
  unit: string
  priority: number
  multiplier_small?: number
  multiplier_medium?: number
  multiplier_large?: number
}

interface Addon {
  id: number
  name: string
  price: number
  category: string
}

interface MenuItem {
  id: number
  name: string
  description: string
  category_id: number | null
  price: number
  temperature: string | null
  prep_time: string | null
  size_labels: any
  featured: boolean
  popular: boolean
  available: boolean
  image_url: string | null
  notes: string | null
  addon_ids: number[]
  addons?: Array<{
    id: number
    name: string
    price: number
    price_in_pesos: number
    category: string
  }>
}

const temperatureOptions = [
  { value: 'Hot', label: 'Hot' },
  { value: 'Cold', label: 'Cold' },
  { value: 'Both', label: 'Hot & Cold' }
]

const sizeOptions = [
  { value: '1', label: '1 Size (Regular)' },
  { value: '2', label: '2 Sizes (Small, Large)' },
  { value: '3', label: '3 Sizes (Small, Medium, Large)' },
  { value: '4', label: '4 Sizes (XS, S, M, L)' },
  { value: '5', label: '5 Sizes (XS, S, M, L, XL)' }
]

const sizePresetMap: Record<string, string[]> = {
  '1': ['Regular'],
  '2': ['Small', 'Large'],
  '3': ['Small', 'Medium', 'Large'],
  '4': ['XS', 'S', 'M', 'L'],
  '5': ['XS', 'S', 'M', 'L', 'XL']
}

export default function EditMenuPage() {
  const params = useParams()
  const router = useRouter()
  const menuItemId = params.id as string

  const [menuItem, setMenuItem] = useState<MenuItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([])

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    price: '',
    temperature: 'Hot',
    prep_time: '',
    size_preset: '3',
    size_labels: ['Small', 'Medium', 'Large'],
    featured: false,
    popular: false,
    available: true,
    image: null as File | null,
    notes: '',
    addon_ids: [] as number[],
    ingredients: [] as Ingredient[]
  })

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newSize, setNewSize] = useState('')
  const [showNewSize, setShowNewSize] = useState(false)
  const [customSizeOptions, setCustomSizeOptions] = useState<typeof sizeOptions>([])
  const [addonSearch, setAddonSearch] = useState('')
  const [showNewAddon, setShowNewAddon] = useState(false)
  const [newAddonName, setNewAddonName] = useState('')
  const [newAddonPrice, setNewAddonPrice] = useState('')
  const [newAddonCategory, setNewAddonCategory] = useState('Extras')
  const [allAddons, setAllAddons] = useState<Addon[]>([])
  const [isLoadingAddons, setIsLoadingAddons] = useState(true)
  const [inventoryItems, setInventoryItems] = useState<Array<{ id: number; name: string; stock_quantity: number; stock_unit: string }>>([])
  const [isLoadingInventory, setIsLoadingInventory] = useState(true)
  const [showIngredientModal, setShowIngredientModal] = useState(false)
  const [newIngredient, setNewIngredient] = useState<Ingredient>({
    id: null,
    inventory_item_id: 0,
    inventory_item_name: '',
    quantity: 1,
    unit: 'g',
    priority: 0,
    multiplier_small: 0.8,
    multiplier_medium: 1.0,
    multiplier_large: 1.2
  })

  // Derive addon categories from allAddons
  const addonCategories = useMemo(() => {
    const categories = new Set(allAddons.map(addon => addon.category))
    return Array.from(categories).sort()
  }, [allAddons])

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getCategoriesForSelect('menu')
        setCategories(data)
      } catch (error) {
        console.error('Failed to fetch categories:', error)
        // Fallback to empty array
        setCategories([])
      }
    }
    fetchCategories()
  }, [])

  // Load menu item data
  useEffect(() => {
    const loadMenuItemData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`http://localhost:8000/api/menu/${menuItemId}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.detail || `Menu item ${menuItemId} not found`)
        }

        const data: MenuItem = await response.json()
        setMenuItem(data)

        // Convert price from cents to pesos for display
        const priceInPesos = data.price ? (data.price / 100).toString() : '0'

        // Parse size_labels if it's an object
        let sizePreset = '3'
        let sizeLabels = ['Small', 'Medium', 'Large']
        if (data.size_labels && typeof data.size_labels === 'object') {
          if (data.size_labels.labels && Array.isArray(data.size_labels.labels)) {
            sizeLabels = data.size_labels.labels
            sizePreset = data.size_labels.preset || '3'
          } else if (Array.isArray(data.size_labels)) {
            sizeLabels = data.size_labels
          }
        }

        // Extract addon IDs from data.addons
        const addonIds = data.addons?.map((addon: any) => addon.id) || []

        setFormData({
          name: data.name,
          description: data.description || '',
          category_id: data.category_id ? data.category_id.toString() : '',
          price: priceInPesos,
          temperature: data.temperature || 'Hot',
          prep_time: data.prep_time || '',
          size_preset: sizePreset,
          size_labels: sizeLabels,
          featured: data.featured,
          popular: data.popular,
          available: data.available,
          image: null,
          notes: data.notes || '',
          addon_ids: addonIds,
          ingredients: [], // Will be loaded separately
        })

        // Set image preview if exists
        if (data.image_url) {
          setImagePreview(data.image_url)
        }
      } catch (error) {
        console.error('Failed to load menu item:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to load menu item'
        alert(`${errorMessage}\n\nThe menu item may have been deleted or doesn't exist.`)
        router.push('/admin/menu')
      } finally {
        setIsLoading(false)
      }
    }

    if (menuItemId) {
      loadMenuItemData()
    }
  }, [menuItemId, router])

  // Fetch addons
  useEffect(() => {
    const fetchAddons = async () => {
      try {
        setIsLoadingAddons(true)
        const data = await addonService.getAddons(true)
        const transformedAddons: Addon[] = data.addons.map(addon => ({
          id: addon.id,
          name: addon.name,
          price: addon.price_in_pesos,
          category: addon.category
        }))
        setAllAddons(transformedAddons)
      } catch (error) {
        console.error('Failed to fetch addons:', error)
        setAllAddons([])
      } finally {
        setIsLoadingAddons(false)
      }
    }
    fetchAddons()
  }, [])

  // Fetch inventory items (for recipe ingredients)
  useEffect(() => {
    const fetchInventoryItems = async () => {
      try {
        setIsLoadingInventory(true)
        const data = await inventoryService.getInventoryItems({ page: 1, page_size: 100 })
        const items = data.items.map(item => ({
          id: item.id,
          name: item.name,
          stock_quantity: item.stock_quantity,
          stock_unit: item.stock_unit
        }))
        setInventoryItems(items)
      } catch (error) {
        console.error('Failed to fetch inventory items:', error)
        setInventoryItems([])
      } finally {
        setIsLoadingInventory(false)
      }
    }
    fetchInventoryItems()
  }, [])

  // Fetch existing ingredients for this menu item
  useEffect(() => {
    const fetchIngredients = async () => {
      if (!menuItemId) return
      try {
        const ingredients = await recipeService.getMenuItemIngredients(parseInt(menuItemId))
        const mappedIngredients: Ingredient[] = ingredients.map(ing => ({
          id: ing.id,
          inventory_item_id: ing.inventory_item_id,
          inventory_item_name: ing.inventory_item_name,
          quantity: ing.quantity,
          unit: ing.unit,
          priority: ing.priority,
          multiplier_small: ing.multiplier_small,
          multiplier_medium: ing.multiplier_medium,
          multiplier_large: ing.multiplier_large
        }))
        setFormData(prev => ({ ...prev, ingredients: mappedIngredients }))
      } catch (error) {
        console.error('Failed to fetch ingredients:', error)
        setFormData(prev => ({ ...prev, ingredients: [] }))
      }
    }
    fetchIngredients()
  }, [menuItemId])

  // Size preset effect
  const handleSizePresetChange = (value: string) => {
    if (sizePresetMap[value]) {
      setFormData(prev => ({
        ...prev,
        size_preset: value,
        size_labels: sizePresetMap[value]
      }))
    }
  }

  // Category change
  const handleCategoryChange = (value: string) => {
    if (value === 'add_new') {
      setShowNewCategory(true)
      setFormData(prev => ({ ...prev, category_id: '' }))
    } else {
      setShowNewCategory(false)
      setFormData(prev => ({ ...prev, category_id: value }))
    }
  }

  // Add new category
  const addNewCategory = async () => {
    const name = newCategory.trim()
    if (!name) return

    try {
      // Create category via API
      const newCategory = await categoryService.createCategory({
        name,
        scope: 'menu'
      })

      // Refresh categories list
      const updatedCategories = await categoryService.getCategoriesForSelect('menu')
      setCategories(updatedCategories)

      // Set the new category as selected
      setFormData(prev => ({ ...prev, category_id: String(newCategory.id) }))
      setShowNewCategory(false)
      setNewCategory('')
      alert(`Category "${name}" added successfully!`)
    } catch (error: any) {
      console.error('Failed to create category:', error)
      alert(error.message || 'Failed to create category')
    }
  }

  // Size change
  const handleSizeChange = (value: string) => {
    if (value === 'add_new') {
      setShowNewSize(true)
      setFormData(prev => ({ ...prev, size_preset: '' }))
    } else {
      setShowNewSize(false)
      handleSizePresetChange(value)
    }
  }

  // Add new size
  const addNewSize = () => {
    if (!newSize.trim()) return

    const newValue = `custom_${customSizeOptions.length + 1}`
    const labels = newSize.split(',').map(s => s.trim())

    setCustomSizeOptions(prev => [...prev, { value: newValue, label: newSize }])
    setFormData(prev => ({
      ...prev,
      size_preset: newValue,
      size_labels: labels
    }))
    setShowNewSize(false)
    setNewSize('')
  }

  // Image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (JPG, PNG, GIF, or WebP)')
      return
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File size must be less than 10MB')
      return
    }

    setFormData(prev => ({ ...prev, image: file }))

    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Clear image
  const clearImage = () => {
    setImagePreview(null)
    setFormData(prev => ({ ...prev, image: null }))
    const input = document.getElementById('image-upload') as HTMLInputElement
    if (input) input.value = ''
  }

  // Submit
  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.price || !formData.description) {
      alert('Please fill in all required fields.')
      return
    }

    setIsSaving(true)

    try {
      // Prepare update data
      const updateData: any = {
        name: formData.name,
        description: formData.description,
        price: Math.round(parseFloat(formData.price) * 100), // Convert to cents
        temperature: formData.temperature,
        prep_time: formData.prep_time || null,
        size_labels: formData.size_preset ? {
          preset: formData.size_preset,
          labels: formData.size_labels
        } : null,
        featured: formData.featured,
        popular: formData.popular,
        available: formData.available,
        notes: formData.notes || null,
        addon_ids: formData.addon_ids,
      }

      // Include category_id if selected
      if (formData.category_id) {
        updateData.category_id = parseInt(formData.category_id)
      }

      // Update menu item
      const response = await fetch(`http://localhost:8000/api/menu/${menuItemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update menu item')
      }

      // If image was selected, upload it
      if (formData.image) {
        const imageFormData = new FormData()
        imageFormData.append('file', formData.image)

        const imageResponse = await fetch(`http://localhost:8000/api/menu/${menuItemId}/image`, {
          method: 'POST',
          body: imageFormData,
        })

        if (!imageResponse.ok) {
          const error = await imageResponse.json()
          console.error('Image upload failed:', error)
          alert('Menu item updated, but image upload failed: ' + (error.detail || 'Unknown error'))
        }
      }

      // Save new ingredients (those without an id)
      for (const ingredient of formData.ingredients || []) {
        if (!ingredient.id) {
          try {
            await recipeService.addIngredient(parseInt(menuItemId), {
              inventory_item_id: ingredient.inventory_item_id,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              priority: ingredient.priority,
              multiplier_small: ingredient.multiplier_small,
              multiplier_medium: ingredient.multiplier_medium,
              multiplier_large: ingredient.multiplier_large
            })
          } catch (error) {
            console.error('Failed to add ingredient:', ingredient, error)
          }
        }
      }

      alert(`Menu item "${formData.name}" has been updated successfully!`)
      router.push('/admin/menu')
    } catch (error) {
      console.error('Error updating menu item:', error)
      alert(error instanceof Error ? error.message : 'Failed to update menu item')
    } finally {
      setIsSaving(false)
    }
  }

  // Addon handlers
  const toggleAddon = (addonId: number) => {
    setFormData(prev => {
      const isSelected = prev.addon_ids.includes(addonId)
      return {
        ...prev,
        addon_ids: isSelected
          ? prev.addon_ids.filter(id => id !== addonId)
          : [...prev.addon_ids, addonId]
      }
    })
  }

  const isAddonSelected = (addonId: number) => {
    return formData.addon_ids.includes(addonId)
  }

  const selectAllAddons = () => {
    setFormData(prev => ({
      ...prev,
      addon_ids: allAddons.map(addon => addon.id)
    }))
  }

  const clearAllAddons = () => {
    setFormData(prev => ({
      ...prev,
      addon_ids: []
    }))
  }

  const addNewAddon = async () => {
    const name = newAddonName.trim()
    const price = parseFloat(newAddonPrice)

    if (!name || isNaN(price) || price < 0) {
      alert('Please fill in all fields correctly')
      return
    }

    try {
      const newAddon = await addonService.createAddon({
        name,
        price,
        category: newAddonCategory,
        available: true,
        max_quantity: 3
      })

      const transformedAddon: Addon = {
        id: newAddon.id,
        name: newAddon.name,
        price: newAddon.price_in_pesos,
        category: newAddon.category
      }

      setAllAddons(prevAddons => [...prevAddons, transformedAddon])
      setFormData(prev => ({
        ...prev,
        addon_ids: [...prev.addon_ids, newAddon.id]
      }))

      setShowNewAddon(false)
      setNewAddonName('')
      setNewAddonPrice('')
      setNewAddonCategory('Extras')

      alert(`Addon "${name}" added successfully and selected!`)
    } catch (error: any) {
      console.error('Failed to create addon:', error)
      alert(error.message || 'Failed to create addon')
    }
  }

  // Ingredient handlers
  const openIngredientModal = () => {
    if (inventoryItems.length === 0) {
      alert('No inventory items available. Please create inventory items first.')
      return
    }
    setShowIngredientModal(true)
  }

  const addIngredient = () => {
    if (!newIngredient.inventory_item_id || newIngredient.quantity <= 0) {
      alert('Please select an inventory item and enter a valid quantity')
      return
    }
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ...newIngredient, id: null }]
    }))
    setShowIngredientModal(false)
    setNewIngredient({
      id: null,
      inventory_item_id: 0,
      inventory_item_name: '',
      quantity: 1,
      unit: 'g',
      priority: 0,
      multiplier_small: 0.8,
      multiplier_medium: 1.0,
      multiplier_large: 1.2
    })
  }

  const updateIngredient = async (ingredient: Ingredient) => {
    // If it's a new ingredient (no id), add it via API
    if (!ingredient.id) {
      try {
        await recipeService.addIngredient(parseInt(menuItemId), {
          inventory_item_id: ingredient.inventory_item_id,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          priority: ingredient.priority,
          multiplier_small: ingredient.multiplier_small,
          multiplier_medium: ingredient.multiplier_medium,
          multiplier_large: ingredient.multiplier_large
        })
        // Refresh ingredients
        const ingredients = await recipeService.getMenuItemIngredients(parseInt(menuItemId))
        const mappedIngredients: Ingredient[] = ingredients.map(ing => ({
          id: ing.id,
          inventory_item_id: ing.inventory_item_id,
          inventory_item_name: ing.inventory_item_name,
          quantity: ing.quantity,
          unit: ing.unit,
          priority: ing.priority,
          multiplier_small: ing.multiplier_small,
          multiplier_medium: ing.multiplier_medium,
          multiplier_large: ing.multiplier_large
        }))
        setFormData(prev => ({ ...prev, ingredients: mappedIngredients }))
      } catch (error: any) {
        console.error('Failed to add ingredient:', error)
        alert(error.message || 'Failed to add ingredient')
      }
    }
  }

  const removeIngredient = async (ingredientId: number) => {
    try {
      await recipeService.removeIngredient(ingredientId)
      setFormData(prev => ({
        ...prev,
        ingredients: prev.ingredients.filter(ing => ing.id !== ingredientId)
      }))
    } catch (error: any) {
      console.error('Failed to remove ingredient:', error)
      alert(error.message || 'Failed to remove ingredient')
    }
  }

  // Filtered and grouped addons
  const filteredGroupedAddons = useMemo(() => {
    const filtered = allAddons.filter(addon =>
      addon.name.toLowerCase().includes(addonSearch.toLowerCase()) ||
      addon.category.toLowerCase().includes(addonSearch.toLowerCase())
    )

    const grouped: Record<string, Addon[]> = {}
    filtered.forEach(addon => {
      if (!grouped[addon.category]) {
        grouped[addon.category] = []
      }
      grouped[addon.category].push(addon)
    })

    return grouped
  }, [allAddons, addonSearch])

  const goBack = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <AdminLayout
        pageTitle="Loading..."
        pageSubtitle="Please wait"
      >
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner type="branded" size="xl" />
          <p className="mt-4 text-[#5c5752]">Loading menu item data...</p>
        </div>
      </AdminLayout>
    )
  }

  if (!menuItem) {
    return null
  }

  const FormSection = ({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: any }) => (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[#d4a574]/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#d4a574]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#2d2a26]">{title}</h3>
          <p className="text-sm text-[#8b8680]">{subtitle}</p>
        </div>
      </div>
    </div>
  )

  const FormCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-2xl border-2 border-[#e8e4df]/60 p-6 ${className}`}>
      {children}
    </div>
  )

  const FormInput = ({ label, ...props }: any) => (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-[#2d2a26]">{label}</label>
      <input
        {...props}
        className="w-full px-4 py-3 rounded-xl border-2 border-[#e8e4df]/60 focus:border-[#d4a574] focus:outline-none transition-colors text-[#2d2a26] placeholder:text-[#8b8680]/50"
      />
    </div>
  )

  const FormSelect = ({ label, value, onChange, options, required }: any) => (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-[#2d2a26]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-3 rounded-xl border-2 border-[#e8e4df]/60 focus:border-[#d4a574] focus:outline-none transition-colors text-[#2d2a26] bg-white"
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )

  const FormTextarea = ({ label, value, onChange, rows, showCharCount, maxLength, required }: any) => (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-[#2d2a26]">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e)}
        rows={rows}
        maxLength={maxLength}
        required={required}
        className="w-full px-4 py-3 rounded-xl border-2 border-[#e8e4df]/60 focus:border-[#d4a574] focus:outline-none transition-colors resize-none text-[#2d2a26] placeholder:text-[#8b8680]/50"
      />
      {showCharCount && (
        <div className="text-right text-xs text-[#8b8680]">
          {value.length} / {maxLength}
        </div>
      )}
    </div>
  )

  return (
    <AdminLayout
      pageTitle={`Edit: ${menuItem.name}`}
      pageSubtitle="Update menu item details"
    >
      {/* Back Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4 mb-6">
        <button
          onClick={goBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#f5f0eb] transition-all font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </button>
      </div>

      <form onSubmit={submitForm} className="space-y-6">
        {/* Basic Information */}
        <FormCard>
          <FormSection
            title="Basic Information"
            subtitle="Essential details about your menu item"
            icon={Utensils}
          />

          {/* Image Upload */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-[#2d2a26] mb-4">Item Image</label>
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl border-2 border-dashed border-[#e8e4df]/60 bg-[#f5f0eb]/30">
              <div className="shrink-0">
                <div className="w-48 h-32 rounded-xl bg-[#f5f0eb] border-2 border-[#e8e4df]/60 flex items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Item Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-[#8b8680]" />
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="image-upload"
                      onChange={handleImageUpload}
                    />
                    <div className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-dashed border-[#d4a574]/50 text-[#d4a574] hover:border-[#d4a574] hover:bg-[#d4a574]/10 transition-all font-medium cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Upload Image</span>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="px-6 py-3 rounded-xl border-2 border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#f5f0eb] transition-all font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </span>
                  </button>
                </div>
                <div className="text-sm text-[#8b8680]">
                  <p>• Recommended: 800x600px or larger</p>
                  <p>• Supported formats: JPG, PNG, GIF, WebP</p>
                  <p>• Maximum file size: 10MB</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FormInput
              label="Item Name"
              type="text"
              placeholder="Enter item name (e.g., Iced Brown Sugar Latte)"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <FormInput
              label="Price (₱)"
              type="number"
              placeholder="0.00"
              min={0}
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              required
            />
          </div>

          <div className="mt-6">
            <FormTextarea
              label="Description"
              placeholder="Describe your menu item, ingredients, and what makes it special..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              maxLength={500}
              showCharCount={true}
              required={true}
            />
          </div>
        </FormCard>

        {/* Category & Details */}
        <FormCard>
          <FormSection
            title="Category & Details"
            subtitle="Categorization and serving information"
            icon={Folder}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <FormSelect
                label="Category"
                value={formData.category_id}
                onChange={handleCategoryChange}
                options={[...categories, { value: 'add_new', label: '+ Add New Category' }]}
              />

              {showNewCategory && (
                <div className="space-y-3 mt-4 p-4 bg-[#f5f0eb]/50 rounded-xl border-2 border-dashed border-[#d4a574]/30">
                  <FormInput
                    type="text"
                    placeholder="Enter new category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={addNewCategory}
                      className="px-4 py-2 bg-[#d4a574] text-white rounded-xl hover:bg-[#c49665] transition-all text-sm font-bold"
                    >
                      <span className="flex items-center gap-2">
                        <Plus className="w-3 h-3" />
                        Add Category
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategory(false)
                        setNewCategory('')
                      }}
                      className="px-4 py-2 bg-[#e8e4df] text-[#5c5752] rounded-xl hover:bg-[#d4cdbd] transition-all text-sm font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <FormSelect
              label="Temperature"
              value={formData.temperature}
              onChange={(value) => setFormData(prev => ({ ...prev, temperature: value }))}
              options={temperatureOptions}
              required={true}
            />

            <FormSelect
              label="Available Sizes"
              value={formData.size_preset}
              onChange={handleSizeChange}
              options={[...sizeOptions, ...customSizeOptions]}
              required={true}
            />

            <FormInput
              label="Preparation Time"
              type="text"
              placeholder="e.g., 3-5 minutes"
              value={formData.prep_time}
              onChange={(e) => setFormData(prev => ({ ...prev, prep_time: e.target.value }))}
            />
          </div>
        </FormCard>

        {/* Available Add-ons */}
        <FormCard>
          <FormSection
            title="Available Add-ons"
            subtitle="Select customization options available for this menu item"
            icon={Puzzle}
          />

          {allAddons.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-8 bg-[#f5f0eb]/30 rounded-2xl border-2 border-dashed border-[#e8e4df]/60">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#f5f0eb] flex items-center justify-center">
                  <Puzzle className="w-8 h-8 text-[#8b8680]" />
                </div>
                <h3 className="text-lg font-bold text-[#2d2a26] mb-2">No add-ons available</h3>
                <p className="text-[#5c5752] mb-4">Create add-ons first to assign them to menu items</p>
                <button
                  type="button"
                  onClick={() => setShowNewAddon(true)}
                  className="px-4 py-2 bg-[#d4a574] text-white rounded-xl hover:bg-[#c49665] transition-all text-sm font-bold"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Create Your First Add-on
                </button>
              </div>

              {showNewAddon && (
                <div className="space-y-3 p-4 bg-[#f5f0eb]/50 rounded-xl border-2 border-dashed border-[#d4a574]/30">
                  <h4 className="text-sm font-bold text-[#2d2a26]">Create New Add-on</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FormInput
                      type="text"
                      label="Addon Name"
                      placeholder="e.g., Extra Shot"
                      value={newAddonName}
                      onChange={(e) => setNewAddonName(e.target.value)}
                    />
                    <FormInput
                      type="number"
                      label="Price (₱)"
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                      value={newAddonPrice}
                      onChange={(e) => setNewAddonPrice(e.target.value)}
                    />
                    <div>
                      <label className="block text-sm font-semibold text-[#2d2a26] mb-2">Category</label>
                      <select
                        value={newAddonCategory}
                        onChange={(e) => setNewAddonCategory(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-[#e8e4df]/60 focus:border-[#d4a574] focus:outline-none transition-colors text-[#2d2a26] bg-white"
                      >
                        {addonCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={addNewAddon}
                      className="px-4 py-2 bg-[#d4a574] text-white rounded-xl hover:bg-[#c49665] transition-all text-sm font-bold"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      Add Addon
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewAddon(false)
                        setNewAddonName('')
                        setNewAddonPrice('')
                        setNewAddonCategory('Extras')
                      }}
                      className="px-4 py-2 border-2 border-[#e8e4df]/60 text-[#5c5752] rounded-xl hover:bg-[#f5f0eb] transition-all text-sm font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8680] w-4 h-4" />
                  <input
                    type="search"
                    placeholder="Search add-ons..."
                    value={addonSearch}
                    onChange={(e) => setAddonSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-[#e8e4df]/60 focus:border-[#d4a574] focus:outline-none transition-colors text-[#2d2a26] placeholder:text-[#8b8680]/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllAddons}
                    className="px-3 py-2 text-sm rounded-xl border-2 border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#f5f0eb] transition-all font-bold"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearAllAddons}
                    className="px-3 py-2 text-sm rounded-xl border-2 border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#f5f0eb] transition-all font-bold"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewAddon(true)}
                    className="px-3 py-2 text-sm rounded-xl bg-[#d4a574] text-white hover:bg-[#c49665] transition-all font-bold"
                  >
                    <Plus className="w-3 h-3 inline mr-1" />
                    Add New
                  </button>
                  <span className="text-sm text-[#8b8680] ml-2 font-medium">
                    {formData.addon_ids.length} selected
                  </span>
                </div>
              </div>

              {showNewAddon && (
                <div className="space-y-3 p-4 bg-[#f5f0eb]/50 rounded-xl border-2 border-dashed border-[#d4a574]/30 mb-6">
                  <h4 className="text-sm font-bold text-[#2d2a26]">Create New Add-on</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FormInput
                      type="text"
                      label="Addon Name"
                      placeholder="e.g., Extra Shot"
                      value={newAddonName}
                      onChange={(e) => setNewAddonName(e.target.value)}
                    />
                    <FormInput
                      type="number"
                      label="Price (₱)"
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                      value={newAddonPrice}
                      onChange={(e) => setNewAddonPrice(e.target.value)}
                    />
                    <div>
                      <label className="block text-sm font-semibold text-[#2d2a26] mb-2">Category</label>
                      <select
                        value={newAddonCategory}
                        onChange={(e) => setNewAddonCategory(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-[#e8e4df]/60 focus:border-[#d4a574] focus:outline-none transition-colors text-[#2d2a26] bg-white"
                      >
                        {addonCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={addNewAddon}
                      className="px-4 py-2 bg-[#d4a574] text-white rounded-xl hover:bg-[#c49665] transition-all text-sm font-bold"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      Add Addon
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewAddon(false)
                        setNewAddonName('')
                        setNewAddonPrice('')
                        setNewAddonCategory('Extras')
                      }}
                      className="px-4 py-2 border-2 border-[#e8e4df]/60 text-[#5c5752] rounded-xl hover:bg-[#f5f0eb] transition-all text-sm font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {Object.entries(filteredGroupedAddons).map(([category, categoryAddons]) => (
                  <div key={category}>
                    <h4 className="text-sm font-bold text-[#2d2a26] mb-3 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#d4a574]/10 flex items-center justify-center">
                        {getCategoryIcon(category) === 'flask' && <Coffee className="w-3 h-3 text-[#d4a574]" />}
                        {getCategoryIcon(category) === 'plus-circle' && <PlusCircle className="w-3 h-3 text-[#d4a574]" />}
                        {getCategoryIcon(category) === 'birthday-cake' && <Cake className="w-3 h-3 text-[#d4a574]" />}
                      </div>
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoryAddons.map((addon) => (
                        <label
                          key={addon.id}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isAddonSelected(addon.id)
                              ? 'border-[#d4a574] bg-[#d4a574]/10'
                              : 'border-[#e8e4df]/60 hover:border-[#d4a574]/50 hover:bg-[#f5f0eb]/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAddonSelected(addon.id)}
                            onChange={() => toggleAddon(addon.id)}
                            className="w-5 h-5 rounded text-[#d4a574] focus:ring-[#d4a574] focus:ring-2"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold text-[#2d2a26] block truncate">{addon.name}</span>
                            <span className="text-xs text-[#8b8680]">+₱{addon.price.toFixed(2)}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {Object.keys(filteredGroupedAddons).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[#8b8680]">No add-ons match your search</p>
                </div>
              )}
            </>
          )}
        </FormCard>

        {/* Recipe Ingredients */}
        <FormCard>
          <FormSection
            title="Recipe Ingredients"
            subtitle="Inventory items used to make this menu item"
            icon={Beaker}
          />

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#8b8680]">Add inventory items to track stock usage when orders are placed</p>
            <button
              type="button"
              onClick={openIngredientModal}
              className="px-4 py-2 rounded-xl bg-[#d4a574] text-white hover:bg-[#c49665] transition-all text-sm font-bold"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Add Ingredient
            </button>
          </div>

          {!formData.ingredients || formData.ingredients.length === 0 ? (
            <div className="text-center py-8 bg-[#f5f0eb]/30 rounded-2xl border-2 border-dashed border-[#e8e4df]/60">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#f5f0eb] flex items-center justify-center">
                <Beaker className="w-8 h-8 text-[#8b8680]" />
              </div>
              <h3 className="text-lg font-bold text-[#2d2a26] mb-2">No ingredients added</h3>
              <p className="text-sm text-[#5c5752] mb-4">Add inventory items to track stock usage</p>
              <button
                type="button"
                onClick={openIngredientModal}
                className="px-4 py-2 bg-[#d4a574] text-white rounded-xl hover:bg-[#c49665] transition-all text-sm font-bold"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Add First Ingredient
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.ingredients?.map((ingredient, index) => {
                const inventoryItem = inventoryItems.find(item => item.id === ingredient.inventory_item_id)
                return (
                  <div
                    key={ingredient.id || index}
                    className="flex items-center justify-between p-4 rounded-xl border-2 border-[#e8e4df]/60 bg-[#f5f0eb]/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#d4a574]/10 flex items-center justify-center">
                        <Box className="w-5 h-5 text-[#d4a574]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#2d2a26]">{ingredient.inventory_item_name}</h4>
                        <p className="text-sm text-[#8b8680]">
                          {ingredient.quantity} {ingredient.unit}
                          {inventoryItem && (
                            <span className="ml-2">
                              (Stock: {inventoryItem.stock_quantity} {inventoryItem.stock_unit})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {ingredient.id && (
                      <button
                        type="button"
                        onClick={() => removeIngredient(ingredient.id!)}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-all"
                        title="Remove ingredient"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Ingredient Modal */}
          {showIngredientModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-[#2d2a26] mb-4 flex items-center gap-2">
                  <Beaker className="w-5 h-5 text-[#d4a574]" />
                  Add Ingredient
                </h3>

                <div className="space-y-4">
                  {/* Inventory Item Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-[#2d2a26] mb-2">Inventory Item</label>
                    <select
                      value={newIngredient.inventory_item_id ? newIngredient.inventory_item_id.toString() : ""}
                      onChange={(e) => {
                        const item = inventoryItems.find(i => i.id === parseInt(e.target.value))
                        setNewIngredient(prev => ({
                          ...prev,
                          inventory_item_id: parseInt(e.target.value),
                          inventory_item_name: item?.name || '',
                          unit: item?.stock_unit || 'g'
                        }))
                      }}
                      className="w-full px-4 py-3 rounded-xl border-2 border-[#e8e4df]/60 focus:border-[#d4a574] focus:outline-none transition-colors text-[#2d2a26] bg-white"
                    >
                      <option value="">Select an item...</option>
                      {inventoryItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.stock_quantity} {item.stock_unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Base Quantity Input (Medium) */}
                  <div>
                    <label className="block text-sm font-semibold text-[#2d2a26] mb-2">
                      Base Quantity (for Medium)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={newIngredient.quantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        setNewIngredient(prev => ({
                          ...prev,
                          quantity: val
                        }))
                      }}
                      className="w-full px-4 py-3 rounded-xl border-2 border-[#e8e4df]/60 focus:border-[#d4a574] focus:outline-none transition-colors text-[#2d2a26]"
                      placeholder="e.g., 200"
                    />
                  </div>

                  {/* Size Multipliers */}
                  <div className="bg-[#f5f0eb]/50 rounded-xl p-4 space-y-3">
                    <label className="block text-sm font-semibold text-[#2d2a26]">
                      Size Multipliers
                      <span className="text-xs text-[#8b8680] font-normal ml-2">(percentage of base quantity)</span>
                    </label>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-[#8b8680] mb-1">Small</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={newIngredient.multiplier_small || 0.8}
                            onChange={(e) => setNewIngredient(prev => ({ ...prev, multiplier_small: parseFloat(e.target.value) || 0.8 }))}
                            className="w-full px-3 py-2 rounded-lg border-2 border-[#e8e4df]/60 focus:border-[#d4a574] focus:outline-none transition-colors text-sm text-[#2d2a26] pr-8"
                            placeholder="0.8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8b8680] pointer-events-none">×</span>
                        </div>
                        <p className="text-xs text-[#8b8680] mt-1">
                          = {Math.round((newIngredient.multiplier_small || 0.8) * newIngredient.quantity)}{newIngredient.unit}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs text-[#8b8680] mb-1">Medium</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={newIngredient.multiplier_medium || 1.0}
                            onChange={(e) => setNewIngredient(prev => ({ ...prev, multiplier_medium: parseFloat(e.target.value) || 1.0 }))}
                            className="w-full px-3 py-2 rounded-lg border-2 border-[#e8e4df]/60 focus:border-[#d4a574] focus:outline-none transition-colors text-sm text-[#2d2a26] pr-8"
                            placeholder="1.0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8b8680] pointer-events-none">×</span>
                        </div>
                        <p className="text-xs text-[#8b8680] mt-1">
                          = {Math.round((newIngredient.multiplier_medium || 1.0) * newIngredient.quantity)}{newIngredient.unit}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs text-[#8b8680] mb-1">Large</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={newIngredient.multiplier_large || 1.2}
                            onChange={(e) => setNewIngredient(prev => ({ ...prev, multiplier_large: parseFloat(e.target.value) || 1.2 }))}
                            className="w-full px-3 py-2 rounded-lg border-2 border-[#e8e4df]/60 focus:border-[#d4a574] focus:outline-none transition-colors text-sm text-[#2d2a26] pr-8"
                            placeholder="1.2"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8b8680] pointer-events-none">×</span>
                        </div>
                        <p className="text-xs text-[#8b8680] mt-1">
                          = {Math.round((newIngredient.multiplier_large || 1.2) * newIngredient.quantity)}{newIngredient.unit}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-[#8b8680]">
                      Example: 200ml base × 0.8 = 160ml small
                    </p>
                  </div>

                  {/* Unit Input */}
                  <div>
                    <label className="block text-sm font-semibold text-[#2d2a26] mb-2">Unit</label>
                    <select
                      value={newIngredient.unit}
                      onChange={(e) => setNewIngredient(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border-2 border-[#e8e4df]/60 focus:border-[#d4a574] focus:outline-none transition-colors text-[#2d2a26] bg-white"
                    >
                      <option value="g">Grams (g)</option>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="ml">Milliliters (ml)</option>
                      <option value="l">Liters (l)</option>
                      <option value="pcs">Pieces (pcs)</option>
                      <option value="oz">Ounces (oz)</option>
                      <option value="lb">Pounds (lb)</option>
                    </select>
                  </div>

                  {/* Priority Input */}
                  <div>
                    <label className="block text-sm font-semibold text-[#2d2a26] mb-2">Priority</label>
                    <input
                      type="number"
                      min="0"
                      value={newIngredient.priority}
                      onChange={(e) => setNewIngredient(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 rounded-xl border-2 border-[#e8e4df]/60 focus:border-[#d4a574] focus:outline-none transition-colors text-[#2d2a26]"
                      placeholder="0 = highest priority"
                    />
                    <p className="text-xs text-[#8b8680] mt-1">Lower numbers = added first</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowIngredientModal(false)
                      setNewIngredient({
                        id: null,
                        inventory_item_id: 0,
                        inventory_item_name: '',
                        quantity: 1,
                        unit: 'g',
                        priority: 0,
                        multiplier_small: 0.8,
                        multiplier_medium: 1.0,
                        multiplier_large: 1.2
                      })
                    }}
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#f5f0eb] transition-all font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="flex-1 px-4 py-3 rounded-xl bg-[#d4a574] text-white hover:bg-[#c49665] transition-all font-bold"
                  >
                    Add Ingredient
                  </button>
                </div>
              </div>
            </div>
          )}
        </FormCard>

        {/* Settings & Status */}
        <FormCard>
          <FormSection
            title="Settings & Status"
            subtitle="Item visibility and promotional settings"
            icon={Settings}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 border-[#e8e4df]/60 hover:bg-[#f5f0eb]/30 transition-all">
                <input
                  type="checkbox"
                  checked={formData.available}
                  onChange={(e) => setFormData(prev => ({ ...prev, available: e.target.checked }))}
                  className="w-5 h-5 rounded text-[#d4a574] focus:ring-[#d4a574] focus:ring-2"
                />
                <div>
                  <span className="text-sm font-bold text-[#2d2a26] block">Available</span>
                  <span className="text-xs text-[#8b8680]">Item is available for ordering</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 border-[#e8e4df]/60 hover:bg-[#f5f0eb]/30 transition-all">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                  className="w-5 h-5 rounded text-[#d4a574] focus:ring-[#d4a574] focus:ring-2"
                />
                <div>
                  <span className="text-sm font-bold text-[#2d2a26] block">Featured Item</span>
                  <span className="text-xs text-[#8b8680]">Highlight this item prominently</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 border-[#e8e4df]/60 hover:bg-[#f5f0eb]/30 transition-all">
                <input
                  type="checkbox"
                  checked={formData.popular}
                  onChange={(e) => setFormData(prev => ({ ...prev, popular: e.target.checked }))}
                  className="w-5 h-5 rounded text-[#d4a574] focus:ring-[#d4a574] focus:ring-2"
                />
                <div>
                  <span className="text-sm font-bold text-[#2d2a26] block">Popular Item</span>
                  <span className="text-xs text-[#8b8680]">Mark as a customer favorite</span>
                </div>
              </label>
            </div>

            <div>
              <FormTextarea
                label="Internal Notes"
                placeholder="Add any internal notes about this menu item..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                showCharCount={false}
                required={false}
              />
            </div>
          </div>
        </FormCard>

        {/* Footer Actions */}
        <FormCard>
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
            <button
              type="button"
              onClick={goBack}
              className="w-full sm:w-auto px-8 py-3 rounded-xl border-2 border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#f5f0eb] transition-all font-bold"
            >
              <span className="flex items-center justify-center gap-2">
                <ArrowLeft className="w-5 h-5" />
                Cancel
              </span>
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#d4a574] text-white hover:bg-[#c49665] hover:shadow-lg transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-2">
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </span>
            </button>
          </div>
        </FormCard>
      </form>
    </AdminLayout>
  )
}
