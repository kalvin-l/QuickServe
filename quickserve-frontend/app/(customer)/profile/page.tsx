'use client'

/**
 * Profile Page
 *
 * User profile and settings
 */

import React from 'react'
import { useCart } from '@/features/cart'
import { formatPrice } from '@/lib/utils'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/card/Card'

export default function ProfilePage() {
  const { total: cartTotal, itemCount, isLoading } = useCart()

  return (
    <div className="min-h-screen bg-surface-50 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-display text-surface-900">
            Profile
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            Manage your account settings
          </p>
        </div>

        {/* User Info Card */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <i className="fas fa-user text-2xl text-primary"></i>
              </div>
              <div>
                <h3 className="font-semibold text-surface-900">Guest User</h3>
                <p className="text-sm text-surface-500">
                  Sign in to access all features
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                {isLoading ? (
                  <div className="h-9 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-primary">{itemCount}</p>
                )}
                <p className="text-sm text-surface-500">Items in Cart</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                {isLoading ? (
                  <div className="h-9 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-primary">{formatPrice(cartTotal)}</p>
                )}
                <p className="text-sm text-surface-500">Cart Total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 transition-colors">
                <div className="flex items-center gap-3">
                  <i className="fas fa-bell text-surface-400"></i>
                  <span className="text-surface-700">Notifications</span>
                </div>
                <i className="fas fa-chevron-right text-surface-300"></i>
              </button>

              <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 transition-colors">
                <div className="flex items-center gap-3">
                  <i className="fas fa-map-marker-alt text-surface-400"></i>
                  <span className="text-surface-700">Delivery Addresses</span>
                </div>
                <i className="fas fa-chevron-right text-surface-300"></i>
              </button>

              <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 transition-colors">
                <div className="flex items-center gap-3">
                  <i className="fas fa-credit-card text-surface-400"></i>
                  <span className="text-surface-700">Payment Methods</span>
                </div>
                <i className="fas fa-chevron-right text-surface-300"></i>
              </button>

              <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 transition-colors">
                <div className="flex items-center gap-3">
                  <i className="fas fa-question-circle text-surface-400"></i>
                  <span className="text-surface-700">Help & Support</span>
                </div>
                <i className="fas fa-chevron-right text-surface-300"></i>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center mt-6 text-sm text-surface-400">
          <p>QuickServe v1.0.0</p>
          <p className="mt-1">Made with ❤️ for coffee lovers</p>
        </div>
      </div>
    </div>
  )
}
