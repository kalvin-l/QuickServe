'use client'

import { useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, Download, Printer, Calendar,
  DollarSign, ShoppingCart, Coffee, Calculator, ArrowUpRight,
  ArrowDownRight, PieChart, Clock, CreditCard, Package
} from 'lucide-react'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import CardWrapper from '@/components/admin/ui/CardWrapper'
import { formatDate } from '@/lib/utils'

// Sample data for reports
const salesData = [
  { date: '2024-01-15', revenue: 15420, orders: 87, items: 156 },
  { date: '2024-01-14', revenue: 18230, orders: 103, items: 198 },
  { date: '2024-01-13', revenue: 16540, orders: 92, items: 175 },
  { date: '2024-01-12', revenue: 19800, orders: 115, items: 225 },
  { date: '2024-01-11', revenue: 17250, orders: 98, items: 188 },
  { date: '2024-01-10', revenue: 14560, orders: 81, items: 148 },
  { date: '2024-01-09', revenue: 16890, orders: 95, items: 182 }
]

const topSellingItems = [
  { id: 1, name: 'Caramel Macchiato', category: 'Coffee', orders: 245, revenue: 35525, growth: 12.5 },
  { id: 2, name: 'Iced Americano', category: 'Coffee', orders: 198, revenue: 21780, growth: 8.3 },
  { id: 3, name: 'Matcha Latte', category: 'Tea', orders: 156, revenue: 24180, growth: 15.2 },
  { id: 4, name: 'Chocolate Croissant', category: 'Pastries', orders: 143, revenue: 12155, growth: -2.1 },
  { id: 5, name: 'Club Sandwich', category: 'Sandwiches', orders: 128, revenue: 23040, growth: 6.7 },
  { id: 6, name: 'Tiramisu', category: 'Desserts', orders: 112, revenue: 15680, growth: 9.4 },
  { id: 7, name: 'Cappuccino', category: 'Coffee', orders: 109, revenue: 13625, growth: 3.8 },
  { id: 8, name: 'Blueberry Muffin', category: 'Pastries', orders: 98, revenue: 7350, growth: -1.5 }
]

const categoryData = [
  { category: 'Coffee', orders: 658, revenue: 98545, percentage: 52, color: 'bg-[#d4a574]', lightColor: 'bg-[#d4a574]/20' },
  { category: 'Tea', orders: 198, revenue: 30780, percentage: 16, color: 'bg-green-500', lightColor: 'bg-green-100' },
  { category: 'Pastries', orders: 287, revenue: 21415, percentage: 11, color: 'bg-amber-500', lightColor: 'bg-amber-100' },
  { category: 'Sandwiches', orders: 156, revenue: 28080, percentage: 15, color: 'bg-blue-500', lightColor: 'bg-blue-100' },
  { category: 'Desserts', orders: 134, revenue: 11760, percentage: 6, color: 'bg-pink-500', lightColor: 'bg-pink-100' }
]

const hourlyData = [
  { hour: '6AM', orders: 12, revenue: 1680 },
  { hour: '7AM', orders: 28, revenue: 3920 },
  { hour: '8AM', orders: 45, revenue: 6300 },
  { hour: '9AM', orders: 38, revenue: 5320 },
  { hour: '10AM', orders: 52, revenue: 7280 },
  { hour: '11AM', orders: 48, revenue: 6720 },
  { hour: '12PM', orders: 65, revenue: 9100 },
  { hour: '1PM', orders: 58, revenue: 8120 },
  { hour: '2PM', orders: 42, revenue: 5880 },
  { hour: '3PM', orders: 35, revenue: 4900 },
  { hour: '4PM', orders: 28, revenue: 3920 },
  { hour: '5PM', orders: 22, revenue: 3080 },
  { hour: '6PM', orders: 18, revenue: 2520 },
  { hour: '7PM', orders: 15, revenue: 2100 },
  { hour: '8PM', orders: 12, revenue: 1680 }
]

const paymentMethodData = [
  { method: 'Cash', orders: 345, revenue: 48300, percentage: 38, color: 'bg-green-500', icon: DollarSign },
  { method: 'Credit/Debit Card', orders: 287, revenue: 40180, percentage: 32, color: 'bg-blue-500', icon: CreditCard },
  { method: 'E-Wallet (GCash)', orders: 398, revenue: 55720, percentage: 44, color: 'bg-purple-500', icon: CreditCard },
  { method: 'QR Payment', orders: 156, revenue: 21840, percentage: 17, color: 'bg-[#d4a574]', icon: Package }
]

