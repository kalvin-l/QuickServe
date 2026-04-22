'use client'

import { useState, useMemo, useEffect } from 'react'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import CardWrapper from '@/components/admin/ui/CardWrapper'
import FormInput from '@/components/admin/forms/FormInput'
import FormSelect from '@/components/admin/forms/FormSelect'
import FormTextarea from '@/components/admin/forms/FormTextarea'
import { categoryService } from '@/lib/api/services/categoryService'
import { sizePresetService } from '@/lib/api/services/sizePresetService'
import { addonService } from '@/lib/api/services/addonService'
import { inventoryService } from '@/lib/api/services/inventoryService'
import { recipeService } from '@/lib/api/services/recipeService'
import type { RecipeIngredientInput } from '@/types/recipe'

interface Ingredient {
  inventory_item_id: number
  inventory_item_name: string
  quantity: number  // Base quantity
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

interface FormSection {
  id: string
  title: string
  subtitle: string
  icon: string
  isComplete: boolean
}

// Static data
const temperatureOptions = [
  { value: 'Hot', label: 'Hot' },
  { value: 'Cold', label: 'Cold' },
  { value: 'Both', label: 'Hot & Cold' }
]

const inventoryItems = [
  { id: 1, name: 'Espresso Beans', unit: 'kg', recipe_unit: 'g', conversion_factor: 1000, unit_price: 450 },
  { id: 2, name: 'Whole Milk', unit: 'L', recipe_unit: 'ml', conversion_factor: 1000, unit_price: 85 },
  { id: 3, name: 'Sugar', unit: 'kg', recipe_unit: 'g', conversion_factor: 1000, unit_price: 65 },
  { id: 4, name: 'Chocolate Syrup', unit: 'L', recipe_unit: 'ml', conversion_factor: 1000, unit_price: 320 },
  { id: 5, name: 'Vanilla Syrup', unit: 'L', recipe_unit: 'ml', conversion_factor: 1000, unit_price: 280 }
]

const addonCategories = ['Extras', 'Milk', 'Toppings', 'Syrups']

const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    'Milk': 'flask',
    'Extras': 'plus-circle',
    'Toppings': 'birthday-cake',
    'Syrups': 'coffee',
    'Sweeteners': 'cubes'
  }
  return icons[category] || 'puzzle-piece'
}

const getCategoryDisplayIcon = (categoryName: string) => {
  const icons: Record<string, string> = {
    'coffee': 'fa-coffee',
    'tea': 'fa-leaf',
    'pastries': 'fa-birthday-cake',
    'meals': 'fa-utensils',
    'desserts': 'fa-ice-cream',
    'drinks': 'fa-glass-water',
    'snacks': 'fa-cookie-bite'
  }
  return icons[categoryName.toLowerCase()] || 'fa-utensils'
}

