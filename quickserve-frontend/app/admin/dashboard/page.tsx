'use client'

import React from 'react'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import CardWrapper from '@/components/admin/ui/CardWrapper'
import {
  TrendingUp, TrendingDown, Users, Coffee, Star,
  Smartphone, ArrowRight, Clock, Package,
  ChevronRight, MoreHorizontal
} from 'lucide-react'

// Static data for dashboard
const stats = {
  revenue: { value: 15420, growth: 12.5, label: 'Today\'s Revenue' },
  orders: { value: 48, growth: 8.2, label: 'Orders Today' },
  devices: { value: 12, growth: 0, label: 'Active Devices' },
  rating: { value: 4.7, growth: 0.2, label: 'Avg Rating' }
}

const topProducts = [
  { name: 'Caramel Macchiato', orders: 24, revenue: 6720, trend: 'up' },
  { name: 'Iced Americano', orders: 18, revenue: 3240, trend: 'stable' },
  { name: 'Spanish Latte', orders: 15, revenue: 4050, trend: 'up' },
  { name: 'Matcha Latte', orders: 12, revenue: 3360, trend: 'down' },
  { name: 'Cold Brew', orders: 10, revenue: 2200, trend: 'up' }
]

const recentOrders = [
  { id: '1', order_number: 'QS-001', device_info: 'Table 5', items_count: 3, total: 450, status: 'completed', created_at: '2m ago' },
  { id: '2', order_number: 'QS-002', device_info: 'Table 3', items_count: 2, total: 320, status: 'preparing', created_at: '5m ago' },
  { id: '3', order_number: 'QS-003', device_info: 'Table 7', items_count: 5, total: 890, status: 'received', created_at: '8m ago' },
  { id: '4', order_number: 'QS-004', device_info: 'Takeout', items_count: 1, total: 180, status: 'served', created_at: '12m ago' },
  { id: '5', order_number: 'QS-005', device_info: 'Table 2', items_count: 4, total: 650, status: 'preparing', created_at: '15m ago' }
]

const quickActions = [
  { label: 'New Order', icon: Package, color: '#d4a574' },
  { label: 'Add Product', icon: Coffee, color: '#8b8680' },
  { label: 'View Reports', icon: TrendingUp, color: '#22c55e' }
]

// Format currency helper
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0
  }).format(amount)
}

