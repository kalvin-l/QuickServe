/**
 * HomePageSkeleton Component
 * Loading skeleton for homepage while data is being fetched
 * Fully responsive design for all screen sizes
 */

import CustomerLayout from '@/components/customer/layout/CustomerLayout'
import { Skeleton } from '@/components/ui'

export default function HomePageSkeleton() {
  return (
    <CustomerLayout
      categories={[
        { id: '1', name: 'Loading...', active: true, description: '', icon: 'fa-spinner' }
      ]}
      activeCategory="all"
      onCategorySelect={() => {}}
    >
      {/* Welcome Banner Skeleton - Responsive height */}
      <div className="mb-6 sm:mb-8">
        <Skeleton className="h-36 sm:h-44 md:h-48 lg:h-56 xl:h-64 w-full rounded-xl" variant="rounded" />
      </div>

      {/* Featured Picks Skeleton - Responsive horizontal scroll */}
      <div className="mb-6 sm:mb-8">
        {/* Section Title */}
        <Skeleton className="h-6 sm:h-7 md:h-8 w-32 sm:w-40 md:w-48 mb-3 sm:mb-4" variant="text" size="lg" />
        {/* Featured Items Carousel */}
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shrink-0 w-40 sm:w-50 md:w-55 lg:w-60 xl:w-65">
              <Skeleton className="h-28 sm:h-32 md:h-36 lg:h-40 w-full rounded-lg mb-2 sm:mb-3" variant="rounded" />
              <Skeleton className="h-4 w-3/4 mb-1" variant="text" size="sm" />
              <Skeleton className="h-3 w-1/2" variant="text" size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Popular Products Skeleton - Responsive grid */}
      <div>
        {/* Section Title */}
        <Skeleton className="h-6 sm:h-7 md:h-8 w-32 sm:w-40 md:w-48 mb-3 sm:mb-4" variant="text" size="lg" />
        {/* Products Grid - Responsive columns */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="space-y-2 sm:space-y-3">
              {/* Product Image */}
              <Skeleton className="aspect-square w-full rounded-lg" variant="rounded" />
              {/* Product Info */}
              <div className="space-y-1.5 px-1">
                <Skeleton className="h-4 sm:h-5 w-3/4" variant="text" size="sm" />
                <Skeleton className="h-3 w-1/2" variant="text" size="sm" />
                <div className="flex justify-between items-center pt-1">
                  <Skeleton className="h-4 w-12" variant="text" size="sm" />
                  <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full" variant="circular" size="sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CustomerLayout>
  )
}
