# Menu Backend - Complete Documentation

Complete CRUD backend for menu management with Categories, Menu Items, and Add-ons.

**Created:** 2026-02-04
**Framework:** FastAPI + SQLAlchemy (SQLite)
**Status:** ✅ Ready for Development

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Database Models](#database-models)
3. [API Endpoints](#api-endpoints)
4. [Usage Examples](#usage-examples)
5. [Testing the API](#testing-the-api)
6. [Frontend Integration](#frontend-integration)

---

## Project Structure

```
fastapi-backend/
├── main.py                          # Application entry point
├── .env                             # Environment variables
├── requirements.txt                 # Dependencies
├── quickserve.db                   # SQLite database (auto-created)
│
├── app/
│   ├── __init__.py
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   └── database.py             # Database connection & session
│   │
│   ├── models/                     # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── category.py             # Category model
│   │   ├── addon.py                # Addon model
│   │   ├── menu_item.py            # Menu item model
│   │   └── menu_addon.py           # Menu-Addon association table
│   │
│   ├── schemas/                    # Pydantic validation schemas
│   │   ├── __init__.py
│   │   ├── category.py             # Category schemas
│   │   ├── addon.py                # Addon schemas
│   │   └── menu_item.py            # Menu item schemas
│   │
│   ├── services/                   # Business logic layer
│   │   ├── __init__.py
│   │   └── menu_service.py         # Menu operations
│   │
│   └── routers/                    # API endpoints
│       ├── __init__.py
│       └── menu.py                 # Menu CRUD endpoints
```

---

## Database Models

### 1. **MenuItem**
```python
Fields:
- id: int (primary key)
- name: str (required)
- description: str (optional)
- category_id: int (foreign key → categories)
- price: int (in cents, e.g., 500 = ₱5.00)
- temperature: Enum["Hot", "Cold", "Both"]
- prep_time: str (e.g., "10 mins")
- size_labels: JSON (e.g., {"small": "8oz", "medium": "12oz"})
- featured: bool (default: False)
- popular: bool (default: False)
- available: bool (default: True)
- image_path: str (optional)
- notes: str (internal notes)
- status: Enum["draft", "published", "archived"]
- created_at: datetime
- updated_at: datetime

Relationships:
- category: Category (many-to-one)
- addons: Addon[] (many-to-many)
```

### 2. **Category**
```python
Fields:
- id: int (primary key)
- name: str (required)
- scope: str (default: "menu")
- created_at: datetime
- updated_at: datetime

Relationships:
- menu_items: MenuItem[] (one-to-many)
```

### 3. **Addon**
```python
Fields:
- id: int (primary key)
- name: str (required)
- description: str (optional)
- price: int (in cents)
- category: str (e.g., "Extras", "Milk", "Toppings", "Syrups")
- available: bool (default: True)
- max_quantity: int (default: 1)
- created_at: datetime
- updated_at: datetime
```

### 4. **MenuItemAddon** (Association Table)
```python
Fields:
- menu_item_id: int (FK → menu_items)
- addon_id: int (FK → addons)

Purpose: Many-to-many relationship between menu items and addons
```

---

## API Endpoints

### Base URL: `http://localhost:8000/api/menu`

### **Menu Items**

#### 1. Get All Menu Items (with filters & pagination)
```http
GET /api/menu
```

**Query Parameters:**
- `search` (optional): Search in name and description
- `category_id` (optional): Filter by category ID
- `available_only` (optional, default: false): Show only available items
- `featured_only` (optional, default: false): Show only featured items
- `status` (optional): Filter by status (draft, published, archived)
- `page` (optional, default: 1): Page number
- `page_size` (optional, default: 12, max: 100): Items per page

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Iced Brown Sugar Latte",
      "description": "Rich espresso with brown sugar and milk",
      "category_id": 1,
      "price": 18000,
      "price_in_pesos": 180.00,
      "temperature": "Cold",
      "prep_time": "5-7 mins",
      "size_labels": {"small": "12oz", "medium": "16oz", "large": "20oz"},
      "featured": true,
      "popular": true,
      "available": true,
      "image_path": "uploads/menu-items/abc123.jpg",
      "notes": null,
      "status": "published",
      "category": {
        "id": 1,
        "name": "Coffee"
      },
      "addons": [
        {
          "id": 1,
          "name": "Extra Shot",
          "price": 3000,
          "price_in_pesos": 30.00,
          "category": "Extras"
        }
      ],
      "created_at": "2026-02-04T10:00:00Z",
      "updated_at": "2026-02-04T10:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "page_size": 12,
  "total_pages": 3
}
```

#### 2. Get Single Menu Item
```http
GET /api/menu/{item_id}
```

**Response:** Single MenuItem object (same structure as above)

#### 3. Create Menu Item
```http
POST /api/menu
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Cappuccino",
  "description": "Classic espresso with steamed milk foam",
  "category_id": 1,
  "price": 12000,
  "temperature": "Hot",
  "prep_time": "5-7 mins",
  "size_labels": {
    "small": "8oz",
    "medium": "12oz",
    "large": "16oz"
  },
  "featured": true,
  "popular": false,
  "available": true,
  "notes": "Our bestseller!",
  "status": "published",
  "addon_ids": [1, 2, 3]
}
```

**Response:** Created MenuItem object

#### 4. Update Menu Item
```http
PUT /api/menu/{item_id}
Content-Type: application/json
```

**Request Body:** All fields optional
```json
{
  "name": "Cappuccino Premium",
  "price": 13500,
  "featured": true
}
```

**Response:** Updated MenuItem object

#### 5. Delete Menu Item (Soft Delete)
```http
DELETE /api/menu/{item_id}
```

**Response:** 204 No Content

**Note:** This performs a soft delete (sets status to "archived" and available to false)

#### 6. Toggle Availability
```http
PATCH /api/menu/{item_id}/toggle-availability
```

**Response:** Updated MenuItem with `available` field toggled

#### 7. Upload Image
```http
POST /api/menu/{item_id}/image
Content-Type: multipart/form-data
```

**Request:**
- `file`: Image file (JPG, PNG, GIF, WebP, max 10MB)

**Response:** Updated MenuItem with `image_path`

### **Categories**

#### 8. Get All Categories
```http
GET /api/menu/categories/list
```

**Response:**
```json
[
  {
    "value": "1",
    "label": "Coffee"
  },
  {
    "value": "2",
    "label": "Tea"
  },
  {
    "value": "3",
    "label": "Pastries"
  }
]
```

### **Addons**

#### 9. Get All Addons (Grouped by Category)
```http
GET /api/menu/addons/list?available_only=true
```

**Response:**
```json
[
  {
    "category": "Extras",
    "addons": [
      {
        "id": 1,
        "name": "Extra Shot",
        "price": 3000,
        "price_in_pesos": 30.00,
        "category": "Extras",
        "available": true
      }
    ]
  },
  {
    "category": "Milk",
    "addons": [
      {
        "id": 4,
        "name": "Almond Milk",
        "price": 3500,
        "price_in_pesos": 35.00,
        "category": "Milk",
        "available": true
      }
    ]
  }
]
```

---

## Usage Examples

### **Example 1: Create a New Menu Item**

```bash
curl -X POST http://localhost:8000/api/menu \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Iced Caramel Macchiato",
    "description": "Espresso with caramel, milk, and ice",
    "category_id": 1,
    "price": 16500,
    "temperature": "Cold",
    "prep_time": "5-7 mins",
    "size_labels": {
      "small": "12oz",
      "medium": "16oz",
      "large": "20oz"
    },
    "featured": true,
    "available": true,
    "status": "published",
    "addon_ids": [1, 2, 4]
  }'
```

### **Example 2: Get Available Coffee Items**

```bash
curl "http://localhost:8000/api/menu?category_id=1&available_only=true&page=1&page_size=10"
```

### **Example 3: Search Menu Items**

```bash
curl "http://localhost:8000/api/menu?search=caramel"
```

### **Example 4: Update Menu Item**

```bash
curl -X PUT http://localhost:8000/api/menu/1 \
  -H "Content-Type: application/json" \
  -d '{
    "price": 17500,
    "featured": true
  }'
```

### **Example 5: Upload Image**

```bash
curl -X POST http://localhost:8000/api/menu/1/image \
  -F "file=@/path/to/image.jpg"
```

---

## Testing the API

### **Using Swagger UI (Interactive Documentation)**

1. Start the server:
   ```bash
   python main.py
   ```

2. Open browser:
   ```
   http://localhost:8000/docs
   ```

3. Try out endpoints:
   - Click on any endpoint
   - Click "Try it out"
   - Fill in parameters
   - Click "Execute"
   - See the response

### **Using Python Requests**

```python
import requests

BASE_URL = "http://localhost:8000/api/menu"

# Get all menu items
response = requests.get(BASE_URL)
print(response.json())

# Create new item
new_item = {
    "name": "Mocha Frappe",
    "description": "Chocolate coffee blended with ice",
    "category_id": 1,
    "price": 15000,
    "temperature": "Cold",
    "available": True,
    "status": "published"
}

response = requests.post(BASE_URL, json=new_item)
print(response.json())

# Get specific item
response = requests.get(f"{BASE_URL}/1")
print(response.json())

# Update item
update_data = {"price": 16000}
response = requests.put(f"{BASE_URL}/1", json=update_data)
print(response.json())

# Toggle availability
response = requests.patch(f"{BASE_URL}/1/toggle-availability")
print(response.json())
```

---

## Frontend Integration

### **React/Next.js Example**

```typescript
// types/menu.ts
export interface MenuItem {
  id: number;
  name: string;
  description: string;
  category_id: number;
  price: number;
  price_in_pesos: number;
  temperature: "Hot" | "Cold" | "Both";
  prep_time: string;
  size_labels: Record<string, string>;
  featured: boolean;
  popular: boolean;
  available: boolean;
  image_path: string;
  status: "draft" | "published" | "archived";
  category: {
    id: number;
    name: string;
  };
  addons: Array<{
    id: number;
    name: string;
    price: number;
    price_in_pesos: number;
    category: string;
  }>;
}

// api/menu.ts
import { MenuItem } from '@/types/menu';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function getMenuItems(params?: {
  search?: string;
  category_id?: number;
  available_only?: boolean;
  page?: number;
  page_size?: number;
}): Promise<{ items: MenuItem[]; total: number }> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.set('search', params.search);
  if (params?.category_id) queryParams.set('category_id', params.category_id.toString());
  if (params?.available_only) queryParams.set('available_only', 'true');
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.page_size) queryParams.set('page_size', params.page_size.toString());

  const response = await fetch(`${API_BASE}/menu?${queryParams}`);
  if (!response.ok) throw new Error('Failed to fetch menu items');

  return response.json();
}

