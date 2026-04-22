import type { Product } from '@/types'

export const products: Product[] = [
  {
    id: 1,
    name: 'Classic Cappuccino',
    description: 'Espresso with steamed milk and a layer of foam, creating a perfect balance of strength and creaminess.',
    price: 120,
    price_formatted: 120,
    image: '/images/products/cappuccino.jpg',
    image_url: '/images/products/cappuccino.jpg',
    category: 'hot-drinks',
    rating: 4.8,
    reviewCount: 324,
    badge: {
      text: 'Featured',
      color: 'bg-blue-500 text-white'
    },
    status: {
      text: 'Available',
      color: 'bg-green-100 text-green-700'
    },
    tags: ['Hot Drinks', 'Hot', 'Popular'],
    size_labels: ['Small', 'Medium', 'Large'],
    available: true,
    featured: true,
    popular: true,
    temperature: 'Hot',
    addons: [
      {
        id: 1,
        name: 'Extra Shot',
        description: 'Additional espresso shot for extra kick',
        price: 30,
        price_formatted: 30,
        category: 'Extras',
        available: true,
        max_quantity: 2
      },
      {
        id: 2,
        name: 'Oat Milk',
        description: 'Creamy oat milk alternative',
        price: 25,
        price_formatted: 25,
        category: 'Milk',
        available: true,
        max_quantity: 1
      },
      {
        id: 3,
        name: 'Almond Milk',
        description: 'Nutty almond milk alternative',
        price: 25,
        price_formatted: 25,
        category: 'Milk',
        available: true,
        max_quantity: 1
      },
      {
        id: 4,
        name: 'Vanilla Syrup',
        description: 'Sweet vanilla flavor',
        price: 15,
        price_formatted: 15,
        category: 'Syrups',
        available: true,
        max_quantity: 3
      },
      {
        id: 5,
        name: 'Caramel Drizzle',
        description: 'Rich caramel topping',
        price: 20,
        price_formatted: 20,
        category: 'Toppings',
        available: true,
        max_quantity: 2
      }
    ]
  },
  {
    id: 2,
    name: 'Iced Caramel Macchiato',
    description: 'Freshly steamed milk with vanilla-flavored syrup marked with espresso and topped with a caramel drizzle.',
    price: 150,
    price_formatted: 150,
    image: '/images/products/caramel-macchiato.jpg',
    image_url: '/images/products/caramel-macchiato.jpg',
    category: 'cold-drinks',
    rating: 4.9,
    reviewCount: 512,
    badge: {
      text: 'Featured',
      color: 'bg-blue-500 text-white'
    },
    status: {
      text: 'Available',
      color: 'bg-green-100 text-green-700'
    },
    tags: ['Cold Drinks', 'Cold', 'Popular'],
    size_labels: ['Small', 'Medium', 'Large'],
    available: true,
    featured: true,
    popular: true,
    temperature: 'Cold',
    addons: [
      {
        id: 6,
        name: 'Extra Shot',
        description: 'Additional espresso shot',
        price: 30,
        price_formatted: 30,
        category: 'Extras',
        available: true,
        max_quantity: 2
      },
      {
        id: 7,
        name: 'Coconut Milk',
        description: 'Tropical coconut milk alternative',
        price: 30,
        price_formatted: 30,
        category: 'Milk',
        available: true,
        max_quantity: 1
      },
      {
        id: 8,
        name: 'Caramel Syrup',
        description: 'Extra caramel flavor',
        price: 15,
        price_formatted: 15,
        category: 'Syrups',
        available: true,
        max_quantity: 3
      },
      {
        id: 9,
        name: 'Whipped Cream',
        description: 'Light and fluffy topping',
        price: 20,
        price_formatted: 20,
        category: 'Toppings',
        available: true,
        max_quantity: 1
      }
    ]
  },
  {
    id: 3,
    name: 'Butter Croissant',
    description: 'Flaky, buttery croissant baked to golden perfection. A classic French pastry.',
    price: 85,
    price_formatted: 85,
    image: '/images/products/croissant.jpg',
    image_url: '/images/products/croissant.jpg',
    category: 'pastries',
    rating: 4.7,
    reviewCount: 289,
    badge: {
      text: 'Featured',
      color: 'bg-blue-500 text-white'
    },
    status: {
      text: 'Available',
      color: 'bg-green-100 text-green-700'
    },
    tags: ['Pastries', 'Popular'],
    available: true,
    featured: true,
    popular: true
  },
  {
    id: 4,
    name: 'Matcha Latte',
    description: 'Premium Japanese matcha green tea blended with steamed milk for a creamy, earthy delight.',
    price: 145,
    price_formatted: 145,
    image: '/images/products/matcha-latte.jpg',
    image_url: '/images/products/matcha-latte.jpg',
    category: 'hot-drinks',
    rating: 4.6,
    reviewCount: 198,
    badge: null,
    status: {
      text: 'Available',
      color: 'bg-green-100 text-green-700'
    },
    tags: ['Hot Drinks', 'Hot', 'Popular'],
    size_labels: ['Small', 'Medium', 'Large'],
    available: true,
    featured: false,
    popular: true,
    temperature: 'Hot',
    addons: [
      {
        id: 10,
        name: 'Extra Matcha',
        description: 'Additional matcha powder',
        price: 35,
        price_formatted: 35,
        category: 'Extras',
        available: true,
        max_quantity: 2
      },
      {
        id: 11,
        name: 'Oat Milk',
        description: 'Creamy oat milk alternative',
        price: 25,
        price_formatted: 25,
        category: 'Milk',
        available: true,
        max_quantity: 1
      },
      {
        id: 12,
        name: 'Honey',
        description: 'Natural sweetener',
        price: 15,
        price_formatted: 15,
        category: 'Sweeteners',
        available: true,
        max_quantity: 2
      },
      {
        id: 13,
        name: 'Red Bean Paste',
        description: 'Traditional sweet topping',
        price: 25,
        price_formatted: 25,
        category: 'Toppings',
        available: true,
        max_quantity: 1
      }
    ]
  },
  {
    id: 5,
    name: 'Club Sandwich',
    description: 'Triple-layered sandwich with grilled chicken, crispy bacon, fresh lettuce, and tomato.',
    price: 180,
    price_formatted: 180,
    image: '/images/products/club-sandwich.jpg',
    image_url: '/images/products/club-sandwich.jpg',
    category: 'sandwiches',
    rating: 4.8,
    reviewCount: 445,
    badge: null,
    status: {
      text: 'Available',
      color: 'bg-green-100 text-green-700'
    },
    tags: ['Sandwiches', 'Popular'],
    available: true,
    featured: false,
    popular: true
  },
  {
    id: 6,
    name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with a molten center, served with vanilla ice cream.',
    price: 165,
    price_formatted: 165,
    image: '/images/products/lava-cake.jpg',
    image_url: '/images/products/lava-cake.jpg',
    category: 'desserts',
    rating: 4.9,
    reviewCount: 678,
    badge: null,
    status: {
      text: 'Available',
      color: 'bg-green-100 text-green-700'
    },
    tags: ['Desserts', 'Popular'],
    available: true,
    featured: false,
    popular: true
  },
  {
    id: 7,
    name: 'Americano',
    description: 'Rich espresso diluted with hot water for a smooth, bold coffee experience.',
    price: 95,
    price_formatted: 95,
    image: '/images/products/americano.jpg',
    image_url: '/images/products/americano.jpg',
    category: 'hot-drinks',
    rating: 4.5,
    reviewCount: 156,
    badge: null,
    status: {
      text: 'Available',
      color: 'bg-green-100 text-green-700'
    },
    tags: ['Hot Drinks', 'Hot'],
    size_labels: ['Small', 'Medium', 'Large'],
    available: true,
    featured: false,
    popular: false,
    temperature: 'Hot'
  },
  {
    id: 8,
    name: 'Iced Mocha',
    description: 'Espresso mixed with chocolate syrup and milk, poured over ice for a refreshing treat.',
    price: 140,
    price_formatted: 140,
    image: '/images/products/iced-mocha.jpg',
    image_url: '/images/products/iced-mocha.jpg',
    category: 'cold-drinks',
    rating: 4.7,
    reviewCount: 234,
    badge: null,
    status: {
      text: 'Available',
      color: 'bg-green-100 text-green-700'
    },
    tags: ['Cold Drinks', 'Cold', 'Popular'],
    size_labels: ['Small', 'Medium', 'Large'],
    available: true,
    featured: false,
    popular: true,
    temperature: 'Cold'
  },
  {
    id: 9,
    name: 'Blueberry Muffin',
    description: 'Moist muffin loaded with fresh blueberries and topped with sugar crumble.',
    price: 75,
    price_formatted: 75,
    image: '/images/products/blueberry-muffin.jpg',
    image_url: '/images/products/blueberry-muffin.jpg',
    category: 'pastries',
    rating: 4.6,
    reviewCount: 189,
    badge: null,
    status: {
      text: 'Available',
      color: 'bg-green-100 text-green-700'
    },
    tags: ['Pastries'],
    available: true,
    featured: false,
    popular: false
  },
  {
    id: 10,
    name: 'Tiramisu',
    description: 'Classic Italian dessert with layers of coffee-soaked ladyfingers and mascarpone cream.',
    price: 155,
    price_formatted: 155,
    image: '/images/products/tiramisu.jpg',
    image_url: '/images/products/tiramisu.jpg',
    category: 'desserts',
    rating: 4.9,
    reviewCount: 543,
    badge: null,
    status: {
      text: 'Available',
      color: 'bg-green-100 text-green-700'
    },
    tags: ['Desserts', 'Popular'],
    available: true,
    featured: false,
    popular: true
  },
  {
    id: 11,
    name: 'Chicken Panini',
    description: 'Grilled chicken breast with pesto, mozzarella, and sun-dried tomatoes on pressed ciabatta.',
    price: 195,
    price_formatted: 195,
    image: '/images/products/chicken-panini.jpg',
    image_url: '/images/products/chicken-panini.jpg',
    category: 'sandwiches',
    rating: 4.7,
    reviewCount: 312,
    badge: null,
    status: {
      text: 'Available',
      color: 'bg-green-100 text-green-700'
    },
    tags: ['Sandwiches', 'Popular'],
    available: true,
    featured: false,
    popular: true
  },
  {
    id: 12,
    name: 'Caramel Frappuccino',
    description: 'Blended coffee with caramel syrup, milk, and ice, topped with whipped cream and drizzle.',
    price: 175,
    price_formatted: 175,
    image: '/images/products/caramel-frappuccino.jpg',
    image_url: '/images/products/caramel-frappuccino.jpg',
    category: 'cold-drinks',
    rating: 4.8,
    reviewCount: 456,
    badge: null,
    status: {
      text: 'Available',
      color: 'bg-green-100 text-green-700'
    },
    tags: ['Cold Drinks', 'Cold', 'Popular'],
    size_labels: ['Small', 'Medium', 'Large'],
    available: true,
    featured: false,
    popular: true,
    temperature: 'Cold'
  }
]
