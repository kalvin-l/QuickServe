'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import CardWrapper from '@/components/admin/ui/CardWrapper'
import FormInput from '@/components/admin/forms/FormInput'
import FormSelect from '@/components/admin/forms/FormSelect'
import FormTextarea from '@/components/admin/forms/FormTextarea'
import FormSection from '@/components/admin/forms/FormSection'
import AdminModal from '@/components/admin/ui/AdminModal'
import { LoadingSpinner } from '@/components/ui/loading-spinner/LoadingSpinner'

interface OrderItem {
  id: number
  name: string
  price: number
  category: string
  quantity: number
  addons: Addon[]
}

interface Addon {
  id: number
  name: string
  price: number
  description?: string
}

interface MenuItem {
  id: number
  name: string
  price: number
  category: string
  addons: Addon[]
}

interface OrderData {
  sessionId: string
  tableType: string
  orderType: string
  customerName: string
  customerPhone: string
  deviceInfo: {
    ip: string
    type: string
  }
  paymentMethod: string
  specialInstructions: string
  notes: string
  status: string
}

// Static data
const tables = [
  { id: 1, number: '1', location: 'Indoor', capacity: 4 },
  { id: 2, number: '2', location: 'Indoor', capacity: 4 },
  { id: 3, number: '3', location: 'Indoor', capacity: 6 },
  { id: 4, number: '4', location: 'Outdoor', capacity: 4 },
  { id: 5, number: '5', location: 'Outdoor', capacity: 6 },
  { id: 6, number: '6', location: 'Patio', capacity: 8 },
  { id: 7, number: '7', location: 'Bar', capacity: 2 }
]

const menuItems: MenuItem[] = [
  {
    id: 1,
    name: 'Caramel Macchiato',
    price: 145,
    category: 'Coffee',
    addons: [
      { id: 1, name: 'Extra Shot', price: 30, description: 'Additional espresso shot' },
      { id: 2, name: 'Caramel Drizzle', price: 25, description: 'Extra caramel on top' }
    ]
  },
  {
    id: 2,
    name: 'Iced Americano',
    price: 110,
    category: 'Coffee',
    addons: [
      { id: 1, name: 'Extra Shot', price: 30 },
      { id: 3, name: 'Vanilla Syrup', price: 20 }
    ]
  },
  {
    id: 3,
    name: 'Cappuccino',
    price: 125,
    category: 'Coffee',
    addons: [
      { id: 1, name: 'Extra Shot', price: 30 },
      { id: 4, name: 'Almond Milk', price: 35 }
    ]
  },
  {
    id: 4,
    name: 'Matcha Latte',
    price: 155,
    category: 'Tea',
    addons: [
      { id: 3, name: 'Vanilla Syrup', price: 20 },
      { id: 6, name: 'Whipped Cream', price: 20 }
    ]
  },
  {
    id: 5,
    name: 'Chocolate Croissant',
    price: 85,
    category: 'Pastries',
    addons: []
  },
  {
    id: 6,
    name: 'Blueberry Muffin',
    price: 75,
    category: 'Pastries',
    addons: [
      { id: 7, name: 'Chocolate Chips', price: 25 }
    ]
  },
  {
    id: 7,
    name: 'Club Sandwich',
    price: 180,
    category: 'Sandwiches',
    addons: [
      { id: 8, name: 'Extra Cheese', price: 30 }
    ]
  },
  {
    id: 8,
    name: 'Tiramisu',
    price: 140,
    category: 'Desserts',
    addons: []
  }
]

const orderTypeOptions = [
  { value: 'dine_in', label: 'Dine In' },
  { value: 'takeaway', label: 'Takeaway' },
  { value: 'delivery', label: 'Delivery' }
]

const deviceTypeOptions = [
  { value: 'mobile', label: 'Mobile Device' },
  { value: 'tablet', label: 'Tablet Device' },
  { value: 'laptop', label: 'Laptop Device' },
  { value: 'desktop', label: 'Desktop Computer' }
]

const paymentOptions = [
  { value: '', label: 'Not Set' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'e_wallet', label: 'E-Wallet (GCash, Maya)' },
  { value: 'qr', label: 'QR Payment' },
  { value: 'bank_transfer', label: 'Bank Transfer' }
]

const orderStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'served', label: 'Served' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