export async function createMenuItem(item: Partial<MenuItem>): Promise<MenuItem> {
  const response = await fetch(`${API_BASE}/menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });

  if (!response.ok) throw new Error('Failed to create menu item');
  return response.json();
}

export async function updateMenuItem(id: number, item: Partial<MenuItem>): Promise<MenuItem> {
  const response = await fetch(`${API_BASE}/menu/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });

  if (!response.ok) throw new Error('Failed to update menu item');
  return response.json();
}

export async function deleteMenuItem(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/menu/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) throw new Error('Failed to delete menu item');
}

export async function toggleAvailability(id: number): Promise<MenuItem> {
  const response = await fetch(`${API_BASE}/menu/${id}/toggle-availability`, {
    method: 'PATCH',
  });

  if (!response.ok) throw new Error('Failed to toggle availability');
  return response.json();
}

// hooks/useMenuManagement.ts
import { useState, useEffect } from 'react';
import { getMenuItems, createMenuItem } from '@/api/menu';

export function useMenuManagement() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await getMenuItems({ available_only: false });
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (item: Partial<MenuItem>) => {
    try {
      const newItem = await createMenuItem(item);
      setItems([...items, newItem]);
      return newItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
      throw err;
    }
  };

  return {
    items,
    loading,
    error,
    loadItems,
    handleCreate,
  };
}
```

---

## File Upload Handling

Images are saved to `uploads/menu-items/` directory:

```
fastapi-backend/
└── uploads/
    └── menu-items/
        ├── abc123-def456.jpg
        ├── 789ghi-012jkl.png
        └── ...