export default function CreateMenuPage() {
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

  // Validation errors state
  const [errors, setErrors] = useState({
    name: '',
    description: '',
    category_id: '',
    price: '',
    temperature: '',
    prep_time: '',
    size_preset: '',
    image: '',
    notes: ''
  })

  // Track touched fields
  const [touched, setTouched] = useState({
    name: false,
    description: false,
    category_id: false,
    price: false,
    temperature: false,
    prep_time: false,
    size_preset: false,
    image: false,
    notes: false
  })

  // Track if form has been submitted
  const [formSubmitted, setFormSubmitted] = useState(false)

  // New Category form validation
  const [newCategoryError, setNewCategoryError] = useState('')

  // New Size Preset form validation
  const [newSizePresetNameError, setNewSizePresetNameError] = useState('')
  const [newSizeLabelsError, setNewSizeLabelsError] = useState('')

  // New Addon form validation
  const [newAddonNameError, setNewAddonNameError] = useState('')
  const [newAddonPriceError, setNewAddonPriceError] = useState('')

  // Validation rules
  const validateField = (name: string, value: any): string => {
    switch (name) {
      case 'name':
        if (!value || value.trim() === '') {
          return 'Item name is required'
        }
        if (value.trim().length < 2) {
          return 'Name must be at least 2 characters'
        }
        if (value.trim().length > 255) {
          return 'Name must not exceed 255 characters'
        }
        return ''

      case 'description':
        if (!value || value.trim() === '') {
          return 'Description is required'
        }
        if (value.trim().length < 10) {
          return 'Description must be at least 10 characters'
        }
        if (value.length > 1000) {
          return 'Description must not exceed 1000 characters'
        }
        return ''

      case 'category_id':
        if (!value || value === '') {
          return 'Please select a category'
        }
        return ''

      case 'price':
        if (!value || value === '') {
          return 'Price is required'
        }
        const numPrice = parseFloat(value)
        if (isNaN(numPrice)) {
          return 'Please enter a valid price'
        }
        if (numPrice < 0) {
          return 'Price cannot be negative'
        }
        if (numPrice > 99999.99) {
          return 'Price cannot exceed ₱99,999.99'
        }
        return ''

      case 'temperature':
        if (!value || value === '') {
          return 'Please select a temperature option'
        }
        return ''

      case 'size_preset':
        if (!value || value === '') {
          return 'Please select size options'
        }
        return ''

      case 'prep_time':
        if (value && value.length > 50) {
          return 'Prep time must not exceed 50 characters'
        }
        // Optional format validation (e.g., "5-10 mins", "3-5 minutes")
        if (value && value.trim() !== '' && !/^\d+(\s*-\s*\d+)?(\s*(mins?|minutes?|hrs?|hours?))?$/.test(value.trim())) {
          return 'Invalid format. Use: "5-10 mins" or "3-5 minutes"'
        }
        return ''

      case 'notes':
        if (value && value.length > 1000) {
          return 'Notes must not exceed 1000 characters'
        }
        return ''

      case 'image':
        // Image is optional, but if provided, validate it
        return ''

      default:
        return ''
    }
  }

  const validateForm = (): boolean => {
    const newErrors = {
      name: validateField('name', formData.name),
      description: validateField('description', formData.description),
      category_id: validateField('category_id', formData.category_id),
      price: validateField('price', formData.price),
      temperature: validateField('temperature', formData.temperature),
      prep_time: validateField('prep_time', formData.prep_time),
      size_preset: validateField('size_preset', formData.size_preset),
      image: validateField('image', formData.image),
      notes: validateField('notes', formData.notes)
    }

    setErrors(newErrors)
    return Object.values(newErrors).every(error => error === '')
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Validate on change if field has been touched or form was submitted
    if (touched[field as keyof typeof touched] || formSubmitted) {
      const error = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }

  const handleFieldBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, formData[field as keyof typeof formData])
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const [activeSection, setActiveSection] = useState('basic')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newSizePresetName, setNewSizePresetName] = useState('')
  const [newSizeLabels, setNewSizeLabels] = useState('')
  const [newSizeIsDefault, setNewSizeIsDefault] = useState(false)
  const [showNewSize, setShowNewSize] = useState(false)
  const [addonSearch, setAddonSearch] = useState('')
  const [showNewAddon, setShowNewAddon] = useState(false)
  const [newAddonName, setNewAddonName] = useState('')
  const [newAddonPrice, setNewAddonPrice] = useState('')
  const [newAddonCategory, setNewAddonCategory] = useState('Extras')
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [sizeOptions, setSizeOptions] = useState<Array<{ value: string; label: string }>>([])
  const [sizePresetMap, setSizePresetMap] = useState<Record<string, string[]>>({})
  const [isLoadingSizePresets, setIsLoadingSizePresets] = useState(true)
  const [allAddons, setAllAddons] = useState<Addon[]>([])
  const [isLoadingAddons, setIsLoadingAddons] = useState(true)
  const [inventoryItems, setInventoryItems] = useState<Array<{ id: number; name: string; stock_quantity: number; stock_unit: string }>>([])
  const [isLoadingInventory, setIsLoadingInventory] = useState(true)
  const [showIngredientModal, setShowIngredientModal] = useState(false)
  const [newIngredient, setNewIngredient] = useState<Ingredient>({
    inventory_item_id: 0,
    inventory_item_name: '',
    quantity: 1,
    unit: 'g',
    priority: 0,
    multiplier_small: 0.8,
    multiplier_medium: 1.0,
    multiplier_large: 1.2
  })
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    details: true,
    addons: true,
    ingredients: true,
    settings: true
  })

  // Calculate form completion progress
  const formProgress = useMemo(() => {
    const requiredFields = ['name', 'description', 'category_id', 'price']
    const completedFields = requiredFields.filter(field => {
      const value = formData[field as keyof typeof formData]
      return value && String(value).trim() !== ''
    })
    return Math.round((completedFields.length / requiredFields.length) * 100)
  }, [formData])

  // Form sections for stepper
  const formSections: FormSection[] = [
    { id: 'basic', title: 'Basic Info', subtitle: 'Name, price, image', icon: 'info-circle', isComplete: !!(formData.name && formData.price && formData.description) },
    { id: 'details', title: 'Details', subtitle: 'Category, sizes, temp', icon: 'list', isComplete: !!(formData.category_id && formData.temperature) },
    { id: 'addons', title: 'Add-ons', subtitle: 'Customization options', icon: 'puzzle-piece', isComplete: formData.addon_ids.length > 0 },
    { id: 'ingredients', title: 'Ingredients', subtitle: 'Recipe & inventory', icon: 'flask', isComplete: formData.ingredients.length > 0 },
    { id: 'settings', title: 'Settings', subtitle: 'Visibility & status', icon: 'cog', isComplete: true }
  ]

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true)
        const data = await categoryService.getCategoriesForSelect('menu')
        setCategories(data)
      } catch (error) {
        console.error('Failed to fetch categories:', error)
        setCategories([
          { value: '1', label: 'Coffee' },
          { value: '2', label: 'Tea' },
          { value: '3', label: 'Pastries' }
        ])
      } finally {
        setIsLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

  // Fetch size presets
  useEffect(() => {
    const fetchSizePresets = async () => {
      try {
        setIsLoadingSizePresets(true)
        const data = await sizePresetService.getSizePresetOptions(true)
        const options = data.map(opt => ({ value: opt.value, label: opt.label }))
        const map: Record<string, string[]> = {}
        data.forEach(opt => { map[opt.value] = opt.labels })
        setSizeOptions(options)
        setSizePresetMap(map)
        if (data.length > 0) {
          const defaultPreset = data.find(p => p.value === '3') || data[0]
          setFormData(prev => ({
            ...prev,
            size_preset: defaultPreset.value,
            size_labels: defaultPreset.labels
          }))
        }
      } catch (error) {
        console.error('Failed to fetch size presets:', error)
        setSizeOptions([
          { value: '1', label: '1 Size (Regular)' },
          { value: '2', label: '2 Sizes (Small, Large)' },
          { value: '3', label: '3 Sizes (Small, Medium, Large)' },
          { value: '4', label: '4 Sizes (XS, S, M, L)' },
          { value: '5', label: '5 Sizes (XS, S, M, L, XL)' }
        ])
        setSizePresetMap({
          '1': ['Regular'],
          '2': ['Small', 'Large'],
          '3': ['Small', 'Medium', 'Large'],
          '4': ['XS', 'S', 'M', 'L'],
          '5': ['XS', 'S', 'M', 'L', 'XL']
        })
      } finally {
        setIsLoadingSizePresets(false)
      }
    }
    fetchSizePresets()
  }, [])

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
        setAllAddons([
          { id: 1, name: 'Extra Shot', price: 30, category: 'Extras' },
          { id: 2, name: 'Caramel Drizzle', price: 25, category: 'Syrups' },
          { id: 3, name: 'Vanilla Syrup', price: 20, category: 'Syrups' },
          { id: 4, name: 'Almond Milk', price: 35, category: 'Milk' },
          { id: 5, name: 'Oat Milk', price: 35, category: 'Milk' },
          { id: 6, name: 'Whipped Cream', price: 20, category: 'Toppings' },
          { id: 7, name: 'Chocolate Chips', price: 25, category: 'Toppings' }
        ])
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

  const handleSizePresetChange = (value: string) => {
    if (sizePresetMap[value]) {
      setFormData(prev => ({
        ...prev,
        size_preset: value,
        size_labels: sizePresetMap[value]
      }))
    }
  }

  const handleCategoryChange = (value: string) => {
    if (value === 'add_new') {
      setShowNewCategory(true)
      setFormData(prev => ({ ...prev, category_id: '' }))
    } else {
      setShowNewCategory(false)
      setFormData(prev => ({ ...prev, category_id: value }))
    }
  }

  const addNewCategory = async () => {
    const name = newCategory.trim()
    if (!name) {
      setNewCategoryError('Category name is required')
      return
    }
    if (name.length < 2) {
      setNewCategoryError('Category name must be at least 2 characters')
      return
    }
    setNewCategoryError('')
    try {
      const newCategoryData = await categoryService.createCategory({ name, scope: 'menu' })
      const updatedCategories = await categoryService.getCategoriesForSelect('menu')
      setCategories(updatedCategories)
      setFormData(prev => ({ ...prev, category_id: String(newCategoryData.id) }))
      setShowNewCategory(false)
      setNewCategory('')
    } catch (error: any) {
      console.error('Failed to create category:', error)
      alert(error.message || 'Failed to create category')
    }
  }

  const handleSizeChange = (value: string) => {
    if (value === 'add_new') {
      setShowNewSize(true)
      setFormData(prev => ({ ...prev, size_preset: '' }))
    } else {
      setShowNewSize(false)
      handleSizePresetChange(value)
    }
  }

  const addNewSizePreset = async () => {
    const name = newSizePresetName.trim()
    const labels = newSizeLabels.split(',').map(s => s.trim()).filter(s => s)

    // Validate
    let hasError = false
    if (!name) {
      setNewSizePresetNameError('Preset name is required')
      hasError = true
    }
    if (name.length < 2) {
      setNewSizePresetNameError('Preset name must be at least 2 characters')
      hasError = true
    }
    if (labels.length === 0) {
      setNewSizeLabelsError('At least 1 size label is required')
      hasError = true
    }
    if (hasError) return

    // Clear errors
    setNewSizePresetNameError('')
    setNewSizeLabelsError('')

    const presetId = `custom_${Date.now()}`
    try {
      const newPreset = await sizePresetService.createSizePreset({
        name,
        description: `Custom size preset: ${name}`,
        preset_id: presetId,
        labels,
        is_default: newSizeIsDefault,
        is_active: true,
        sort_order: sizeOptions.length + 1
      })
      const updatedPresets = await sizePresetService.getSizePresetOptions(true)
      const options = updatedPresets.map(opt => ({ value: opt.value, label: opt.label }))
      const map: Record<string, string[]> = {}
      updatedPresets.forEach(opt => { map[opt.value] = opt.labels })
      setSizeOptions(options)
      setSizePresetMap(map)
      setFormData(prev => ({ ...prev, size_preset: newPreset.preset_id, size_labels: newPreset.labels }))
      setShowNewSize(false)
      setNewSizePresetName('')
      setNewSizeLabels('')
      setNewSizeIsDefault(false)
    } catch (error: any) {
      console.error('Failed to create size preset:', error)
      alert(error.message || 'Failed to create size preset')
    }
  }

  const addNewAddon = async () => {
    const name = newAddonName.trim()
    const price = parseFloat(newAddonPrice)

    // Validate
    let hasError = false
    if (!name) {
      setNewAddonNameError('Addon name is required')
      hasError = true
    }
    if (name.length < 2) {
      setNewAddonNameError('Addon name must be at least 2 characters')
      hasError = true
    }
    if (isNaN(price) || price < 0) {
      setNewAddonPriceError('Please enter a valid price')
      hasError = true
    }
    if (price > 99999.99) {
      setNewAddonPriceError('Price cannot exceed ₱99,999.99')
      hasError = true
    }
    if (hasError) return

    // Clear errors
    setNewAddonNameError('')
    setNewAddonPriceError('')

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
      setAllAddons(prev => [...prev, transformedAddon])
      setFormData(prev => ({ ...prev, addon_ids: [...prev.addon_ids, newAddon.id] }))
      setShowNewAddon(false)
      setNewAddonName('')
      setNewAddonPrice('')
      setNewAddonCategory('Extras')
    } catch (error: any) {
      console.error('Failed to create addon:', error)
      alert(error.message || 'Failed to create addon')
    }
  }

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
    reader.onload = (e) => { setImagePreview(e.target?.result as string) }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImagePreview(null)
    setFormData(prev => ({ ...prev, image: null }))
    const input = document.getElementById('image-upload') as HTMLInputElement
    if (input) input.value = ''
  }

  const toggleAddon = (addonId: number) => {
    setFormData(prev => {
      const index = prev.addon_ids.indexOf(addonId)
      if (index === -1) {
        return { ...prev, addon_ids: [...prev.addon_ids, addonId] }
      } else {
        return { ...prev, addon_ids: prev.addon_ids.filter(id => id !== addonId) }
      }
    })
  }

  const selectAllAddons = () => {
    setFormData(prev => ({ ...prev, addon_ids: allAddons.map(a => a.id) }))
  }

  const clearAllAddons = () => {
    setFormData(prev => ({ ...prev, addon_ids: [] }))
  }

  const addIngredient = () => {
    if (!newIngredient.inventory_item_id || newIngredient.quantity <= 0) {
      alert('Please select an inventory item and enter a valid quantity')
      return
    }
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ...newIngredient }]
    }))
    setShowIngredientModal(false)
    setNewIngredient({
      inventory_item_id: 0,
      inventory_item_name: '',
      quantity: 1,
      unit: 'g',
      priority: 0
    })
  }

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }))
  }

  const openIngredientModal = () => {
    if (inventoryItems.length === 0) {
      alert('No inventory items available. Please create inventory items first.')
      return
    }
    setShowIngredientModal(true)
  }

  const filteredAddons = useMemo(() => {
    if (!addonSearch.trim()) return allAddons
    const query = addonSearch.toLowerCase()
    return allAddons.filter(addon =>
      addon.name.toLowerCase().includes(query) ||
      addon.category.toLowerCase().includes(query)
    )
  }, [addonSearch, allAddons])

  const filteredGroupedAddons = useMemo(() => {
    const groups: Record<string, Addon[]> = {}
    filteredAddons.forEach(addon => {
      if (!groups[addon.category]) groups[addon.category] = []
      groups[addon.category].push(addon)
    })
    return groups
  }, [filteredAddons])

  const isAddonSelected = (addonId: number) => formData.addon_ids.includes(addonId)

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = document.getElementById(`section-${sectionId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()

    // Mark all fields as touched
    setTouched({
      name: true,
      description: true,
      category_id: true,
      price: true,
      temperature: true,
      prep_time: true,
      size_preset: true,
      image: true,
      notes: true
    })
    setFormSubmitted(true)

    // Validate form
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors).find(key => errors[key as keyof typeof errors] !== '')
      if (firstErrorField) {
        const input = document.querySelector(`[id="${firstErrorField}"]`) as HTMLElement
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        input?.focus()
      }
      return
    }
    try {
      const response = await fetch('http://localhost:8000/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category_id: parseInt(formData.category_id),
          price: Math.round(parseFloat(formData.price) * 100),
          temperature: formData.temperature,
          prep_time: formData.prep_time || null,
          size_labels: formData.size_preset ? { preset: formData.size_preset, labels: formData.size_labels } : null,
          featured: formData.featured,
          popular: formData.popular,
          available: formData.available,
          notes: formData.notes || null,
          status: 'published',
          addon_ids: formData.addon_ids,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create menu item')
      }
      const result = await response.json()

      // Add recipe ingredients
      if (formData.ingredients.length > 0 && result.id) {
        for (const ingredient of formData.ingredients) {
          try {
            await recipeService.addIngredient(result.id, {
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

      if (formData.image && result.id) {
        const imageFormData = new FormData()
        imageFormData.append('file', formData.image)
        const imageResponse = await fetch(`http://localhost:8000/api/menu/${result.id}/image`, {
          method: 'POST',
          body: imageFormData,
        })
        if (!imageResponse.ok) {
          const error = await imageResponse.json()
          console.error('Image upload failed:', error)
        }
      }
      window.location.href = '/admin/menu'
    } catch (error) {
      console.error('Error creating menu item:', error)
      alert(error instanceof Error ? error.message : 'Failed to create menu item')
    }
  }

  const saveDraft = () => {
    localStorage.setItem('menuItemDraft', JSON.stringify(formData))
    alert('Draft saved successfully!')
  }

  const goBack = () => { window.history.back() }

  // Get selected category label
  const selectedCategory = categories.find(c => c.value === formData.category_id)?.label || 'Uncategorized'

  // Section Header Component
  const SectionHeader = ({ id, title, subtitle, icon, isComplete }: FormSection) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${
        activeSection === id ? 'bg-[#d4a574]/10 border-[#d4a574]/30' : 'bg-[#faf9f7] hover:bg-[#f5f0eb]'
      } border border-[#e8e4df]/60`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isComplete ? 'bg-green-500 text-white' : 'bg-white text-[#d4a574] shadow-sm'
        }`}>
          <i className={`fas fa-${isComplete ? 'check' : icon} ${isComplete ? '' : 'text-lg'}`}></i>
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-[#2d2a26]">{title}</h3>
          <p className="text-sm text-[#8b8680]">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isComplete && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            <i className="fas fa-check-circle"></i>
            Complete
          </span>
        )}
        <i className={`fas fa-chevron-${expandedSections[id] ? 'up' : 'down'} text-[#8b8680] transition-transform`}></i>
      </div>
    </button>
  )

  // Quick Action Button Component
  const QuickActionButton = ({ icon, label, onClick, variant = 'default' }: { icon: string, label: string, onClick: () => void, variant?: 'default' | 'danger' }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        variant === 'danger'
          ? 'text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300'
          : 'text-[#5c5752] hover:bg-[#f5f0eb] border border-[#e8e4df]/60 hover:border-[#d4a574]/30'
      }`}
    >
      <i className={`fas fa-${icon}`}></i>
      {label}
    </button>
  )

  return (
    <AdminLayout pageTitle="Add New Menu Item" pageSubtitle="Create a new item for your menu">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-[#faf9f7]/95 backdrop-blur-sm border-b border-[#e8e4df]/60 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#5c5752] hover:bg-[#f5f0eb] transition-all"
            >
              <i className="fas fa-arrow-left"></i>
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-6 w-px bg-[#e8e4df] hidden sm:block"></div>
            <div>
              <h1 className="text-lg font-semibold text-[#2d2a26]">New Menu Item</h1>
              <p className="text-sm text-[#8b8680] hidden sm:block">Complete all sections to publish</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#e8e4df]/60">
              <div className="w-20 h-2 rounded-full bg-[#e8e4df] overflow-hidden">
                <div
                  className="h-full bg-[#d4a574] transition-all duration-500"
                  style={{ width: `${formProgress}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-[#5c5752]">{formProgress}%</span>
            </div>
            <button
              type="button"
              onClick={saveDraft}
              className="px-4 py-2 rounded-lg border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#f5f0eb] transition-all font-medium"
            >
              Save Draft
            </button>
            <button
              type="submit"
              form="menu-form"
              className="px-4 py-2 rounded-lg bg-[#d4a574] text-white hover:bg-[#c49a6b] transition-all font-medium"
            >
              Publish
            </button>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {formSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeSection === section.id
                  ? 'bg-[#d4a574] text-white'
                  : section.isComplete
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white text-[#5c5752] border border-[#e8e4df]/60'
              }`}
            >
              <i className={`fas fa-${section.isComplete && activeSection !== section.id ? 'check' : section.icon} text-xs`}></i>
              <span className="text-sm font-medium">{section.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Form Column */}
        <div className="xl:col-span-2 space-y-6">
          <form id="menu-form" onSubmit={submitForm} className="space-y-6">

            {/* Basic Information Section */}
            <div id="section-basic">
              <SectionHeader {...formSections[0]} />
              {expandedSections.basic && (
                <CardWrapper className="mt-3">
                  {/* Image Upload - Enhanced */}
                  <div className="mb-8">
                    <label className="block text-sm font-semibold text-[#2d2a26] mb-4">
                      Item Image <span className="text-[#8b8680] font-normal">(Optional)</span>
                    </label>
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="shrink-0">
                        <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-[#faf9f7] to-[#f5f0eb] border-2 border-dashed border-[#e8e4df] flex items-center justify-center overflow-hidden relative group">
                          {imagePreview ? (
                            <>
                              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={clearImage}
                                  className="w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-4">
                              <i className="fas fa-image text-4xl text-[#8b8680] mb-2"></i>
                              <p className="text-xs text-[#8b8680]">No image</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 space-y-4">
                        <label className="block cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" id="image-upload" onChange={handleImageUpload} />
                          <div className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-dashed border-[#d4a574]/40 text-[#d4a574] hover:border-[#d4a574] hover:bg-[#d4a574]/5 transition-all duration-200 font-medium">
                            <i className="fas fa-cloud-upload-alt text-xl"></i>
                            <span>Click to upload image</span>
                          </div>
                        </label>
                        <div className="flex flex-wrap gap-2 text-xs text-[#8b8680]">
                          <span className="px-2 py-1 rounded-md bg-[#faf9f7]">800x600px recommended</span>
                          <span className="px-2 py-1 rounded-md bg-[#faf9f7]">JPG, PNG, WebP</span>
                          <span className="px-2 py-1 rounded-md bg-[#faf9f7]">Max 10MB</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Name & Price Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                      id="name"
                      label="Item Name"
                      type="text"
                      placeholder="e.g., Iced Brown Sugar Latte"
                      value={formData.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      onBlur={() => handleFieldBlur('name')}
                      required
                      error={errors.name}
                      maxLength={255}
                    />
                    <FormInput
                      id="price"
                      label="Base Price"
                      type="number"
                      placeholder="0.00"
                      min={0}
                      max={99999.99}
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => handleFieldChange('price', e.target.value)}
                      onBlur={() => handleFieldBlur('price')}
                      required
                      error={errors.price}
                    />
                  </div>

                  {/* Description */}
                  <div className="mt-6">
                    <FormTextarea
                      id="description"
                      label="Description"
                      placeholder="Describe your menu item, ingredients, and what makes it special..."
                      value={formData.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      onBlur={() => handleFieldBlur('description')}
                      rows={4}
                      maxLength={1000}
                      showCharCount
                      required
                      error={errors.description}
                    />
                  </div>
                </CardWrapper>
              )}
            </div>

            {/* Category & Details Section */}
            <div id="section-details">
              <SectionHeader {...formSections[1]} />
              {expandedSections.details && (
                <CardWrapper className="mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category */}
                    <div className="space-y-3">
                      <FormSelect
                        id="category_id"
                        label="Category"
                        placeholder="Select category"
                        value={formData.category_id}
                        onChange={(value) => {
                          handleCategoryChange(value)
                          handleFieldChange('category_id', value)
                        }}
                        onBlur={() => handleFieldBlur('category_id')}
                        options={[...categories, { value: 'add_new', label: '+ Add New Category' }]}
                        required
                        disabled={isLoadingCategories}
                        error={errors.category_id}
                      />
                      {showNewCategory && (
                        <div className="p-4 bg-[#faf9f7] rounded-xl border border-[#e8e4df]/60 space-y-3">
                          <div>
                            <FormInput
                              type="text"
                              placeholder="Enter new category name"
                              value={newCategory}
                              onChange={(e) => {
                                setNewCategory(e.target.value)
                                if (e.target.value.trim().length < 2) {
                                  setNewCategoryError('Category name must be at least 2 characters')
                                } else if (e.target.value.trim().length > 50) {
                                  setNewCategoryError('Category name must not exceed 50 characters')
                                } else {
                                  setNewCategoryError('')
                                }
                              }}
                              error={newCategoryError}
                              maxLength={50}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={addNewCategory}
                              className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#c49a6b] transition-all text-sm font-medium"
                            >
                              Add Category
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowNewCategory(false); setNewCategory(''); setNewCategoryError('') }}
                              className="px-4 py-2 border border-[#e8e4df]/60 text-[#5c5752] rounded-lg hover:bg-[#f5f0eb] transition-all text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Temperature */}
                    <FormSelect
                      id="temperature"
                      label="Temperature"
                      value={formData.temperature}
                      onChange={(value) => {
                        handleFieldChange('temperature', value)
                        setFormData(prev => ({ ...prev, temperature: value }))
                      }}
                      onBlur={() => handleFieldBlur('temperature')}
                      options={temperatureOptions}
                      required
                      error={errors.temperature}
                    />

                    {/* Size Preset */}
                    <div className="space-y-3">
                      <FormSelect
                        id="size_preset"
                        label="Size Options"
                        placeholder="Select sizes"
                        value={formData.size_preset}
                        onChange={(value) => {
                          handleSizeChange(value)
                          handleFieldChange('size_preset', value)
                        }}
                        onBlur={() => handleFieldBlur('size_preset')}
                        options={[...sizeOptions, { value: 'add_new', label: '+ Add Custom Sizes' }]}
                        required
                        disabled={isLoadingSizePresets}
                        error={errors.size_preset}
                      />
                      {formData.size_labels.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.size_labels.map((label, idx) => (
                            <span key={idx} className="px-3 py-1 rounded-full bg-[#d4a574]/10 text-[#d4a574] text-sm font-medium">
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                      {showNewSize && (
                        <div className="p-4 bg-[#faf9f7] rounded-xl border border-[#e8e4df]/60 space-y-3">
                          <FormInput
                            type="text"
                            label="Preset Name"
                            placeholder="e.g., Kids Sizes"
                            value={newSizePresetName}
                            onChange={(e) => {
                              setNewSizePresetName(e.target.value)
                              if (e.target.value.trim().length < 2) {
                                setNewSizePresetNameError('Preset name must be at least 2 characters')
                              } else if (e.target.value.trim().length > 50) {
                                setNewSizePresetNameError('Preset name must not exceed 50 characters')
                              } else {
                                setNewSizePresetNameError('')
                              }
                            }}
                            error={newSizePresetNameError}
                            maxLength={50}
                          />
                          <div>
                            <label className="block text-sm font-semibold text-[#2d2a26] mb-2">Sizes (comma separated)</label>
                            <input
                              type="text"
                              placeholder="Small, Medium, Large"
                              value={newSizeLabels}
                              onChange={(e) => {
                                setNewSizeLabels(e.target.value)
                                const labels = e.target.value.split(',').map(s => s.trim()).filter(s => s)
                                if (labels.length < 1) {
                                  setNewSizeLabelsError('At least 1 size label is required')
                                } else if (labels.length > 5) {
                                  setNewSizeLabelsError('Maximum 5 size labels allowed')
                                } else {
                                  setNewSizeLabelsError('')
                                }
                              }}
                              className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 outline-none transition-all ${
                                newSizeLabelsError
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                                  : 'border-[#e8e4df]/60 focus:border-[#d4a574] focus:ring-[#d4a574]/20'
                              }`}
                            />
                            {newSizeLabelsError && (
                              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                                <i className="fas fa-exclamation-circle text-xs"></i>
                                {newSizeLabelsError}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={addNewSizePreset} className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#c49a6b] transition-all text-sm font-medium">Add Preset</button>
                            <button type="button" onClick={() => { setShowNewSize(false); setNewSizePresetName(''); setNewSizeLabels(''); setNewSizePresetNameError(''); setNewSizeLabelsError('') }} className="px-4 py-2 border border-[#e8e4df]/60 text-[#5c5752] rounded-lg hover:bg-[#f5f0eb] transition-all text-sm">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Prep Time */}
                    <FormInput
                      id="prep_time"
                      label="Preparation Time"
                      type="text"
                      placeholder="e.g., 3-5 minutes"
                      value={formData.prep_time}
                      onChange={(e) => handleFieldChange('prep_time', e.target.value)}
                      onBlur={() => handleFieldBlur('prep_time')}
                      maxLength={50}
                      error={errors.prep_time}
                    />
                  </div>
                </CardWrapper>
              )}
            </div>

            {/* Add-ons Section */}
            <div id="section-addons">
              <SectionHeader {...formSections[2]} />
              {expandedSections.addons && (
                <CardWrapper className="mt-3">
                  {allAddons.length === 0 ? (
                    <div className="text-center py-8 bg-[#faf9f7] rounded-xl border-2 border-dashed border-[#e8e4df]">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#f5f0eb] flex items-center justify-center">
                        <i className="fas fa-puzzle-piece text-[#8b8680] text-2xl"></i>
                      </div>
                      <h3 className="text-lg font-medium text-[#2d2a26] mb-2">No add-ons available</h3>
                      <button type="button" onClick={() => setShowNewAddon(true)} className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#c49a6b] transition-all text-sm font-medium">
                        <i className="fas fa-plus mr-1"></i> Create Add-on
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Search & Actions */}
                      <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#8b8680]"></i>
                          <input
                            type="search"
                            placeholder="Search add-ons..."
                            value={addonSearch}
                            onChange={(e) => setAddonSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-[#faf9f7] focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20 focus:border-[#d4a574] transition-all"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <QuickActionButton icon="check-double" label="Select All" onClick={selectAllAddons} />
                          <QuickActionButton icon="times" label="Clear" onClick={clearAllAddons} />
                          <button type="button" onClick={() => setShowNewAddon(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#d4a574] text-white hover:bg-[#c49a6b] transition-all text-sm font-medium">
                            <i className="fas fa-plus"></i> New
                          </button>
                        </div>
                      </div>

                      {/* Selected Count */}
                      {formData.addon_ids.length > 0 && (
                        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-[#d4a574]/10 text-[#d4a574] text-sm">
                          <i className="fas fa-check-circle"></i>
                          <span className="font-medium">{formData.addon_ids.length} add-on{formData.addon_ids.length !== 1 ? 's' : ''} selected</span>
                        </div>
                      )}

                      {/* New Addon Form */}
                      {showNewAddon && (
                        <div className="mb-6 p-4 bg-[#faf9f7] rounded-xl border-2 border-dashed border-[#e8e4df] space-y-4">
                          <h4 className="font-semibold text-[#2d2a26]">Create New Add-on</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <FormInput
                              type="text"
                              label="Name"
                              placeholder="e.g., Extra Shot"
                              value={newAddonName}
                              onChange={(e) => {
                                setNewAddonName(e.target.value)
                                if (e.target.value.trim().length < 2) {
                                  setNewAddonNameError('Addon name must be at least 2 characters')
                                } else if (e.target.value.trim().length > 100) {
                                  setNewAddonNameError('Addon name must not exceed 100 characters')
                                } else {
                                  setNewAddonNameError('')
                                }
                              }}
                              error={newAddonNameError}
                              maxLength={100}
                            />
                            <FormInput
                              type="number"
                              label="Price (₱)"
                              placeholder="0.00"
                              min={0}
                              max={99999.99}
                              step="0.01"
                              value={newAddonPrice}
                              onChange={(e) => {
                                setNewAddonPrice(e.target.value)
                                const price = parseFloat(e.target.value)
                                if (isNaN(price) || price < 0) {
                                  setNewAddonPriceError('Please enter a valid price')
                                } else if (price > 99999.99) {
                                  setNewAddonPriceError('Price cannot exceed ₱99,999.99')
                                } else {
                                  setNewAddonPriceError('')
                                }
                              }}
                              error={newAddonPriceError}
                            />
                            <div>
                              <label className="block text-sm font-semibold text-[#2d2a26] mb-2">Category</label>
                              <select value={newAddonCategory} onChange={(e) => setNewAddonCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#e8e4df]/60 bg-[#faf9f7] focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20 focus:border-[#d4a574]">
                                {addonCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={addNewAddon} className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#c49a6b] transition-all text-sm font-medium">Add Add-on</button>
                            <button type="button" onClick={() => { setShowNewAddon(false); setNewAddonName(''); setNewAddonPrice(''); setNewAddonNameError(''); setNewAddonPriceError('') }} className="px-4 py-2 border border-[#e8e4df]/60 text-[#5c5752] rounded-lg hover:bg-[#f5f0eb] transition-all text-sm">Cancel</button>
                          </div>
                        </div>
                      )}

                      {/* Grouped Add-ons */}
                      {Object.keys(filteredGroupedAddons).length > 0 ? (
                        <div className="space-y-6">
                          {Object.entries(filteredGroupedAddons).map(([category, categoryAddons]) => (
                            <div key={category}>
                              <h4 className="text-sm font-semibold text-[#5c5752] mb-3 flex items-center gap-2">
                                <i className={`fas fa-${getCategoryIcon(category)} text-[#d4a574]`}></i>
                                {category}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {categoryAddons.map((addon) => (
                                  <label
                                    key={addon.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                                      isAddonSelected(addon.id)
                                        ? 'border-[#d4a574] bg-[#d4a574]/5 shadow-sm'
                                        : 'border-[#e8e4df]/60 hover:border-[#d4a574]/30 hover:bg-[#faf9f7]'
                                    }`}
                                  >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                      isAddonSelected(addon.id) ? 'bg-[#d4a574] border-[#d4a574]' : 'border-[#e8e4df]'
                                    }`}>
                                      {isAddonSelected(addon.id) && <i className="fas fa-check text-white text-xs"></i>}
                                    </div>
                                    <input type="checkbox" checked={isAddonSelected(addon.id)} onChange={() => toggleAddon(addon.id)} className="hidden" />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm font-medium text-[#2d2a26] block truncate">{addon.name}</span>
                                      <span className="text-xs text-[#8b8680]">+₱{addon.price.toFixed(2)}</span>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-[#8b8680]">
                          <i className="fas fa-search text-3xl mb-2 text-[#e8e4df]"></i>
                          <p>No add-ons match your search</p>
                        </div>
                      )}
                    </>
                  )}
                </CardWrapper>
              )}
            </div>

            {/* Ingredients Section */}
            <div id="section-ingredients">
              <SectionHeader {...formSections[3]} />
              {expandedSections.ingredients && (
                <CardWrapper className="mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-[#2d2a26]">Recipe Ingredients</h3>
                      <p className="text-sm text-[#8b8680]">Add inventory items used to make this menu item</p>
                    </div>
                    <button
                      type="button"
                      onClick={openIngredientModal}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4a574] text-white hover:bg-[#c49a6b] transition-all text-sm font-medium"
                    >
                      <i className="fas fa-plus"></i>
                      Add Ingredient
                    </button>
                  </div>

                  {formData.ingredients.length === 0 ? (
                    <div className="text-center py-8 bg-[#faf9f7] rounded-xl border-2 border-dashed border-[#e8e4df]">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#f5f0eb] flex items-center justify-center">
                        <i className="fas fa-flask text-[#8b8680] text-2xl"></i>
                      </div>
                      <h3 className="text-lg font-medium text-[#2d2a26] mb-2">No ingredients added</h3>
                      <p className="text-sm text-[#8b8680] mb-4">Add inventory items to track stock usage</p>
                      <button
                        type="button"
                        onClick={openIngredientModal}
                        className="px-4 py-2 bg-[#d4a574] text-white rounded-lg hover:bg-[#c49a6b] transition-all text-sm font-medium"
                      >
                        <i className="fas fa-plus mr-1"></i> Add First Ingredient
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.ingredients.map((ingredient, index) => {
                        const inventoryItem = inventoryItems.find(item => item.id === ingredient.inventory_item_id)
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 rounded-xl border border-[#e8e4df]/60 bg-[#faf9f7] hover:bg-white hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-[#d4a574]/10 flex items-center justify-center">
                                <i className="fas fa-box text-[#d4a574]"></i>
                              </div>
                              <div>
                                <h4 className="font-medium text-[#2d2a26]">{ingredient.inventory_item_name}</h4>
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
                            <button
                              type="button"
                              onClick={() => removeIngredient(index)}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Ingredient Modal */}
                  {showIngredientModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-[#2d2a26] mb-4">Add Ingredient</h3>

                        <div className="space-y-4">
                          {/* Inventory Item Selection */}
                          <div>
                            <label className="block text-sm font-medium text-[#2d2a26] mb-2">Inventory Item</label>
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
                              className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20 focus:border-[#d4a574]"
                            >
                              <option value="">Select an item...</option>
                              {inventoryItems.map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.name} ({item.stock_quantity} {item.stock_unit})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Base Quantity Input */}
                          <div>
                            <label className="block text-sm font-medium text-[#2d2a26] mb-2">
                              Base Quantity (for Medium)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={newIngredient.quantity}
                              onChange={(e) => setNewIngredient(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                              className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20 focus:border-[#d4a574]"
                              placeholder="e.g., 200"
                            />
                            <p className="text-xs text-[#8b8680] mt-1">
                              This is the standard amount for a medium serving
                            </p>
                          </div>

                          {/* Size Multipliers */}
                          <div className="bg-[#faf9f7] rounded-xl p-4 space-y-3">
                            <label className="block text-sm font-medium text-[#2d2a26]">
                              Size Multipliers
                              <span className="text-xs text-[#8b8680] font-normal ml-2">
                                (percentage of base quantity)
                              </span>
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
                                    className="w-full px-3 py-2 rounded-lg border border-[#e8e4df]/60 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20 text-sm pr-8"
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
                                    className="w-full px-3 py-2 rounded-lg border border-[#e8e4df]/60 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20 text-sm pr-8"
                                    placeholder="1.0"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8b8680] pointer-events-none">×</span>
                                </div>
                                <p className="text-xs text-[#8b8680] mt-1">
                                  = {Math.round((newIngredient.multiplier_medium || 1.0) * newIngredient.quantity)}{newIngredient.unit}
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs text-[#868689] mb-1">Large</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={newIngredient.multiplier_large || 1.2}
                                    onChange={(e) => setNewIngredient(prev => ({ ...prev, multiplier_large: parseFloat(e.target.value) || 1.2 }))}
                                    className="w-full px-3 py-2 rounded-lg border border-[#e8e4df]/60 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20 text-sm pr-8"
                                    placeholder="1.2"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8b8680] pointer-events-none">×</span>
                                </div>
                                <p className="text-xs text-[#868689] mt-1">
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
                            <label className="block text-sm font-medium text-[#2d2a26] mb-2">Unit</label>
                            <select
                              value={newIngredient.unit}
                              onChange={(e) => setNewIngredient(prev => ({ ...prev, unit: e.target.value }))}
                              className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20 focus:border-[#d4a574]"
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
                            <label className="block text-sm font-medium text-[#2d2a26] mb-2">Priority</label>
                            <input
                              type="number"
                              min="0"
                              value={newIngredient.priority}
                              onChange={(e) => setNewIngredient(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                              className="w-full px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 focus:outline-none focus:ring-2 focus:ring-[#d4a574]/20 focus:border-[#d4a574]"
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
                            className="flex-1 px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#f5f0eb] transition-all font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={addIngredient}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-[#d4a574] text-white hover:bg-[#c49a6b] transition-all font-medium"
                          >
                            Add Ingredient
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardWrapper>
              )}
            </div>

            {/* Settings Section */}
            <div id="section-settings">
              <SectionHeader {...formSections[4]} />
              {expandedSections.settings && (
                <CardWrapper className="mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                        formData.available ? 'border-green-500 bg-green-50' : 'border-[#e8e4df]/60 hover:bg-[#faf9f7]'
                      }`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.available ? 'bg-green-500 text-white' : 'bg-[#f5f0eb] text-[#8b8680]'}`}>
                          <i className="fas fa-check-circle text-xl"></i>
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-[#2d2a26] block">Available</span>
                          <span className="text-xs text-[#8b8680]">Item is ready for ordering</span>
                        </div>
                        <input type="checkbox" checked={formData.available} onChange={(e) => setFormData(prev => ({ ...prev, available: e.target.checked }))} className="w-5 h-5 rounded text-[#d4a574] focus:ring-[#d4a574]" />
                      </label>

                      <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                        formData.featured ? 'border-[#d4a574] bg-[#d4a574]/5' : 'border-[#e8e4df]/60 hover:bg-[#faf9f7]'
                      }`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.featured ? 'bg-[#d4a574] text-white' : 'bg-[#f5f0eb] text-[#8b8680]'}`}>
                          <i className="fas fa-star text-xl"></i>
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-[#2d2a26] block">Featured</span>
                          <span className="text-xs text-[#8b8680]">Highlight on menu</span>
                        </div>
                        <input type="checkbox" checked={formData.featured} onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))} className="w-5 h-5 rounded text-[#d4a574] focus:ring-[#d4a574]" />
                      </label>

                      <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                        formData.popular ? 'border-amber-500 bg-amber-50' : 'border-[#e8e4df]/60 hover:bg-[#faf9f7]'
                      }`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.popular ? 'bg-amber-500 text-white' : 'bg-[#f5f0eb] text-[#8b8680]'}`}>
                          <i className="fas fa-fire text-xl"></i>
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-[#2d2a26] block">Popular</span>
                          <span className="text-xs text-[#8b8680]">Mark as customer favorite</span>
                        </div>
                        <input type="checkbox" checked={formData.popular} onChange={(e) => setFormData(prev => ({ ...prev, popular: e.target.checked }))} className="w-5 h-5 rounded text-[#d4a574] focus:ring-[#d4a574]" />
                      </label>
                    </div>

                    <div>
                      <FormTextarea
                        id="notes"
                        label="Internal Notes"
                        placeholder="Add any internal notes about this menu item..."
                        value={formData.notes}
                        onChange={(e) => handleFieldChange('notes', e.target.value)}
                        onBlur={() => handleFieldBlur('notes')}
                        rows={6}
                        maxLength={1000}
                        showCharCount
                        error={errors.notes}
                      />
                    </div>
                  </div>
                </CardWrapper>
              )}
            </div>

            {/* Bottom Actions */}
            <CardWrapper>
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                <button type="button" onClick={goBack} className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#f5f0eb] transition-all font-medium">
                  Cancel
                </button>
                <button type="button" onClick={saveDraft} className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#f5f0eb] text-[#5c5752] hover:bg-[#ebe5de] transition-all font-medium">
                  Save Draft
                </button>
                <button type="submit" className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#d4a574] text-white hover:bg-[#c49a6b] hover:shadow-lg transition-all font-semibold">
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-plus-circle"></i>
                    Publish Menu Item
                  </span>
                </button>
              </div>
            </CardWrapper>
          </form>
        </div>

        {/* Sticky Sidebar Column */}
        <div className="xl:col-span-1">
          <div className="sticky top-40 space-y-6">
            {/* Live Preview Card */}
            <CardWrapper className="overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <i className="fas fa-eye text-[#d4a574]"></i>
                <h3 className="font-semibold text-[#2d2a26]">Live Preview</h3>
              </div>

              {/* Menu Item Preview */}
              <div className="rounded-xl overflow-hidden border border-[#e8e4df]/60 bg-white">
                {/* Image Area */}
                <div className="aspect-[4/3] bg-gradient-to-br from-[#faf9f7] to-[#f5f0eb] relative">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <i className="fas fa-image text-4xl text-[#e8e4df]"></i>
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {formData.popular && (
                      <span className="px-2 py-1 rounded-md bg-amber-500 text-white text-xs font-semibold flex items-center gap-1">
                        <i className="fas fa-fire"></i> Popular
                      </span>
                    )}
                    {formData.featured && (
                      <span className="px-2 py-1 rounded-md bg-[#d4a574] text-white text-xs font-semibold flex items-center gap-1">
                        <i className="fas fa-star"></i> Featured
                      </span>
                    )}
                    {!formData.available && (
                      <span className="px-2 py-1 rounded-md bg-[#8b8680] text-white text-xs font-semibold">
                        Unavailable
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-[#2d2a26] line-clamp-2">
                      {formData.name || 'Item Name'}
                    </h4>
                    <span className="font-bold text-[#d4a574] whitespace-nowrap">
                      ₱{formData.price || '0.00'}
                    </span>
                  </div>
                  <p className="text-sm text-[#8b8680] line-clamp-2 mb-3">
                    {formData.description || 'Item description will appear here...'}
                  </p>

                  {/* Category Tag */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 rounded-full bg-[#faf9f7] text-[#5c5752] text-xs font-medium flex items-center gap-1">
                      <i className={`fas ${getCategoryDisplayIcon(selectedCategory)}`}></i>
                      {selectedCategory}
                    </span>
                    {formData.temperature && (
                      <span className="px-2 py-1 rounded-full bg-[#faf9f7] text-[#5c5752] text-xs font-medium">
                        {formData.temperature}
                      </span>
                    )}
                  </div>

                  {/* Add-ons Preview */}
                  {formData.addon_ids.length > 0 && (
                    <div className="pt-3 border-t border-[#e8e4df]/60">
                      <p className="text-xs text-[#8b8680] mb-2">Available add-ons:</p>
                      <div className="flex flex-wrap gap-1">
                        {formData.addon_ids.slice(0, 3).map(id => {
                          const addon = allAddons.find(a => a.id === id)
                          return addon ? (
                            <span key={id} className="px-2 py-0.5 rounded bg-[#d4a574]/10 text-[#d4a574] text-xs">
                              {addon.name}
                            </span>
                          ) : null
                        })}
                        {formData.addon_ids.length > 3 && (
                          <span className="px-2 py-0.5 rounded bg-[#faf9f7] text-[#5c5752] text-xs">
                            +{formData.addon_ids.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardWrapper>

            {/* Quick Tips */}
            <CardWrapper className="bg-gradient-to-br from-[#d4a574]/5 to-transparent border-[#d4a574]/20">
              <div className="flex items-center gap-2 mb-3">
                <i className="fas fa-lightbulb text-[#d4a574]"></i>
                <h3 className="font-semibold text-[#2d2a26]">Quick Tips</h3>
              </div>
              <ul className="space-y-2 text-sm text-[#5c5752]">
                <li className="flex items-start gap-2">
                  <i className="fas fa-check-circle text-green-500 mt-0.5 text-xs"></i>
                  <span>Use high-quality images for better engagement</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check-circle text-green-500 mt-0.5 text-xs"></i>
                  <span>Keep descriptions concise but descriptive</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check-circle text-green-500 mt-0.5 text-xs"></i>
                  <span>Add relevant add-ons for upselling</span>
                </li>
                <li className="flex items-start gap-2">
                  <i className="fas fa-check-circle text-green-500 mt-0.5 text-xs"></i>
                  <span>Mark popular items to boost visibility</span>
                </li>
              </ul>
            </CardWrapper>

            {/* Section Navigation */}
            <CardWrapper>
              <h3 className="font-semibold text-[#2d2a26] mb-4">Form Sections</h3>
              <div className="space-y-2">
                {formSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                      activeSection === section.id
                        ? 'bg-[#d4a574]/10 text-[#d4a574]'
                        : 'hover:bg-[#faf9f7] text-[#5c5752]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      section.isComplete
                        ? 'bg-green-500 text-white'
                        : activeSection === section.id
                        ? 'bg-[#d4a574] text-white'
                        : 'bg-[#f5f0eb]'
                    }`}>
                      <i className={`fas fa-${section.isComplete ? 'check' : section.icon} text-sm`}></i>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{section.title}</p>
                      <p className="text-xs opacity-75">{section.subtitle}</p>
                    </div>
                    {section.isComplete && <i className="fas fa-check-circle text-green-500 text-sm"></i>}
                  </button>
                ))}
              </div>
            </CardWrapper>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
