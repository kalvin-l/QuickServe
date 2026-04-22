'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Coffee, LayoutDashboard, List, ShoppingBag, BarChart3, Users, QrCode, Coffee as CoffeeIcon, Settings, LogOut, ShoppingCart, Package } from 'lucide-react'
import type { AdminUser } from '@/types/admin-auth.types'
import { getNavigationForUser, canUserAccessSettings, isStaffUser, formatUserDepartments } from '@/lib/utils/auth'

export interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
  user?: AdminUser | null
  onLogout?: () => void
}

interface NavItem {
  name: string
  icon: any
  href: string
  badge?: number
}

// Icon mapping for dynamic navigation items
const iconMap: Record<string, any> = {
  LayoutDashboard,
  List,
  ShoppingBag,
  Package,
  BarChart3,
  Users,
  QrCode,
  Coffee: CoffeeIcon,
}

/**
 * AdminSidebar - Fixed sidebar navigation for admin pages
 * Matches customer sidebar design with warm, human-centered aesthetic
 * Navigation items are dynamically filtered based on user role and department
 */
export default function AdminSidebar({ isOpen, onClose, user, onLogout }: AdminSidebarProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get navigation items dynamically based on user role and department
  const navigationItems: NavItem[] = getNavigationForUser(user).map((item) => ({
    ...item,
    icon: iconMap[item.icon] || CoffeeIcon,
  }))

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    }
    onClose()
  }

  const isActive = (href: string) => {
    return pathname === href
  }

  // Check if user is staff (for conditional rendering)
  const isStaff = isStaffUser(user)
  const canShowSettings = canUserAccessSettings(user)

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 flex-col bg-white border-r border-[#e8e4df]/60 z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 flex' : '-translate-x-full lg:translate-x-0 flex'
        }`}
      >
        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2d2a26] rounded-xl flex items-center justify-center">
              <Coffee className="w-5 h-5 text-[#faf9f7]" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#2d2a26] tracking-tight">
                QuickServe
              </h1>
              <p className="text-[11px] text-[#8b8680]">
                {isStaff ? 'Staff Portal' : 'Admin Panel'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          {/* Main Menu - Hide if no navigation items */}
          {navigationItems.length > 0 && (
            <div>
              <h2 className="text-[10px] font-medium text-[#8b8680] tracking-[0.15em] uppercase mb-3 px-3">
                {isStaff ? 'My Station' : 'Main Menu'}
              </h2>
              <ul className="space-y-0.5">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                          isActive(item.href)
                            ? 'bg-[#d4a574] text-white font-medium'
                            : 'text-[#5c5752] hover:bg-[#f5f0eb]'
                        }`}
                        onClick={onClose}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className="ml-auto w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Quick Stats Section - Hide for staff users */}
          {!isStaff && (
            <div>
              <h2 className="text-[10px] font-medium text-[#8b8680] tracking-[0.15em] uppercase mb-3 px-3">
                Today's Stats
              </h2>
              <div className="px-3 space-y-2">
                <div className="p-2.5 bg-[#eff6ff] rounded-lg border border-[#dbeafe]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-[#3b82f6]" />
                      <span className="text-[11px] text-[#1e40af] font-medium">Orders</span>
                    </div>
                    <span className="text-xs font-semibold text-[#1e40af]">24</span>
                  </div>
                </div>
                <div className="p-2.5 bg-[#f0fdf4] rounded-lg border border-[#dcfce7]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">₱</span>
                      <span className="text-[11px] text-[#166534] font-medium">Revenue</span>
                    </div>
                    <span className="text-xs font-semibold text-[#166534]">₱8,420</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Settings & Logout at bottom */}
        <div className="p-4 border-t border-[#e8e4df]/60 space-y-0.5">
          {/* User Info */}
          {mounted && user && (
            <div className="mb-3 px-3 py-2.5 bg-[#faf9f7] rounded-lg">
              <p className="text-xs font-medium text-[#2d2a26]">{user.name}</p>
              <p className="text-[10px] text-[#8b8680]">{user.email}</p>
              <span className="inline-block mt-1 text-[9px] px-2 py-0.5 bg-[#d4a574]/10 text-[#d4a574] rounded-full uppercase font-bold tracking-wider">
                {user.role}
                {formatUserDepartments(user) && ` • ${formatUserDepartments(user)}`}
              </span>
            </div>
          )}
          {/* Settings - Only for admin/manager */}
          {canShowSettings && (
            <Link
              href="/admin/settings"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive('/admin/settings')
                  ? 'bg-[#d4a574] text-white font-medium'
                  : 'text-[#5c5752] hover:bg-[#f5f0eb]'
              }`}
              onClick={onClose}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#ef4444] hover:bg-[#fef2f2] transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