```

To serve uploaded files in production, add to `main.py`:

```python
from fastapi.staticfiles import StaticFiles

# Mount static files directory
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
```

Then access images at:
```
http://localhost:8000/uploads/menu-items/abc123-def456.jpg
```

---

## Price Handling

All prices are stored in **cents** (INT) to avoid floating-point precision issues:

**Examples:**
- ₱5.00 → 500 cents
- ₱180.00 → 18000 cents
- ₱12.50 → 1250 cents

**Conversion:**
```python
# Backend (store)
price_in_pesos = 180.00
price_in_cents = int(price_in_pesos * 100)  # 18000

# Backend (retrieve)
price_in_pesos = item.price / 100  # 180.0

# Frontend (display)
price: ₱{item.price_in_pesos.toFixed(2)}
```

---

## Next Steps

1. ✅ **Run the server:** `python main.py`
2. ✅ **Test endpoints:** http://localhost:8000/docs
3. ✅ **Integrate with frontend:** Use the React examples above
4. ✅ **Add authentication:** Implement JWT for admin access
5. ✅ **Add more features:** Categories CRUD, Addons CRUD, etc.

---

## Troubleshooting

### **Database locked error**
```bash
# Close all database connections and restart server
python main.py
```

### **Import errors**
```bash
# Make sure you're in the correct directory
cd c:\DG\fastapi-backend

# Activate virtual environment
venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

### **CORS errors**
Update `main.py` CORS settings to include your frontend URL:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://your-frontend.com"],
    ...
)
```

---

**🎉 Your menu backend is ready!**

Start the server: `python main.py`
Test the API: http://localhost:8000/docs