// Get status badge styles
function getStatusBadgeStyle(status: string): string {
  switch (status) {
    case 'completed':
    case 'served':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'preparing':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'received':
    case 'new':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

// Stat Card Component
function StatCard({ stat, index }: { stat: typeof stats.revenue & { label: string }; index: number }) {
  const icons = [TrendingUp, Package, Smartphone, Star]
  const Icon = icons[index % icons.length]
  const isPositive = stat.growth >= 0

  return (
    <CardWrapper className="group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-[#8b8680] uppercase tracking-wider">
            {stat.label}
          </p>
          <p className="text-2xl font-bold text-[#2d2a26] mt-1 tracking-tight">
            {index === 0 ? formatCurrency(stat.value) : index === 3 ? stat.value.toFixed(1) : stat.value}
          </p>
          <div className={`flex items-center gap-1 mt-1.5 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span className="text-xs font-medium">
              {isPositive ? '+' : ''}{stat.growth}{index === 3 ? '' : '%'}
            </span>
            <span className="text-xs text-[#8b8680] ml-1">vs yesterday</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#d4a574]" />
        </div>
      </div>
    </CardWrapper>
  )
}

export default function DashboardPage() {
  return (
    <AdminLayout
      title="Admin Dashboard"
      pageTitle="Dashboard"
      pageSubtitle="Here's what's happening today"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Quick Actions Row */}
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e8e4df]/60 rounded-xl text-sm font-medium text-[#2d2a26] hover:bg-[#faf9f7] transition-all active:scale-[0.98]"
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${action.color}15` }}
              >
                <action.icon className="w-3.5 h-3.5" style={{ color: action.color }} />
              </div>
              {action.label}
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard stat={{ ...stats.revenue, label: stats.revenue.label }} index={0} />
          <StatCard stat={{ ...stats.orders, label: stats.orders.label }} index={1} />
          <StatCard stat={{ ...stats.devices, label: stats.devices.label }} index={2} />
          <StatCard stat={{ ...stats.rating, label: stats.rating.label }} index={3} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Sales Overview - Takes 2 columns */}
          <CardWrapper className="xl:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#d4a574]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2d2a26] tracking-tight">Sales Overview</h3>
                  <p className="text-xs text-[#8b8680]">Revenue trends this week</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-[#d4a574] text-white text-xs font-medium rounded-lg">
                  Week
                </button>
                <button className="px-3 py-1.5 text-[#8b8680] text-xs font-medium rounded-lg hover:bg-[#faf9f7]">
                  Month
                </button>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="relative h-64 bg-[#faf9f7] rounded-xl border border-[#e8e4df]/60 overflow-hidden">
              <div className="absolute inset-0 flex items-end justify-around px-4 pb-4">
                {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div
                      className="w-8 bg-[#d4a574]/20 rounded-t-lg relative overflow-hidden"
                      style={{ height: `${height}%` }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-[#d4a574] rounded-t-lg transition-all duration-500"
                        style={{ height: `${height * 0.6}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#8b8680]">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart Legend */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#d4a574]" />
                <span className="text-xs text-[#8b8680]">This Week</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#d4a574]/20" />
                <span className="text-xs text-[#8b8680]">Last Week</span>
              </div>
            </div>
          </CardWrapper>

          {/* Top Products - Takes 1 column */}
          <CardWrapper>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                  <Coffee className="w-4 h-4 text-[#d4a574]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2d2a26] tracking-tight">Top Products</h3>
                  <p className="text-xs text-[#8b8680]">Best sellers today</p>
                </div>
              </div>
              <button className="p-1.5 hover:bg-[#faf9f7] rounded-lg transition-colors">
                <MoreHorizontal className="w-4 h-4 text-[#8b8680]" />
              </button>
            </div>

            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#faf9f7] transition-colors group cursor-pointer"
                >
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                    ${index === 0 ? 'bg-[#d4a574] text-white' : ''}
                    ${index === 1 ? 'bg-[#8b8680] text-white' : ''}
                    ${index === 2 ? 'bg-[#d4a574]/30 text-[#d4a574]' : ''}
                    ${index >= 3 ? 'bg-[#faf9f7] text-[#8b8680] border border-[#e8e4df]/60' : ''}
                  `}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#2d2a26] text-sm truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-[#8b8680]">
                      {product.orders} orders
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#2d2a26] text-sm">
                      {formatCurrency(product.revenue)}
                    </p>
                    {product.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500 ml-auto" />}
                    {product.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500 ml-auto" />}
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 py-2.5 flex items-center justify-center gap-1.5 text-sm font-medium text-[#d4a574] hover:bg-[#faf9f7] rounded-xl transition-colors">
              View All Products
              <ArrowRight className="w-4 h-4" />
            </button>
          </CardWrapper>
        </div>

        {/* Recent Orders Section */}
        <CardWrapper>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#d4a574]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#2d2a26] tracking-tight">Recent Orders</h3>
                <p className="text-xs text-[#8b8680]">Latest {recentOrders.length} orders from customers</p>
              </div>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 bg-[#2d2a26] hover:bg-[#3d3a36] text-white text-sm font-medium rounded-xl transition-all active:scale-[0.98]">
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[#e8e4df]/60">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Order</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Location</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Items</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Total</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e4df]/40">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="group hover:bg-[#faf9f7]/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#2d2a26] text-sm">#{order.order_number}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-sm text-[#5c5752]">{order.device_info}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-sm text-[#8b8680]">{order.items_count} items</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-[#2d2a26] text-sm">{formatCurrency(order.total)}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`
                        inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize
                        ${getStatusBadgeStyle(order.status)}
                      `}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 text-[#8b8680]">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-sm">{order.created_at}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardWrapper>
      </div>
    </AdminLayout>
  )
}
