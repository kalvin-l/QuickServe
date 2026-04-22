'use client'

import React, { ReactNode, useState, useEffect } from 'react'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'

export interface AdminLayoutProps {
  children: ReactNode
  title?: string
  pageTitle?: string
  pageSubtitle?: string
  showHeader?: boolean
}

/**
 * AdminLayout - Main layout wrapper for admin pages
 * Includes sidebar navigation and header
 *
 * The middleware handles authentication and redirects to login if needed.
 * The login page handles role-based redirects after successful login.
 */
export default function AdminLayout({
  children,
  title = 'Admin Dashboard',
  pageTitle = 'Dashboard',
  pageSubtitle = 'Welcome back, Admin',
  showHeader = true
}: AdminLayoutProps) {
  const { user, logout, isLoading: authLoading, isAuthenticated } = useAdminAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  // Don't render anything if not authenticated (middleware will redirect)
  if (!authLoading && !isAuthenticated) {
    return null
  }

  // Show loading state while checking authentication
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4a574] mx-auto mb-4" />
          <p className="text-sm text-[#8b8680]">Loading...</p>
        </div>
      </div>
    )
  }

  // User is authenticated - render layout
  const displaySubtitle = user?.name
    ? `Welcome back, ${user.name.split(' ')[0]}`
    : pageSubtitle

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        user={user}
        onLogout={logout}
      />

      {/* Main Content */}
      <div className="lg:ml-64 flex flex-col min-h-screen transition-all duration-300">
        {/* Header */}
        {showHeader && (
          <AdminHeader
            pageTitle={pageTitle}
            pageSubtitle={displaySubtitle}
            onToggleSidebar={toggleSidebar}
            user={user}
            onLogout={logout}
          />
        )}

        {/* Page Content */}
        <main className={`flex-1 overflow-y-auto ${showHeader ? 'p-4 sm:p-6 lg:p-8' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