export default function EditOrderPage() {
  const params = useParams()
  const orderId = params.id as string

  // Form state
  const [formData, setFormData] = useState<OrderData>({
    sessionId: '',
    tableType: '',
    orderType: 'dine_in',
    customerName: '',
    customerPhone: '',
    deviceInfo: {
      ip: '',
      type: 'mobile'
    },
    paymentMethod: '',
    specialInstructions: '',
    notes: '',
    status: 'pending'
  })

  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [newCustomTable, setNewCustomTable] = useState('')
  const [showNewTable, setShowNewTable] = useState(false)
  const [showAddonModal, setShowAddonModal] = useState(false)
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([])
  const [menuSearch, setMenuSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Load order data
  useEffect(() => {
    // Simulate fetching order data
    // In a real app, you'd fetch from an API
    const loadOrderData = () => {
      setIsLoading(true)

      // Try to get from localStorage for demo purposes
      const savedOrders = localStorage.getItem('orders')
      if (savedOrders) {
        const orders = JSON.parse(savedOrders)
        const order = orders.find((o: any) => o.sessionId === `#${orderId}` || o.id === orderId)

        if (order) {
          setFormData({
            sessionId: order.sessionId || `#${orderId}`,
            tableType: order.tableType || '',
            orderType: order.orderType || 'dine_in',
            customerName: order.customerName || '',
            customerPhone: order.customerPhone || '',
            deviceInfo: order.deviceInfo || { ip: '', type: 'mobile' },
            paymentMethod: order.paymentMethod || '',
            specialInstructions: order.specialInstructions || '',
            notes: order.notes || '',
            status: order.status || 'pending'
          })
          setOrderItems(order.orderItems || [])
        }
      } else {
        // Default fallback if no order found
        setFormData(prev => ({ ...prev, sessionId: `#${orderId}` }))
      }

      setIsLoading(false)
    }

    if (orderId) {
      loadOrderData()
    }
  }, [orderId])

  // Computed values
  const tableOptions = useMemo(() => {
    const options = tables.map(table => ({
      value: `table_${table.id}`,
      label: `Table ${table.number} (${table.location}, ${table.capacity} seats)`
    }))
    options.push({ value: 'takeaway', label: 'Takeaway Counter' })
    options.push({ value: 'add_new', label: '+ Add Custom Table/Area' })
    return options
  }, [])

  const filteredMenuItems = useMemo(() => {
    if (!menuSearch.trim()) return menuItems
    const query = menuSearch.toLowerCase()
    return menuItems.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    )
  }, [menuSearch])

  const groupedMenuItems = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {}
    filteredMenuItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = []
      }
      groups[item.category].push(item)
    })
    return groups
  }, [filteredMenuItems])

  const subtotal = useMemo(() => {
    return orderItems.reduce((total, item) => {
      const itemTotal = item.price * item.quantity
      const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + addon.price, 0) * item.quantity
      return total + itemTotal + addonsTotal
    }, 0)
  }, [orderItems])

  const tax = useMemo(() => subtotal * 0.12, [subtotal])

  const grandTotal = useMemo(() => subtotal + tax, [subtotal, tax])

  // Handlers
  const handleTableChange = (value: string) => {
    if (value === 'add_new') {
      setShowNewTable(true)
      setFormData(prev => ({ ...prev, tableType: '' }))
    } else {
      setShowNewTable(false)
      setFormData(prev => ({ ...prev, tableType: value }))
    }
  }

  const addNewTable = () => {
    if (newCustomTable.trim()) {
      const newValue = newCustomTable.trim().toLowerCase().replace(/\s+/g, '_')
      setFormData(prev => ({ ...prev, tableType: newValue }))
      setShowNewTable(false)
      setNewCustomTable('')
    }
  }

  const cancelNewTable = () => {
    setShowNewTable(false)
    setNewCustomTable('')
    setFormData(prev => ({ ...prev, tableType: '' }))
  }

  const openAddonModal = (menuItem: MenuItem) => {
    setSelectedMenuItem(menuItem)
    setSelectedAddons([])
    if (menuItem.addons && menuItem.addons.length > 0) {
      setShowAddonModal(true)
    } else {
      addToCart(menuItem, [])
    }
  }

  const toggleAddon = (addon: Addon) => {
    const index = selectedAddons.findIndex(a => a.id === addon.id)
    if (index === -1) {
      setSelectedAddons(prev => [...prev, addon])
    } else {
      setSelectedAddons(prev => prev.filter(a => a.id !== addon.id))
    }
  }

  const isAddonSelected = (addonId: number) => {
    return selectedAddons.some(a => a.id === addonId)
  }

  const confirmAddons = () => {
    if (selectedMenuItem) {
      addToCart(selectedMenuItem, [...selectedAddons])
      setShowAddonModal(false)
      setSelectedMenuItem(null)
      setSelectedAddons([])
    }
  }

  const addToCart = (menuItem: MenuItem, addons: Addon[]) => {
    const addonsKey = addons.map(a => a.id).sort().join(',')
    const existingItem = orderItems.find(item =>
      item.id === menuItem.id &&
      (item.addons || []).map(a => a.id).sort().join(',') === addonsKey
    )

    if (existingItem) {
      setOrderItems(prev =>
        prev.map(item =>
          item === existingItem
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setOrderItems(prev => [
        ...prev,
        {
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          category: menuItem.category,
          quantity: 1,
          addons: addons
        }
      ])
    }
  }

  const removeMenuItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeMenuItem(index)
    } else {
      setOrderItems(prev =>
        prev.map((item, i) =>
          i === index ? { ...item, quantity } : item
        )
      )
    }
  }

  const clearCart = () => {
    if (confirm('Are you sure you want to clear all items?')) {
      setOrderItems([])
    }
  }

  const getItemTotal = (item: OrderItem) => {
    const itemPrice = item.price * item.quantity
    const addonsPrice = (item.addons || []).reduce((sum, addon) => sum + addon.price, 0) * item.quantity
    return itemPrice + addonsPrice
  }

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.tableType || !formData.orderType) {
      alert('Please fill in all required fields.')
      return
    }

    if (orderItems.length === 0) {
      alert('Please add at least one item to the order.')
      return
    }

    // Update existing order
    const updatedOrder = {
      id: orderId,
      sessionId: formData.sessionId,
      tableType: formData.tableType,
      orderType: formData.orderType,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      deviceInfo: formData.deviceInfo,
      paymentMethod: formData.paymentMethod,
      specialInstructions: formData.specialInstructions,
      notes: formData.notes,
      status: formData.status,
      orderItems: orderItems,
      subtotal,
      tax,
      grandTotal,
      updatedAt: new Date().toISOString()
    }

    // Save to localStorage for demo
    const savedOrders = localStorage.getItem('orders')
    let orders = savedOrders ? JSON.parse(savedOrders) : []

    const index = orders.findIndex((o: any) => o.sessionId === `#${orderId}` || o.id === orderId)
    if (index !== -1) {
      orders[index] = updatedOrder
    } else {
      orders.push(updatedOrder)
    }

    localStorage.setItem('orders', JSON.stringify(orders))

    alert(`Order ${formData.sessionId} has been updated successfully!`)
    window.location.href = '/admin/orders'
  }

  const saveDraft = () => {
    const draft = {
      form: formData,
      orderItems: orderItems
    }
    localStorage.setItem('orderDraft', JSON.stringify(draft))
    alert('Draft saved successfully!')
  }

  const goBack = () => {
    window.history.back()
  }

  if (isLoading) {
    return (
      <AdminLayout
        pageTitle="Loading..."
        pageSubtitle="Please wait"
      >
        <div className="flex flex-col items-center justify-center py-20">
          <LoadingSpinner type="branded" size="xl" />
          <p className="mt-4 text-[#5c5752]">Loading order data...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      pageTitle={`Edit Order ${formData.sessionId}`}
      pageSubtitle="Modify existing order details"
    >
      {/* Back Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4 mb-6">
        <button
          onClick={goBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
        >
          <i className="fas fa-arrow-left"></i>
          <span>Back to Orders</span>
        </button>
      </div>

      <form onSubmit={submitForm} className="space-y-8">
        {/* Order Information */}
        <CardWrapper>
          <FormSection
            title="Order Information"
            subtitle="Basic order details and identification"
            icon="receipt"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FormInput
              label="Session ID"
              type="text"
              placeholder="Session ID"
              value={formData.sessionId}
              onChange={() => {}}
              disabled
            />

            <div className="space-y-2">
              <FormSelect
                label="Table/Location"
                placeholder="Select table or service type"
                value={formData.tableType}
                onChange={handleTableChange}
                options={tableOptions}
                required
              />

              {showNewTable && (
                <div className="space-y-3 mt-4 p-4 bg-gray-50 rounded-xl">
                  <FormInput
                    type="text"
                    placeholder="Enter table/area name"
                    value={newCustomTable}
                    onChange={(e) => setNewCustomTable(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={addNewTable}
                      className="px-4 py-2 bg-[#ec7813] text-white rounded-lg hover:bg-[#d66a10] transition-all text-sm font-medium"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={cancelNewTable}
                      className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <FormSelect
              label="Order Type"
              value={formData.orderType}
              onChange={(value) => setFormData(prev => ({ ...prev, orderType: value }))}
              options={orderTypeOptions}
              required
            />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FormSelect
              label="Order Status"
              value={formData.status}
              onChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              options={orderStatusOptions}
              required
            />
          </div>
        </CardWrapper>

        {/* Customer Information */}
        <CardWrapper>
          <FormSection
            title="Customer Information"
            subtitle="Customer details and device information"
            icon="user"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FormInput
              label="Customer Name"
              type="text"
              placeholder="Enter customer name (optional)"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
            />

            <FormInput
              label="Phone Number"
              type="tel"
              placeholder="Enter phone number (optional)"
              value={formData.customerPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
            />

            <FormInput
              label="Device IP Address"
              type="text"
              placeholder="e.g., 192.168.1.45"
              value={formData.deviceInfo.ip}
              onChange={(e) => setFormData(prev => ({ ...prev, deviceInfo: { ...prev.deviceInfo, ip: e.target.value } }))}
            />

            <FormSelect
              label="Device Type"
              value={formData.deviceInfo.type}
              onChange={(value) => setFormData(prev => ({ ...prev, deviceInfo: { ...prev.deviceInfo, type: value } }))}
              options={deviceTypeOptions}
            />
          </div>
        </CardWrapper>

        {/* Order Items */}
        <CardWrapper>
          <FormSection
            title="Order Items"
            subtitle="Add or modify items in this order"
            icon="shopping-cart"
          />

          <div className="mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <label className="block text-sm font-semibold text-gray-900">Available Menu Items</label>
                <div className="relative w-full sm:w-64">
                  <input
                    type="search"
                    placeholder="Search menu..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#ec7813] text-sm"
                  />
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                </div>
              </div>

              {menuItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No menu items available</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedMenuItems).map(([category, items]) => (
                    <div key={category}>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">{category}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-[#ec7813]/30 transition-all cursor-pointer group"
                            onClick={() => openAddonModal(item)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900 group-hover:text-[#ec7813] text-sm truncate pr-2">{item.name}</h5>
                              <i className="fas fa-plus text-gray-400 group-hover:text-[#ec7813] shrink-0"></i>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{item.category}</span>
                                {item.addons && item.addons.length > 0 && (
                                  <span className="text-xs text-[#ec7813]">
                                    +{item.addons.length} add-ons
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-gray-900">₱{item.price.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {orderItems.length > 0 ? (
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-semibold text-gray-900">Selected Items</label>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <i className="fas fa-times text-sm"></i>
                  Clear All
                </button>
              </div>

              <div className="space-y-3">
                {orderItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h6 className="font-medium text-gray-900">{item.name}</h6>
                        <p className="text-sm text-gray-600">{item.category} - ₱{item.price.toFixed(2)} each</p>
                        {item.addons && item.addons.length > 0 && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-1">
                              {item.addons.map((addon) => (
                                <span
                                  key={addon.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-orange-100 text-[#ec7813]"
                                >
                                  {addon.name} (+₱{addon.price.toFixed(2)})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 ml-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(index, item.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center"
                          >
                            <i className="fas fa-minus text-sm"></i>
                          </button>
                          <span className="w-12 text-center font-medium text-gray-900">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(index, item.quantity + 1)}
                            className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center"
                          >
                            <i className="fas fa-plus text-sm"></i>
                          </button>
                        </div>

                        <div className="text-right min-w-[80px]">
                          <p className="font-bold text-gray-900">₱{getItemTotal(item).toFixed(2)}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeMenuItem(index)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-all"
                        >
                          <i className="fas fa-trash text-sm"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="space-y-2 max-w-sm ml-auto">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium text-gray-900">₱{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Tax (12%):</span>
                    <span className="font-medium text-gray-900">₱{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-[#ec7813]">₱{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <i className="fas fa-shopping-cart text-gray-400 text-2xl"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items added</h3>
              <p className="text-gray-600">Click on menu items above to add them to this order</p>
            </div>
          )}
        </CardWrapper>

        {/* Payment & Additional Details */}
        <CardWrapper>
          <FormSection
            title="Payment & Additional Details"
            subtitle="Payment method and special instructions"
            icon="credit-card"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FormSelect
              label="Payment Method"
              placeholder="Select payment method (optional)"
              value={formData.paymentMethod}
              onChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
              options={paymentOptions}
            />

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-900">Payment Status Preview</label>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${formData.paymentMethod ? 'bg-green-500' : 'bg-red-500'}`}
                  ></span>
                  <span className="text-sm font-medium">
                    {formData.paymentMethod
                      ? `Pre-paid (${paymentOptions.find(opt => opt.value === formData.paymentMethod)?.label})`
                      : 'Unpaid - Pay at counter'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <FormTextarea
              label="Special Instructions"
              placeholder="Add any special preparation instructions..."
              value={formData.specialInstructions}
              onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
              rows={3}
              maxLength={500}
              showCharCount
            />

            <FormTextarea
              label="Internal Notes"
              placeholder="Add any internal notes for staff..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>
        </CardWrapper>

        {/* Footer Actions */}
        <CardWrapper>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-left">
              <p className="text-sm text-gray-600">Order Summary:</p>
              <p className="text-lg font-bold text-gray-900">
                {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'} - ₱{grandTotal.toFixed(2)}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={goBack}
                className="w-full sm:w-auto px-8 py-3 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-medium"
              >
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-times text-lg"></i>
                  Cancel
                </span>
              </button>
              <button
                type="button"
                onClick={saveDraft}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all font-medium"
              >
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-file-alt text-lg"></i>
                  Save as Draft
                </span>
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#ec7813] text-white hover:bg-[#d66a10] hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={orderItems.length === 0}
              >
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-save text-lg"></i>
                  Update Order
                </span>
              </button>
            </div>
          </div>
        </CardWrapper>
      </form>

      {/* Addon Modal */}
      <AdminModal
        show={showAddonModal}
        onClose={() => setShowAddonModal(false)}
        title={selectedMenuItem?.name || ''}
        maxWidth="lg"
      >
        {selectedMenuItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{selectedMenuItem.name}</p>
                <p className="text-sm text-gray-500">{selectedMenuItem.category}</p>
              </div>
              <p className="text-xl font-bold text-[#ec7813]">₱{selectedMenuItem.price.toFixed(2)}</p>
            </div>

            {selectedMenuItem.addons && selectedMenuItem.addons.length > 0 && (
              <>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Available Add-ons</h4>
                <div className="space-y-2">
                  {selectedMenuItem.addons.map((addon) => (
                    <label
                      key={addon.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                        isAddonSelected(addon.id)
                          ? 'border-[#ec7813] bg-orange-50'
                          : 'border-gray-200 hover:border-[#ec7813]/30 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAddonSelected(addon.id)}
                        onChange={() => toggleAddon(addon)}
                        className="w-5 h-5 rounded text-[#ec7813] focus:ring-[#ec7813] focus:ring-2"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 block">{addon.name}</span>
                        {addon.description && (
                          <span className="text-xs text-gray-500">{addon.description}</span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-[#ec7813]">+₱{addon.price.toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">Selected add-ons:</span>
                <span className="font-medium text-gray-900">
                  {selectedAddons.length} item(s) - +₱{selectedAddons.reduce((sum, a) => sum + a.price, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={() => setShowAddonModal(false)}
            className="px-6 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={confirmAddons}
            className="px-6 py-2 rounded-xl bg-[#ec7813] text-white hover:bg-[#d66a10] transition-all font-medium"
          >
            <span className="flex items-center gap-2">
              <i className="fas fa-plus"></i>
              Add to Order
            </span>
          </button>
        </div>
      </AdminModal>
    </AdminLayout>
  )
}
