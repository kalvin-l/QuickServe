'use client'

import React from 'react'
import type { Tab } from '../constants/tabs'

export interface OrdersTabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

/**
 * Tab navigation for Orders page
 * Displays desktop tab navigation and mobile select dropdown
 */
export default function OrdersTabs({ tabs, activeTab, onTabChange }: OrdersTabsProps) {
  return (
    <>
      {/* Desktop Tabs */}
      <div className="hidden sm:flex border-b border-[#e8e4df]/60 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                activeTab === tab.id
                  ? 'border-[#d4a574] text-[#d4a574]'
                  : 'border-transparent text-[#8b8680] hover:text-[#5c5752] hover:border-[#e8e4df]'
              }`}
            >
              <tab.icon
                className={`${
                  activeTab === tab.id ? 'text-[#d4a574]' : 'text-[#8b8680] group-hover:text-[#5c5752]'
                } -ml-0.5 mr-2 h-5 w-5`}
              />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile Tab Dropdown */}
      <select
        value={activeTab}
        onChange={(e) => onTabChange(e.target.value)}
        className="sm:hidden mb-4 px-3 py-2.5 rounded-xl border border-[#e8e4df]/60 bg-white text-[#2d2a26] focus:outline-none focus:border-[#d4a574] focus:ring-2 focus:ring-[#d4a574]/20"
      >
        {tabs.map((tab) => (
          <option key={tab.id} value={tab.id}>
            {tab.label}
          </option>
        ))}
      </select>
    </>
  )
}
