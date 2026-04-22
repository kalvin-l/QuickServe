# Frontend Integration - FastAPI Backend

Complete guide for integrating the FastAPI menu backend with Next.js frontend.

**Created:** 2026-02-04
**Backend:** FastAPI (http://localhost:8000)
**Frontend:** Next.js (http://localhost:3000)

---

## Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [API Service Layer](#api-service-layer)
3. [React Query Hooks](#react-query-hooks)
4. [Usage Examples](#usage-examples)
5. [Testing the Integration](#testing-the-integration)

---

## Setup Instructions

### **Step 1: Configure Environment Variables**

Already created: `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_DEV_MODE=true
```

### **Step 2: Start the Backend**

```bash
cd c:\DG\fastapi-backend
venv\Scripts\activate
python main.py
```

Server starts at: http://localhost:8000

### **Step 3: Start the Frontend**

```bash
cd c:\DG\quickserve-frontend
npm run dev
```

Frontend starts at: http://localhost:3000

---

## API Service Layer

### **File Structure**

```
lib/
├── api/
│   ├── client.ts              # ✅ API client (configured for FastAPI)
│   ├── endpoints.ts           # ✅ Endpoint definitions
│   ├── services/
│   │   └── menuService.ts     # ✅ Menu API service
│   └── queries/
│       ├── useMenu.ts         # ✅ React Query hooks
│       └── index.ts
```

### **API Client Configuration**

**File:** `lib/api/client.ts`

```typescript
const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  TIMEOUT: 10000,
}
```

**Features:**
- Automatic timeout handling
- JSON response parsing
- Error handling
- TypeScript support

---

## React Query Hooks

### **Available Hooks**

**File:** `lib/api/queries/useMenu.ts`

| Hook | Description |
|------|-------------|
| `useMenuItems(params)` | Fetch menu items with filters |
| `useMenuItem(id)` | Fetch single menu item |
| `useCategories()` | Fetch all categories |
| `useAddons(availableOnly)` | Fetch addons grouped by category |
| `useCreateMenuItem()` | Create new menu item |
| `useUpdateMenuItem()` | Update menu item |
| `useDeleteMenuItem()` | Delete menu item |
| `useToggleAvailability()` | Toggle item availability |
| `useUploadImage()` | Upload item image |

---

## Usage Examples

### **Example 1: Display Menu List**

```tsx
'use client'

import { useMenuItems } from '@/lib/api/queries/useMenu'

export function MenuList() {
  const { data, isLoading, error } = useMenuItems({
    page: 1,
    page_size: 10,
    available_only: true,
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Menu Items ({data.total})</h2>
      {data.items.map((item) => (
        <div key={item.id}>
          <h3>{item.name}</h3>
          <p>₱{item.price_in_pesos.toFixed(2)}</p>
          <span>{item.available ? '✅ Available' : '❌ Unavailable'}</span>
        </div>
      ))}
    </div>
  )
}
```

### **Example 2: Create Menu Item**

```tsx
'use client'

import { useState } from 'react'
import { useCreateMenuItem, useCategories } from '@/lib/api/queries/useMenu'

export function CreateMenuItemForm() {
  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)

  const createMutation = useCreateMenuItem()
  const { data: categories } = useCategories()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createMutation.mutateAsync({
        name,
        description: 'Delicious item',
        category_id: 1,
        price: price * 100, // Convert to cents
        available: true,
        status: 'published',
      })

      alert('Menu item created!')
      setName('')
      setPrice(0)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
      />
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
        placeholder="Price in pesos"
      />
      <button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create Item'}
      </button>
    </form>
  )
}
```

### **Example 3: Update Menu Item**

```tsx
'use client'

import { useState } from 'react'
import { useMenuItem, useUpdateMenuItem } from '@/lib/api/queries/useMenu'

export function EditMenuItem({ id }: { id: number }) {
  const { data: item, isLoading } = useMenuItem(id)
  const updateMutation = useUpdateMenuItem()
  const [name, setName] = useState('')

  if (isLoading) return <div>Loading...</div>

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateMutation.mutateAsync({
        id,
        data: { name },
      })

      alert('Updated!')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        defaultValue={item.name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
      />
      <button type="submit" disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Updating...' : 'Update Item'}
      </button>
    </form>
  )
}
```

### **Example 4: Toggle Availability**

```tsx
'use client'

import { useMenuItem, useToggleAvailability } from '@/lib/api/queries/useMenu'

export function AvailabilityToggle({ id }: { id: number }) {
  const { data: item } = useMenuItem(id)
  const toggleMutation = useToggleAvailability()

  const handleToggle = async () => {
    try {
      await toggleMutation.mutateAsync(id)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to toggle')
    }
  }

  if (!item) return null

  return (
    <button
      onClick={handleToggle}
      disabled={toggleMutation.isPending}
    >
      {item.available ? 'Mark Unavailable' : 'Mark Available'}
    </button>
  )
}
```

### **Example 5: Upload Image**

```tsx
'use client'

import { useState } from 'react'
import { useUploadImage } from '@/lib/api/queries/useMenu'

export function ImageUpload({ itemId }: { itemId: number }) {
  const [file, setFile] = useState<File | null>(null)
  const uploadMutation = useUploadImage()

  const handleUpload = async () => {
    if (!file) return

    try {
      await uploadMutation.mutateAsync({
        id: itemId,
        file,
      })

      alert('Image uploaded!')
      setFile(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload failed')
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        onClick={handleUpload}
        disabled={!file || uploadMutation.isPending}
      >
        {uploadMutation.isPending ? 'Uploading...' : 'Upload Image'}
      </button>
    </div>
  )
}
```

---

## Data Flow

### **Request Flow**

```
Component → React Query Hook → Menu Service → API Client → FastAPI Backend
```

### **Example: Fetch Menu Items**

1. Component calls `useMenuItems()`
2. React Query manages caching and loading state
3. Menu Service builds request with params
4. API Client makes HTTP request to FastAPI
5. FastAPI returns data from SQLite database
6. Data flows back through the chain to component
7. Component re-renders with new data

---

## API Response Format

### **Menu Item Object**

```typescript
{
  id: 1,
  name: "Cappuccino",
  description: "Classic espresso with steamed milk foam",
  category_id: 1,
  price: 12000,              // Price in cents
  price_in_pesos: 120.00,    // Computed field
  temperature: "Hot",
  prep_time: "5-7 mins",
  size_labels: {
    small: "8oz",
    medium: "12oz",
    large: "16oz"
  },
  featured: true,
  popular: false,
  available: true,
  image_path: "uploads/menu-items/abc123.jpg",
  notes: null,
  status: "published",
  category: {
    id: 1,
    name: "Coffee"
  },
  addons: [
    {
      id: 1,
      name: "Extra Shot",
      price: 3000,
      price_in_pesos: 30.00,
      category: "Extras"
    }
  ],
  created_at: "2026-02-04T10:00:00Z",
  updated_at: "2026-02-04T10:00:00Z"
}
```

---

## Testing the Integration

### **Step 1: Verify Backend is Running**

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "QuickServe API",
  "database": "SQLite"
}
```

### **Step 2: Test Menu Endpoint**

```bash
curl http://localhost:8000/api/menu
```

Should return menu items array.

### **Step 3: Check Frontend**

Open: http://localhost:3000/admin/menu

You should see:
- Loading state
- Menu items from backend
- Categories loaded
- All functionality working

---

## Troubleshooting

### **CORS Errors**

**Issue:** Browser shows CORS error

**Solution:** Backend CORS is already configured. Check `fastapi-backend/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    ...
)
```

### **Network Errors**

**Issue:** `Failed to fetch` or `ECONNREFUSED`

**Solution:** Make sure backend is running:
```bash
cd c:\DG\fastapi-backend
python main.py
```

### **Empty Data**

**Issue:** Menu items not loading

**Solution:** Add some test data via API:
```bash
curl -X POST http://localhost:8000/api/menu \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Coffee",
    "description": "Test description",
    "price": 10000,
    "available": true,
    "status": "published"
  }'
```

### **TypeScript Errors**

**Issue:** Type errors in IDE

**Solution:** Restart TypeScript server:
- VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

---

## Next Steps

1. ✅ Backend running at http://localhost:8000
2. ✅ Frontend configured to connect to backend
3. ✅ API service layer created
4. ✅ React Query hooks implemented
5. ✅ Menu management hook updated
6. ✅ Environment variables configured

**What's Working:**
- Fetch menu items from backend
- Display items in admin panel
- Filter and paginate
- Toggle availability
- Delete items
- Create new items (form ready)
- Edit items (page ready)
- Upload images

**Future Enhancements:**
- Add loading skeletons
- Better error handling
- Optimistic updates
- Real-time updates with WebSockets
- Image preview before upload
- Bulk operations
- Export to CSV

---

**🎉 Integration complete!**

Your Next.js frontend is now connected to the FastAPI backend.
Start both servers and test the menu management features.