const dateRangeOptions = [
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '90days', label: 'Last 90 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' }
]

const reportTypeOptions = [
  { value: 'overview', label: 'Overview' },
  { value: 'sales', label: 'Sales Report' },
  { value: 'items', label: 'Item Performance' },
  { value: 'categories', label: 'Category Analysis' },
  { value: 'payments', label: 'Payment Methods' },
  { value: 'hourly', label: 'Hourly Breakdown' }
]

// Format currency helper
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0
  }).format(amount)
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7days')
  const [reportType, setReportType] = useState('overview')

  // Calculate totals
  const totalRevenue = useMemo(() => salesData.reduce((sum, d) => sum + d.revenue, 0), [])
  const totalOrders = useMemo(() => salesData.reduce((sum, d) => sum + d.orders, 0), [])
  const totalItems = useMemo(() => salesData.reduce((sum, d) => sum + d.items, 0), [])
  const avgOrderValue = useMemo(() => totalRevenue / totalOrders, [totalRevenue, totalOrders])

  const maxHourlyOrders = Math.max(...hourlyData.map(d => d.orders))

  const exportReport = () => {
    alert('Exporting report... (Functionality to be implemented)')
  }

  const printReport = () => {
    window.print()
  }

  // Metric card data
  const metrics = [
    {
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'green'
    },
    {
      label: 'Total Orders',
      value: totalOrders.toString(),
      change: '+8.3%',
      trend: 'up',
      icon: ShoppingCart,
      color: 'blue'
    },
    {
      label: 'Items Sold',
      value: totalItems.toString(),
      change: '+5.2%',
      trend: 'up',
      icon: Coffee,
      color: 'purple'
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(avgOrderValue),
      change: '+3.8%',
      trend: 'up',
      icon: Calculator,
      color: 'amber'
    }
  ]

  return (
    <AdminLayout
      title="Analytics & Reports"
      pageTitle="Analytics & Reports"
      pageSubtitle="View detailed sales analytics and performance reports"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b8680]" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="pl-10 pr-4 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-white text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 text-sm transition-all"
              >
                {dateRangeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-white text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20 text-sm transition-all"
            >
              {reportTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportReport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 text-[#5c5752] hover:bg-[#f5f0eb] transition-all text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={printReport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2d2a26] text-white hover:bg-[#3d3a36] transition-all text-sm font-medium"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <CardWrapper key={metric.label} className="!p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#8b8680] uppercase tracking-wider">{metric.label}</p>
                  <p className="text-2xl font-bold text-[#2d2a26] tracking-tight mt-1">{metric.value}</p>
                  <div className={`flex items-center gap-1 mt-1 ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <span className="text-xs font-medium">{metric.change}</span>
                    <span className="text-xs text-[#8b8680]">vs last week</span>
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  metric.color === 'green' ? 'bg-green-100' :
                  metric.color === 'blue' ? 'bg-blue-100' :
                  metric.color === 'purple' ? 'bg-purple-100' :
                  'bg-amber-100'
                }`}>
                  <metric.icon className={`w-5 h-5 ${
                    metric.color === 'green' ? 'text-green-600' :
                    metric.color === 'blue' ? 'text-blue-600' :
                    metric.color === 'purple' ? 'text-purple-600' :
                    'text-amber-600'
                  }`} />
                </div>
              </div>
            </CardWrapper>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Revenue Trend Chart */}
            <CardWrapper>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-[#d4a574]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#2d2a26] tracking-tight">Revenue Trend</h3>
                    <p className="text-xs text-[#8b8680]">Last 7 days performance</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#d4a574]" />
                    <span className="text-xs text-[#8b8680]">Revenue</span>
                  </div>
                </div>
              </div>

              {/* Bar chart */}
              <div className="space-y-3">
                {salesData.map((day) => {
                  const maxValue = Math.max(...salesData.map(d => d.revenue))
                  const barWidth = (day.revenue / maxValue) * 100

                  return (
                    <div key={day.date} className="flex items-center gap-3">
                      <div className="w-16 text-xs text-[#8b8680] shrink-0">
                        {formatDate(day.date)}
                      </div>
                      <div className="flex-1 h-7 bg-[#faf9f7] rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-[#d4a574] rounded-lg transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <div className="w-20 text-xs font-medium text-[#2d2a26] text-right shrink-0">
                        {formatCurrency(day.revenue)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardWrapper>

            {/* Top Selling Items */}
            <CardWrapper>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                    <Package className="w-4 h-4 text-[#d4a574]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#2d2a26] tracking-tight">Top Selling Items</h3>
                    <p className="text-xs text-[#8b8680]">By revenue</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-[#e8e4df]/60">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Item</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Category</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Orders</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Revenue</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-[#8b8680] uppercase tracking-wider">Growth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e4df]/40">
                    {topSellingItems.map((item, index) => (
                      <tr key={item.id} className="hover:bg-[#faf9f7]/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
                              ${index === 0 ? 'bg-[#d4a574] text-white' : ''}
                              ${index === 1 ? 'bg-[#8b8680] text-white' : ''}
                              ${index === 2 ? 'bg-[#d4a574]/30 text-[#d4a574]' : ''}
                              ${index >= 3 ? 'bg-[#faf9f7] text-[#8b8680] border border-[#e8e4df]/60' : ''}
                            `}>
                              {index + 1}
                            </div>
                            <span className="font-medium text-[#2d2a26] text-sm">{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-1 bg-[#faf9f7] text-[#5c5752] rounded-lg text-xs">{item.category}</span>
                        </td>
                        <td className="py-3 px-3 text-right text-sm text-[#2d2a26]">{item.orders}</td>
                        <td className="py-3 px-3 text-right font-medium text-[#2d2a26] text-sm">{formatCurrency(item.revenue)}</td>
                        <td className="py-3 px-3 text-right">
                          <span className={`text-xs font-medium flex items-center justify-end gap-1 ${item.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {item.growth >= 0 ? '+' : ''}{item.growth}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardWrapper>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sales by Category */}
            <CardWrapper>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                  <PieChart className="w-4 h-4 text-[#d4a574]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2d2a26] tracking-tight">Sales by Category</h3>
                  <p className="text-xs text-[#8b8680]">Revenue breakdown</p>
                </div>
              </div>

              <div className="space-y-4">
                {categoryData.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                        <span className="text-sm font-medium text-[#2d2a26]">{cat.category}</span>
                      </div>
                      <span className="text-xs font-semibold text-[#2d2a26]">{cat.percentage}%</span>
                    </div>
                    <div className="h-2 bg-[#faf9f7] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-[#8b8680]">
                      <span>{cat.orders} orders</span>
                      <span>{formatCurrency(cat.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardWrapper>

            {/* Payment Methods */}
            <CardWrapper>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-[#d4a574]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2d2a26] tracking-tight">Payment Methods</h3>
                  <p className="text-xs text-[#8b8680]">Transaction breakdown</p>
                </div>
              </div>

              <div className="space-y-3">
                {paymentMethodData.map((payment) => (
                  <div key={payment.method} className="flex items-center gap-3 p-3 bg-[#faf9f7] rounded-xl border border-[#e8e4df]/40">
                    <div className={`w-10 h-10 rounded-xl ${payment.color} flex items-center justify-center flex-shrink-0`}>
                      <payment.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#2d2a26] text-sm">{payment.method}</span>
                        <span className="text-xs font-semibold text-[#2d2a26]">{payment.percentage}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#8b8680] mt-0.5">
                        <span>{payment.orders} orders</span>
                        <span>{formatCurrency(payment.revenue)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardWrapper>

            {/* Hourly Breakdown */}
            <CardWrapper>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#faf9f7] border border-[#e8e4df]/60 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-[#d4a574]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2d2a26] tracking-tight">Peak Hours</h3>
                  <p className="text-xs text-[#8b8680]">Orders by time</p>
                </div>
              </div>

              <div className="space-y-2">
                {hourlyData.map((hour) => {
                  const barHeight = (hour.orders / maxHourlyOrders) * 100

                  return (
                    <div key={hour.hour} className="flex items-center gap-3">
                      <div className="w-10 text-xs text-[#8b8680] font-medium">{hour.hour}</div>
                      <div className="flex-1 h-10 bg-[#faf9f7] rounded-lg relative overflow-hidden">
                        <div
                          className="absolute bottom-0 w-full bg-[#d4a574]/30 rounded-t transition-all duration-300"
                          style={{ height: `${barHeight}%` }}
                        >
                          <div className="absolute bottom-0 w-full bg-[#d4a574] rounded-t" style={{ height: '60%' }} />
                        </div>
                      </div>
                      <div className="w-14 text-xs text-right">
                        <div className="font-medium text-[#2d2a26]">{hour.orders}</div>
                        <div className="text-[#8b8680]">{formatCurrency(hour.revenue)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardWrapper>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
