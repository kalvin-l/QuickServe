import type { Category } from '@/types'

export const categories: Category[] = [
  {
    id: 'all',
    name: 'All Items',
    active: true,
    description: 'All available items',
    icon: 'fas fa-list'
  },
  {
    id: 'hot-drinks',
    name: 'Hot Drinks',
    active: false,
    description: 'Warm and comforting beverages',
    icon: 'fas fa-mug-hot'
  },
  {
    id: 'cold-drinks',
    name: 'Cold Drinks',
    active: false,
    description: 'Refreshing cold beverages',
    icon: 'fas fa-ice-cream'
  },
  {
    id: 'pastries',
    name: 'Pastries',
    active: false,
    description: 'Freshly baked treats',
    icon: 'fas fa-bread-slice'
  },
  {
    id: 'sandwiches',
    name: 'Sandwiches',
    active: false,
    description: 'Hearty and delicious',
    icon: 'fas fa-utensils'
  },
  {
    id: 'desserts',
    name: 'Desserts',
    active: false,
    description: 'Sweet indulgences',
    icon: 'fas fa-cookie-bite'
  }
]
