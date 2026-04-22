'use client'

import React from 'react'
import { getGreeting } from '@/lib/utils'

/**
 * WelcomeBanner - Human-centered design with warm, editorial aesthetic
 */
export default function WelcomeBanner() {
  return (
    <div className="relative mx-4 sm:mx-6 lg:mx-8 mt-4 sm:mt-6">
      {/* Card with subtle shadow */}
      <div className="relative">
        <div className="absolute inset-0 bg-[#d4a574]/20 rounded-2xl translate-x-0.5 translate-y-0.5" />
        <div className="relative bg-white rounded-2xl p-6 sm:p-8 border border-[#e8e4df]/60 shadow-sm">
          <div className="max-w-3xl">
            {/* Greeting */}
            <div className="mb-4">
              <p className="text-[10px] font-medium text-[#d4a574] tracking-[0.2em] uppercase mb-2">
                {getGreeting()}
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#2d2a26] tracking-tight leading-tight">
                What would you like today?
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-sm text-[#8b8680] leading-relaxed mb-6 max-w-lg">
              Freshly brewed coffee, artisan pastries, and more. Made with care, served to your table.
            </p>

            {/* Info Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Open Status */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f0eb] rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                <span className="text-[10px] font-medium text-green-700 uppercase tracking-wide">Open</span>
              </div>

              {/* Hours */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#faf9f7] border border-[#e8e4df] rounded-full">
                <svg className="w-3 h-3 text-[#8b8680]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] font-medium text-[#5c5752]">7AM — 10PM</span>
              </div>

              {/* Location */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#faf9f7] border border-[#e8e4df] rounded-full">
                <svg className="w-3 h-3 text-[#8b8680]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[10px] font-medium text-[#5c5752]">Downtown</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
