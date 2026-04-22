'use client'

/**
 * EmptyCart Component
 *
 * Full-page empty cart state with warm, human-centered design
 */

import React from 'react'
import Link from 'next/link'
import { ShoppingBag, ArrowRight } from 'lucide-react'

export default function EmptyCart() {
  return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        {/* Empty Cart Icon with offset shadow */}
        <div className="relative mx-auto mb-6 w-24 h-24">
          <div className="absolute inset-0 translate-x-1 translate-y-1 bg-[#d4a574]/20 rounded-full" />
          <div className="relative w-24 h-24 rounded-full bg-white border border-[#e8e4df]/60 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-[#d4a574]" />
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-[#2d2a26] tracking-tight mb-2">
          Your cart is empty
        </h2>
        <p className="text-[#8b8680] mb-6 text-sm leading-relaxed">
          Add some delicious items from our menu to get started with your order
        </p>

        <Link 
          href="/menu"
          className="inline-flex items-center gap-2 bg-[#2d2a26] text-white font-semibold py-3 px-6 rounded-xl hover:bg-[#3d3a36] active:scale-[0.98] transition-all"
        >
          Browse Menu
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
