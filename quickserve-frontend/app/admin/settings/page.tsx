'use client'

import { useState, useEffect } from 'react'
import { Store, Clock, Truck, Bell, Upload, Trash2, RotateCcw, Save } from 'lucide-react'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import CardWrapper from '@/components/admin/ui/CardWrapper'
import FormInput from '@/components/admin/forms/FormInput'
import FormSelect from '@/components/admin/forms/FormSelect'
import FormTextarea from '@/components/admin/forms/FormTextarea'
import FormSection from '@/components/admin/forms/FormSection'

interface CafeSettings {
  name: string
  tagline: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  taxRate: number
  currency: string
  timezone: string
  logo: string | null
  openingTime: string
  closingTime: string
  daysOpen: string[]
  allowTakeaway: boolean
  allowDelivery: boolean
  deliveryFee: number
  minOrderAmount: number
  freeDeliveryThreshold: number
}

const timezoneOptions = [
  { value: 'Asia/Manila', label: 'Philippine Time (PST)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
  { value: 'Asia/Tokyo', label: 'Japan Time (JST)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' }
]

const currencyOptions = [
  { value: 'PHP', label: 'Philippine Peso (₱)' },
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'JPY', label: 'Japanese Yen (¥)' }
]

const dayOptions = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
]

const defaultSettings: CafeSettings = {
  name: 'QuickServe Cafe',
  tagline: 'Fresh Coffee, Fast Service',
  email: 'info@quickserve.com',
  phone: '+1 (555) 123-4567',
  address: '123 Cafe Street',
  city: 'Manila',
  state: 'Metro Manila',
  zipCode: '1000',
  country: 'Philippines',
  taxRate: 12,
  currency: 'PHP',
  timezone: 'Asia/Manila',
  logo: null,
  openingTime: '06:00',
  closingTime: '22:00',
  daysOpen: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  allowTakeaway: true,
  allowDelivery: true,
  deliveryFee: 50,
  minOrderAmount: 200,
  freeDeliveryThreshold: 500
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<CafeSettings>(defaultSettings)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'general' | 'operations' | 'delivery' | 'notifications'>('general')

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('cafeSettings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      setSettings(parsed)
      if (parsed.logo) {
        setLogoPreview(parsed.logo)
      }
    }
  }, [])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (JPG, PNG, GIF, or WebP)')
      return
    }

    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File size must be less than 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const logoData = e.target?.result as string
      setLogoPreview(logoData)
      setSettings(prev => ({ ...prev, logo: logoData }))
    }
    reader.readAsDataURL(file)
  }

  const clearLogo = () => {
    setLogoPreview(null)
    setSettings(prev => ({ ...prev, logo: null }))
    const input = document.getElementById('logo-upload') as HTMLInputElement
    if (input) input.value = ''
  }

  const toggleDay = (day: string) => {
    setSettings(prev => ({
      ...prev,
      daysOpen: prev.daysOpen.includes(day)
        ? prev.daysOpen.filter(d => d !== day)
        : [...prev.daysOpen, day]
    }))
  }

  const saveSettings = () => {
    localStorage.setItem('cafeSettings', JSON.stringify(settings))
    alert('Settings saved successfully!')
  }

  const resetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setSettings(defaultSettings)
      setLogoPreview(null)
      localStorage.removeItem('cafeSettings')
      alert('Settings reset to default!')
    }
  }

  return (
    <AdminLayout
      title="Settings"
      pageTitle="Settings"
      pageSubtitle="Manage your cafe configuration and preferences"
    >
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'general'
              ? 'bg-[#d4a574] text-white shadow-md'
              : 'bg-white border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#faf9f7] hover:text-[#2d2a26]'
          }`}
        >
          <Store className="w-4 h-4" />
          General
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'operations'
              ? 'bg-[#d4a574] text-white shadow-md'
              : 'bg-white border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#faf9f7] hover:text-[#2d2a26]'
          }`}
        >
          <Clock className="w-4 h-4" />
          Operations
        </button>
        <button
          onClick={() => setActiveTab('delivery')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'delivery'
              ? 'bg-[#d4a574] text-white shadow-md'
              : 'bg-white border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#faf9f7] hover:text-[#2d2a26]'
          }`}
        >
          <Truck className="w-4 h-4" />
          Delivery
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'notifications'
              ? 'bg-[#d4a574] text-white shadow-md'
              : 'bg-white border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#faf9f7] hover:text-[#2d2a26]'
          }`}
        >
          <Bell className="w-4 h-4" />
          Notifications
        </button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); saveSettings(); }} className="space-y-6">
        {/* General Settings */}
        {activeTab === 'general' && (
          <>
            <CardWrapper className="p-6">
              <FormSection
                title="General Information"
                subtitle="Basic details about your cafe"
                icon="store"
              />

              {/* Logo Upload */}
              <div className="mb-8">
                <div className="bg-[#faf9f7] rounded-xl p-6 border border-[#e8e4df]/60">
                  <label className="block text-sm font-semibold text-[#2d2a26] mb-4">Cafe Logo</label>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="shrink-0">
                      <div className="w-32 h-32 rounded-xl bg-white border-2 border-[#e8e4df]/60 flex items-center justify-center overflow-hidden">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Store className="w-12 h-12 text-[#d4a574]" />
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
                            id="logo-upload"
                            onChange={handleLogoUpload}
                          />
                          <div className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-dashed border-[#d4a574]/30 text-[#d4a574] hover:border-[#d4a574]/50 hover:bg-[#d4a574]/5 transition-all font-medium">
                            <Upload className="w-4 h-4" />
                            <span>Upload Logo</span>
                          </div>
                        </label>
                        <button
                          type="button"
                          onClick={clearLogo}
                          className="px-6 py-3 rounded-xl border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#faf9f7] hover:text-[#2d2a26] transition-all font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-sm text-[#8b8680]">
                        <p>• Recommended: 500x500px square image</p>
                        <p>• Maximum file size: 2MB</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FormInput
                  label="Cafe Name"
                  type="text"
                  placeholder="Enter cafe name"
                  value={settings.name}
                  onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <FormInput
                  label="Tagline"
                  type="text"
                  placeholder="Enter tagline"
                  value={settings.tagline}
                  onChange={(e) => setSettings(prev => ({ ...prev, tagline: e.target.value }))}
                />
                <FormInput
                  label="Email Address"
                  type="email"
                  placeholder="email@example.com"
                  value={settings.email}
                  onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                />
                <FormInput
                  label="Phone Number"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={settings.phone}
                  onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="mt-6">
                <FormTextarea
                  label="Street Address"
                  placeholder="Enter street address"
                  value={settings.address}
                  onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                <FormInput
                  label="City"
                  type="text"
                  placeholder="City"
                  value={settings.city}
                  onChange={(e) => setSettings(prev => ({ ...prev, city: e.target.value }))}
                />
                <FormInput
                  label="State/Province"
                  type="text"
                  placeholder="State"
                  value={settings.state}
                  onChange={(e) => setSettings(prev => ({ ...prev, state: e.target.value }))}
                />
                <FormInput
                  label="ZIP Code"
                  type="text"
                  placeholder="ZIP Code"
                  value={settings.zipCode}
                  onChange={(e) => setSettings(prev => ({ ...prev, zipCode: e.target.value }))}
                />
                <FormInput
                  label="Country"
                  type="text"
                  placeholder="Country"
                  value={settings.country}
                  onChange={(e) => setSettings(prev => ({ ...prev, country: e.target.value }))}
                />
              </div>
            </CardWrapper>

            <CardWrapper className="p-6">
              <FormSection
                title="Financial Settings"
                subtitle="Currency and tax configuration"
                icon="dollar-sign"
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <FormInput
                  label="Tax Rate (%)"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="12"
                  value={settings.taxRate.toString()}
                  onChange={(e) => setSettings(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                  required
                />
                <FormSelect
                  label="Currency"
                  value={settings.currency}
                  onChange={(value) => setSettings(prev => ({ ...prev, currency: value }))}
                  options={currencyOptions}
                  required
                />
                <FormSelect
                  label="Timezone"
                  value={settings.timezone}
                  onChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
                  options={timezoneOptions}
                  required
                />
              </div>
            </CardWrapper>
          </>
        )}

        {/* Operations Settings */}
        {activeTab === 'operations' && (
          <CardWrapper className="p-6">
            <FormSection
              title="Operating Hours"
              subtitle="Set your cafe's business hours"
              icon="clock"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <FormInput
                label="Opening Time"
                type="time"
                value={settings.openingTime}
                onChange={(e) => setSettings(prev => ({ ...prev, openingTime: e.target.value }))}
                required
              />
              <FormInput
                label="Closing Time"
                type="time"
                value={settings.closingTime}
                onChange={(e) => setSettings(prev => ({ ...prev, closingTime: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#2d2a26] mb-3">Days Open</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {dayOptions.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      settings.daysOpen.includes(day.value)
                        ? 'bg-[#d4a574] text-white shadow-md'
                        : 'bg-[#faf9f7] text-[#5c5752] hover:bg-[#f5f0eb] border border-[#e8e4df]/60'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </CardWrapper>
        )}

        {/* Delivery Settings */}
        {activeTab === 'delivery' && (
          <CardWrapper className="p-6">
            <FormSection
              title="Delivery Options"
              subtitle="Configure delivery settings"
              icon="truck"
            />

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-[#e8e4df]/60 hover:bg-[#faf9f7] transition-all bg-white">
                <input
                  type="checkbox"
                  checked={settings.allowTakeaway}
                  onChange={(e) => setSettings(prev => ({ ...prev, allowTakeaway: e.target.checked }))}
                  className="w-5 h-5 rounded text-[#d4a574] focus:ring-[#d4a574] focus:ring-2 border-[#e8e4df]"
                />
                <div>
                  <span className="text-sm font-medium text-[#2d2a26] block">Allow Takeaway Orders</span>
                  <span className="text-xs text-[#8b8680]">Customers can order for pickup</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-[#e8e4df]/60 hover:bg-[#faf9f7] transition-all bg-white">
                <input
                  type="checkbox"
                  checked={settings.allowDelivery}
                  onChange={(e) => setSettings(prev => ({ ...prev, allowDelivery: e.target.checked }))}
                  className="w-5 h-5 rounded text-[#d4a574] focus:ring-[#d4a574] focus:ring-2 border-[#e8e4df]"
                />
                <div>
                  <span className="text-sm font-medium text-[#2d2a26] block">Allow Delivery Orders</span>
                  <span className="text-xs text-[#8b8680]">Customers can order for delivery</span>
                </div>
              </label>

              {settings.allowDelivery && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-[#faf9f7] rounded-xl border border-[#e8e4df]/60">
                  <FormInput
                    label="Delivery Fee"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="50"
                    value={settings.deliveryFee.toString()}
                    onChange={(e) => setSettings(prev => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))}
                  />
                  <FormInput
                    label="Minimum Order Amount"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="200"
                    value={settings.minOrderAmount.toString()}
                    onChange={(e) => setSettings(prev => ({ ...prev, minOrderAmount: parseFloat(e.target.value) || 0 }))}
                  />
                  <FormInput
                    label="Free Delivery Threshold"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="500"
                    value={settings.freeDeliveryThreshold.toString()}
                    onChange={(e) => setSettings(prev => ({ ...prev, freeDeliveryThreshold: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              )}
            </div>
          </CardWrapper>
        )}

        {/* Notifications Settings */}
        {activeTab === 'notifications' && (
          <CardWrapper className="p-6">
            <FormSection
              title="Notification Preferences"
              subtitle="Manage how you receive notifications"
              icon="bell"
            />

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-[#e8e4df]/60 hover:bg-[#faf9f7] transition-all bg-white">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="w-5 h-5 rounded text-[#d4a574] focus:ring-[#d4a574] focus:ring-2 border-[#e8e4df]"
                />
                <div>
                  <span className="text-sm font-medium text-[#2d2a26] block">New Order Notifications</span>
                  <span className="text-xs text-[#8b8680]">Get notified when a new order is placed</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-[#e8e4df]/60 hover:bg-[#faf9f7] transition-all bg-white">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="w-5 h-5 rounded text-[#d4a574] focus:ring-[#d4a574] focus:ring-2 border-[#e8e4df]"
                />
                <div>
                  <span className="text-sm font-medium text-[#2d2a26] block">Payment Confirmations</span>
                  <span className="text-xs text-[#8b8680]">Notify when payments are confirmed</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-[#e8e4df]/60 hover:bg-[#faf9f7] transition-all bg-white">
                <input
                  type="checkbox"
                  defaultChecked={false}
                  className="w-5 h-5 rounded text-[#d4a574] focus:ring-[#d4a574] focus:ring-2 border-[#e8e4df]"
                />
                <div>
                  <span className="text-sm font-medium text-[#2d2a26] block">Low Inventory Alerts</span>
                  <span className="text-xs text-[#8b8680]">Alert when items are running low</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-[#e8e4df]/60 hover:bg-[#faf9f7] transition-all bg-white">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="w-5 h-5 rounded text-[#d4a574] focus:ring-[#d4a574] focus:ring-2 border-[#e8e4df]"
                />
                <div>
                  <span className="text-sm font-medium text-[#2d2a26] block">Daily Sales Summary</span>
                  <span className="text-xs text-[#8b8680]">Receive daily sales reports via email</span>
                </div>
              </label>
            </div>

            <div className="mt-6 p-4 bg-[#faf9f7] rounded-xl border border-[#e8e4df]/60">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#d4a574]/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-[#d4a574]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#2d2a26]">Email Notifications</p>
                  <p className="text-sm text-[#8b8680] mt-1">
                    Notifications will be sent to {settings.email}
                  </p>
                </div>
              </div>
            </div>
          </CardWrapper>
        )}

        {/* Actions */}
        <CardWrapper className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={resetSettings}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#ef4444]/20 text-[#ef4444] hover:bg-[#fef2f2] transition-all font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#d4a574] text-white hover:bg-[#c49665] hover:shadow-md transition-all font-semibold"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </CardWrapper>
      </form>
    </AdminLayout>
  )
}
