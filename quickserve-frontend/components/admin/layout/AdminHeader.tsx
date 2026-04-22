'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Menu, RefreshCw, Bell, ChevronDown, LogOut, Coffee } from 'lucide-react'
import type { AdminUser } from '@/types/admin-auth.types'

export interface AdminHeaderProps {
  pageTitle?: string
  pageSubtitle?: string
  onToggleSidebar: () => void
  user?: AdminUser | null
  onLogout?: () => void
}

/**
 * AdminHeader - Header component with page title, actions, and user menu
 * Matches customer sidebar design with warm, human-centered aesthetic
 */
export default function AdminHeader({
  pageTitle = 'Dashboard',
  pageSubtitle = 'Welcome back, Admin',
  onToggleSidebar,
  user,
  onLogout
}: AdminHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const userName = (mounted && user?.name) || 'Admin'
  const userEmail = (mounted && user?.email) || 'admin@quickserve.com'

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu)
  }

  const closeUserMenu = () => {
    setShowUserMenu(false)
  }

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    }
    closeUserMenu()
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeUserMenu()
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  return (
    <header className="bg-white/95 backdrop-blur-md sticky top-0 z-20 border-b border-[#e8e4df]/60 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            className="lg:hidden w-9 h-9 rounded-lg bg-[#f5f0eb] hover:bg-[#ebe5de] text-[#5c5752] hover:text-[#2d2a26] transition-all flex items-center justify-center active:scale-95"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Page title */}
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-[#2d2a26] tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-[#8b8680] text-xs">{pageSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button - hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#d4a574] hover:bg-[#c49665] text-white transition-all shadow-md active:scale-95"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Refresh</span>
            </button>
          </div>

          {/* Notifications */}
          <button className="relative w-9 h-9 rounded-lg bg-[#f5f0eb] hover:bg-[#ebe5de] text-[#5c5752] hover:text-[#2d2a26] transition-all flex items-center justify-center active:scale-95">
            <Bell className="w-4 h-4" />
            <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#ef4444] text-white text-[10px] rounded-full flex items-center justify-center shadow-md font-bold">
              3
            </div>
          </button>

          {/* Status Indicator - hidden on smaller screens */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f0fdf4] border border-[#dcfce7]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#22c55e]"></span>
            </span>
            <span className="text-[#166534] text-xs font-medium">Online</span>
          </div>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={toggleUserMenu}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[#f5f0eb] transition-all active:scale-95"
            >
              <div className="w-8 h-8 rounded-lg bg-[#2d2a26] text-white flex items-center justify-center font-semibold text-xs shadow-md">
                {userName.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-[#2d2a26]">{userName}</p>
                <p className="text-[10px] text-[#8b8680]">{userEmail}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#8b8680] transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl shadow-[#e8e4df]/50 border border-[#e8e4df]/60 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2 border-b border-[#e8e4df]/60 bg-[#faf9f7] rounded-t-lg">
                  <p className="text-xs font-semibold text-[#2d2a26]">{userName}</p>
                  <p className="text-[10px] text-[#8b8680] truncate">{userEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-[#ef4444] hover:bg-[#fef2f2] transition-all rounded-b-lg"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
