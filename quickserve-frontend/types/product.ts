/**
 * Product interface representing a menu item
 */
export interface Product {
  id: number | string
  name: string
  description: string
  price: number
  price_formatted?: number
  image: string
  image_url?: string
  category: string
  rating: number
  reviewCount: number
  badge?: Badge | null
  status?: ProductStatus
  tags: string[]
  size_labels?: string[]
  addons?: Addon[]
  available?: boolean
  featured?: boolean
  popular?: boolean
  temperature?: string
}

/**
 * Badge interface for product badges (Featured, Popular, etc.)
 */
export interface Badge {
  text: string
  color: string
  icon?: string
}

/**
 * ProductStatus interface for availability status
 */
export interface ProductStatus {
  text: string
  color: string
}

/**
 * Addon interface for product customization options
 */
export interface Addon {
  id: number
  name: string
  description?: string
  price: number
  price_formatted?: number
  category?: string // 'Milk' | 'Extras' | 'Toppings' | 'Syrups' | 'Sweeteners'
  available?: boolean
  max_quantity?: number
  quantity?: number // For cart items - how many of this addon were selected
}

/**
 * SizeOption interface for product size variants
 */
export interface SizeOption {
  id: string
  name: string
  price: number
}
