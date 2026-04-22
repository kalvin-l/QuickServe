# QuickServe Frontend - Architecture Documentation

## Overview

This document describes the refactored architecture of the QuickServe frontend application. The new architecture follows modern React/Next.js best practices with a focus on maintainability, scalability, and separation of concerns.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Key Architectural Decisions](#key-architectural-decisions)
3. [Feature-Based Architecture](#feature-based-architecture)
4. [State Management](#state-management)
5. [Service Layer](#service-layer)
6. [UI Component Library](#ui-component-library)
7. [Routing](#routing)
8. [Data Flow](#data-flow)
9. [Connecting to Backend](#connecting-to-backend)

---

## Project Structure

```
quickserve-frontend/
├── app/                          # Next.js App Router
│   ├── (customer)/               # Customer route group
│   │   ├── cart/                 # Cart page
│   │   ├── orders/               # Orders history page
│   │   └── profile/              # User profile page
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # Home page
│
├── components/
│   ├── ui/                       # 🎨 Design System Components
│   │   ├── button/
│   │   ├── modal/
│   │   ├── badge/
│   │   └── card/
│   └── customer/                 # 🛒 Customer Feature Components
│       ├── cart/
│       ├── home/
│       ├── layout/
│       ├── product/
│       └── shared/
│
├── features/                     # 🎯 Feature-Based Modules
│   ├── cart/                     # Cart feature
│   │   ├── hooks/                # useCart hook
│   │   ├── store/                # Zustand store
│   │   ├── services/             # Cart service
│   │   └── types/                # Cart types
│   ├── categories/               # Categories feature
│   │   └── store/                # Category store
│   └── products/                 # Products feature
│       ├── hooks/                # useProducts hook
│       ├── services/             # Product service
│       └── utils/                # Product utilities
│
├── lib/                          # ⚙️ Core Utilities
│   ├── api/                      # API client setup
│   │   ├── client.ts             # HTTP client
│   │   └── endpoints.ts          # API endpoints
│   └── utils.ts                  # General utilities
│
├── hooks/                        # 🪝 Global Custom Hooks
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   ├── useMediaQuery.ts
│   ├── useModal.ts
│   └── useClickOutside.ts
│
├── config/                       # ⚙️ Configuration
│   ├── constants.ts              # App constants
│   ├── features.ts               # Feature flags
│   └── theme.ts                  # Design tokens
│
├── types/                        # 📝 TypeScript Types
│   ├── category.ts
│   ├── product.ts
│   └── index.ts
│
└── data/                         # 📊 Static Data (temporary)
    └── mockData.ts               # Mock data for development
```

---

## Key Architectural Decisions

### 1. Feature-Based Architecture

Code is organized by **feature/domain** rather than by type. This means:

- All cart-related code (store, hooks, services, types) lives in `features/cart/`
- All product-related code lives in `features/products/`
- Each feature is self-contained and can be easily extracted or tested

**Benefits:**
- Easier to find related code
- Better code cohesion
- Simplifies future code splitting
- Easier to test features in isolation

### 2. Zustand for State Management

**Why Zustand over Redux/Context?**
- Minimal boilerplate
- Built-in TypeScript support
- Simple API
- No providers needed
- Built-in persistence middleware
- Great performance with minimal re-renders

**Usage Example:**
```typescript
// Access cart state anywhere
const { items, total, addToCart } = useCartStore()

// Or use the convenience hook
const { addToCart, formattedTotal } = useCart()
```

### 3. Service Layer Pattern

Business logic is separated from UI components:

```typescript
// ❌ Before: Logic in component
const handleAddToCart = () => {
  if (product.available && quantity > 0) {
    // ... logic here
  }
}

// ✅ After: Logic in service
const validation = CartService.validateAddToCart(input)
if (validation.valid) {
  cartStore.addItem(product, quantity, customizations)
}
```

### 4. Custom Hooks Layer

Reusable hooks encapsulate complex logic:

```typescript
// Instead of repeating cart logic
const { addToCart, itemCount, formattedTotal } = useCart()

// Instead of complex data fetching
const { products, loading, error } = useProducts({ category: 'coffee' })

// Instead of manual state management
const { isOpen, open, close } = useModal()
```

### 5. Design System Components

Reusable UI components with variants:

```typescript
<Button variant="primary" size="lg" fullWidth>
  Add to Cart
</Button>

<Badge variant="success" size="sm">New</Badge>

<Card variant="elevated" hoverable>
  {/* Content */}
</Card>
```

---

## Feature-Based Architecture

Each feature follows a consistent structure:

```
features/feature-name/
├── hooks/           # Feature-specific hooks
├── store/           # Zustand store (if needed)
├── services/        # Business logic
├── utils/           # Helper functions
└── types/           # TypeScript types
```

### Example: Cart Feature

```typescript
// hooks/useCart.ts - Convenience hook
export function useCart() {
  const store = useCartStore()
  return {
    items: store.items,
    addToCart: (product, qty, customizations) => { /* ... */ },
    formattedTotal: formatPrice(store.total)
  }
}

// store/cartStore.ts - State management
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, qty, customizations) => { /* ... */ },
      // ...
    })
  )
)

// services/cartService.ts - Business logic
export class CartService {
  static validateAddToCart(input): ValidationResult { /* ... */ }
  static calculateItemPrice(base, qty, customizations): number { /* ... */ }
}
```

---

## State Management

### Cart Store (Zustand)

Located in [`features/cart/store/cartStore.ts`](features/cart/store/cartStore.ts)

**Features:**
- Persistent cart (localStorage)
- Automatic total calculations
- Item quantity management
- Unique item tracking (same product + customizations = same cart item)

**Usage:**
```typescript
// In any component
import { useCart } from '@/features/cart'

function MyComponent() {
  const { items, addToCart, removeFromCart, total } = useCart()

  return (
    <button onClick={() => addToCart(product, 1, customizations)}>
      Add to Cart
    </button>
  )
}
```

### Category Store

Located in [`features/categories/store/categoryStore.ts`](features/categories/store/categoryStore.ts)

**Usage:**
```typescript
const { categories, activeCategoryId, setActiveCategory } = useCategoryStore()
```

---

## Service Layer

### API Client

Located in [`lib/api/client.ts`](lib/api/client.ts)

**Prepared for NestJS backend:**
```typescript
// Currently using mock data
const products = await productService.getAll()

// When ready to connect:
// 1. Update API_BASE_URL in lib/api/client.ts
// 2. Uncomment fetch calls in services
// 3. Add authentication headers
```

**API Client Features:**
- Type-safe requests
- Error handling
- Timeout support
- Easy integration with backend

### Product Service

Located in [`features/products/services/productService.ts`](features/products/services/productService.ts)

**Methods:**
- `getAllProducts()` - Get all products
- `getProductById(id)` - Get single product
- `getProductsByCategory(categoryId)` - Filter by category
- `getFeaturedProducts()` - Get featured items
- `searchProducts(query)` - Search products

---

## UI Component Library

### Button Component

```typescript
<Button
  variant="primary"     // primary | secondary | ghost | outline | danger
  size="md"             // xs | sm | md | lg | xl
  fullWidth={false}
  isLoading={false}
  leftIcon={<i className="fas fa-plus"></i>}
>
  Click Me
</Button>
```

### Modal Component

```typescript
<Modal
  show={isOpen}
  onClose={() => setIsOpen(false)}
  maxWidth="lg"         // xs | sm | md | lg | xl | 2xl | 3xl | full
  closeOnBackdropClick
>
  Content
</Modal>
```

### Badge Component

```typescript
<Badge
  variant="success"     // default | primary | secondary | success | warning | danger | info
  size="md"             // sm | md | lg
  dot={false}
>
  Label
</Badge>
```

### Card Component

```typescript
<Card
  variant="default"      // default | bordered | elevated | flat
  hoverable={false}
  padding="md"          // none | sm | md | lg
>
  <CardImage>
    <Image src="..." />
  </CardImage>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

## Routing

### Customer Route Group

Pages organized under `app/(customer)/`:

| Route | Page | Description |
|-------|------|-------------|
| `/` | [page.tsx](app/page.tsx) | Home/Menu page |
| `/cart` | [cart/page.tsx](app/(customer)/cart/page.tsx) | Shopping cart |
| `/orders` | [orders/page.tsx](app/(customer)/orders/page.tsx) | Order history |
| `/profile` | [profile/page.tsx](app/(customer)/profile/page.tsx) | User profile |

### Navigation

Bottom navigation automatically updates with cart count:

```typescript
// components/customer/layout/BottomNavigation.tsx
const cartItemCount = useCartItemCount() // Automatically updates
```

---

## Data Flow

### Adding to Cart Flow

```
User clicks "Add to Cart"
    ↓
Modal opens (ProductDetailModal or CustomProductModal)
    ↓
User selects size, quantity, addons
    ↓
User clicks "Add to Order"
    ↓
Modal calls onAddToCart with CartItem
    ↓
useCart hook validates input via CartService
    ↓
If valid: cartStore.addItem() updates state
    ↓
Cart automatically persists to localStorage
    ↓
UI re-renders with new cart count
```

### Category Selection Flow

```
User clicks category in sidebar
    ↓
handleCategorySelect(categoryId) called
    ↓
setActiveCategory(categoryId) updates store
    ↓
useProducts hook detects category change
    ↓
Products are filtered/refreshed
    ↓
UI re-renders with filtered products
```

---

## Connecting to Backend

When ready to connect to the NestJS backend:

### Step 1: Update API Configuration

```typescript
// lib/api/client.ts
const API_CONFIG = {
  BASE_URL: 'http://localhost:3000/api', // Your NestJS backend URL
  // Or use environment variable:
  // BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
}
```

### Step 2: Update Product Service

```typescript
// features/products/services/productService.ts
static async getAllProducts(): Promise<Product[]> {
  // Replace mock data with API call:
  return apiClient.get<Product[]>('/products')
}
```

### Step 3: Add Authentication (if needed)

```typescript
// lib/api/client.ts
const headers: HeadersInit = {
  'Content-Type': 'application/json',
}

// Add auth token if available
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('auth_token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
}

const response = await fetch(url, {
  ...options,
  headers: { ...headers, ...options.headers },
})
```

### Step 4: Enable API Features

The architecture is already prepared for:
- ✅ Product fetching from API
- ✅ Cart synchronization with backend
- ✅ Order submission
- ✅ User authentication
- ✅ Real-time updates (can add WebSockets later)

---

## Best Practices

### 1. Use Feature Hooks

```typescript
// ✅ Good - use feature hooks
const { addToCart } = useCart()

// ❌ Bad - use store directly in components
const addToCart = useCartStore(state => state.addItem)
```

### 2. Keep Components Simple

```typescript
// ✅ Good - component just renders
function ProductCard({ product }) {
  const { addToCart } = useCart()
  return <button onClick={() => addToCart(product)}>Add</button>
}

// ❌ Bad - component has business logic
function ProductCard({ product }) {
  const [cart, setCart] = useState([])
  const handleClick = () => {
    // ... lots of logic
  }
}
```

### 3. Use Service Layer for Logic

```typescript
// ✅ Good - use service
const isValid = CartService.validateAddToCart(input)

// ❌ Bad - inline validation
if (input.quantity < 1 || input.quantity > 99) { /* ... */ }
```

### 4. Leverage Type Safety

```typescript
// ✅ Good - use types
function addToCart(item: CartItem): void { /* ... */ }

// ❌ Bad - use any
function addToCart(item: any): void { /* ... */ }
```

---

## Summary of Changes

### What Was Improved

| Area | Before | After |
|------|--------|-------|
| **State Management** | Local component state, prop drilling | Zustand stores, global access |
| **Cart Logic** | Scattered, TODO comments | Centralized store with persistence |
| **Code Organization** | Mixed concerns | Feature-based architecture |
| **Reusable Logic** | Duplicated code | Custom hooks and services |
| **UI Components** | Inconsistent styling | Design system with variants |
| **Routing** | Single page | Multiple pages with navigation |
| **Type Safety** | Some `any` types | Proper TypeScript types |
| **Testing** | Hard to test | Easy to test (isolated units) |

### New Features Added

- ✅ Working cart with localStorage persistence
- ✅ Cart page with item management
- ✅ Orders history page (ready for backend)
- ✅ User profile page
- ✅ Bottom navigation with cart count
- ✅ Design system components (Button, Modal, Badge, Card)
- ✅ Service layer for business logic
- ✅ API client ready for NestJS backend
- ✅ Custom hooks (useDebounce, useLocalStorage, useMediaQuery, etc.)
- ✅ Feature flags system

---

## Next Steps

To continue improving the application:

1. **Add React Query** - For better data fetching and caching
2. **Add Toast Notifications** - For user feedback
3. **Add Loading States** - Skeleton loaders
4. **Add Error Boundaries** - Better error handling
5. **Add Testing** - Unit tests with Vitest, component tests with Testing Library
6. **Add Storybook** - For component documentation
7. **Connect to Backend** - Replace mock data with API calls
8. **Add Authentication** - Login/logout functionality
9. **Add Real-time Updates** - WebSocket integration
10. **Optimize Performance** - Code splitting, image optimization, caching

---

## File Index

### Key Files

| File | Purpose |
|------|---------|
| [app/page.tsx](app/page.tsx) | Home page with refactored architecture |
| [features/cart/hooks/useCart.ts](features/cart/hooks/useCart.ts) | Cart hook |
| [features/cart/store/cartStore.ts](features/cart/store/cartStore.ts) | Cart Zustand store |
| [features/products/hooks/useProducts.ts](features/products/hooks/useProducts.ts) | Products hook |
| [components/ui/index.ts](components/ui/index.ts) | UI components export |
| [lib/api/client.ts](lib/api/client.ts) | API client |
| [config/constants.ts](config/constants.ts) | App constants |

---

**Generated:** 2025-01-XX
**Version:** 1.0.0
