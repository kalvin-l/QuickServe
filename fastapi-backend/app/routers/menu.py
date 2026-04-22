"""
Menu Router
API endpoints for menu item CRUD operations
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.services.menu_service import MenuService
from app.schemas.menu_item import (
    MenuItemCreate,
    MenuItemUpdate,
    MenuItemResponse,
    MenuItemListResponse,
    MenuItemSearchParams
)


router = APIRouter(prefix="/api/menu", tags=["Menu"])


def get_image_url(request: Request, image_path: Optional[str]) -> Optional[str]:
    """Convert image path to full URL"""
    if not image_path:
        return None
    # Construct base URL from request
    base_url = f"{request.url.scheme}://{request.url.netloc}"
    return f"{base_url}/{image_path}"


@router.get("")
async def get_menu_items(
    request: Request,
    search: Optional[str] = Query(None, description="Search in name and description"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    available_only: bool = Query(False, description="Show only available items"),
    featured_only: bool = Query(False, description="Show only featured items"),
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(12, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all menu items with filters and pagination
    """
    try:
        service = MenuService(db)
        result = await service.get_all(
            search=search,
            category_id=category_id,
            available_only=available_only,
            featured_only=featured_only,
            status=status,
            page=page,
            page_size=page_size
        )

        # Convert items to response format
        items_response = []
        for item in result["items"]:
            # Convert ORM object to dict
            item_dict = {
                "id": item.id,
                "name": item.name,
                "description": item.description or "",
                "category_id": item.category_id,
                "price": item.price,
                "price_in_pesos": item.price / 100,
                "temperature": item.temperature,
                "prep_time": item.prep_time,
                "size_labels": item.size_labels,
                "featured": item.featured,
                "popular": item.popular,
                "available": item.available,
                "image_path": item.image_path,
                "image_url": get_image_url(request, item.image_path),
                "notes": item.notes,
                "status": item.status,
                "category": {
                    "id": item.category.id,
                    "name": item.category.name
                } if item.category else None,
                "addons": [
                    {
                        "id": addon.id,
                        "name": addon.name,
                        "price": addon.price,
                        "price_in_pesos": addon.price / 100,
                        "category": addon.category
                    }
                    for addon in item.addons
                ],
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "updated_at": item.updated_at.isoformat() if item.updated_at else None
            }
            items_response.append(item_dict)

        return {
            "items": items_response,
            "total": result["total"],
            "page": result["page"],
            "page_size": result["page_size"],
            "total_pages": result["total_pages"]
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{item_id}")
async def get_menu_item(
    request: Request,
    item_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single menu item by ID

    - **item_id**: Menu item ID
    """
    service = MenuService(db)
    item = await service.get_by_id(item_id)

    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    # Convert ORM object to dict
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description or "",
        "category_id": item.category_id,
        "price": item.price,
        "price_in_pesos": item.price / 100,
        "temperature": item.temperature,
        "prep_time": item.prep_time,
        "size_labels": item.size_labels,
        "featured": item.featured,
        "popular": item.popular,
        "available": item.available,
        "image_path": item.image_path,
        "image_url": get_image_url(request, item.image_path),
        "notes": item.notes,
        "status": item.status,
        "category": {
            "id": item.category.id,
            "name": item.category.name
        } if item.category else None,
        "addons": [
            {
                "id": addon.id,
                "name": addon.name,
                "price": addon.price,
                "price_in_pesos": addon.price / 100,
                "category": addon.category
            }
            for addon in item.addons
        ],
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None
    }


@router.post("", status_code=201)
async def create_menu_item(
    request: Request,
    item_data: MenuItemCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new menu item

    Request body:
    - **name**: Item name (required)
    - **description**: Item description
    - **category_id**: Category ID
    - **price**: Price in cents (e.g., 500 = ₱5.00)
    - **temperature**: Temperature (Hot, Cold, Both)
    - **prep_time**: Preparation time (e.g., "10 mins")
    - **size_labels**: Size labels dict (e.g., {"small": "8oz"})
    - **featured**: Is featured item
    - **popular**: Is popular item
    - **available**: Is available for ordering
    - **notes**: Internal notes
    - **status**: Item status (draft, published, archived)
    - **addon_ids**: List of addon IDs to attach
    """
    service = MenuService(db)
    item = await service.create(item_data)

    # Convert ORM object to dict
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description or "",
        "category_id": item.category_id,
        "price": item.price,
        "price_in_pesos": item.price / 100,
        "temperature": item.temperature,
        "prep_time": item.prep_time,
        "size_labels": item.size_labels,
        "featured": item.featured,
        "popular": item.popular,
        "available": item.available,
        "image_path": item.image_path,
        "image_url": get_image_url(request, item.image_path),
        "notes": item.notes,
        "status": item.status,
        "category": {
            "id": item.category.id,
            "name": item.category.name
        } if item.category else None,
        "addons": [
            {
                "id": addon.id,
                "name": addon.name,
                "price": addon.price,
                "price_in_pesos": addon.price / 100,
                "category": addon.category
            }
            for addon in item.addons
        ],
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None
    }


@router.put("/{item_id}")
async def update_menu_item(
    request: Request,
    item_id: int,
    item_data: MenuItemUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update a menu item

    - **item_id**: Menu item ID

    All fields are optional. Only provided fields will be updated.
    """
    service = MenuService(db)
    item = await service.update(item_id, item_data)

    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    # Convert ORM object to dict
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description or "",
        "category_id": item.category_id,
        "price": item.price,
        "price_in_pesos": item.price / 100,
        "temperature": item.temperature,
        "prep_time": item.prep_time,
        "size_labels": item.size_labels,
        "featured": item.featured,
        "popular": item.popular,
        "available": item.available,
        "image_path": item.image_path,
        "image_url": get_image_url(request, item.image_path),
        "notes": item.notes,
        "status": item.status,
        "category": {
            "id": item.category.id,
            "name": item.category.name
        } if item.category else None,
        "addons": [
            {
                "id": addon.id,
                "name": addon.name,
                "price": addon.price,
                "price_in_pesos": addon.price / 100,
                "category": addon.category
            }
            for addon in item.addons
        ],
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None
    }


@router.delete("/{item_id}", status_code=204)
async def delete_menu_item(
    item_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a menu item (soft delete - sets status to archived)

    - **item_id**: Menu item ID
    """
    service = MenuService(db)
    success = await service.delete(item_id)

    if not success:
        raise HTTPException(status_code=404, detail="Menu item not found")

    return None


@router.patch("/{item_id}/toggle-availability")
async def toggle_item_availability(
    request: Request,
    item_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Toggle menu item availability

    - **item_id**: Menu item ID
    """
    service = MenuService(db)
    item = await service.toggle_availability(item_id)

    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    # Convert ORM object to dict
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description or "",
        "category_id": item.category_id,
        "price": item.price,
        "price_in_pesos": item.price / 100,
        "temperature": item.temperature,
        "prep_time": item.prep_time,
        "size_labels": item.size_labels,
        "featured": item.featured,
        "popular": item.popular,
        "available": item.available,
        "image_path": item.image_path,
        "image_url": get_image_url(request, item.image_path),
        "notes": item.notes,
        "status": item.status,
        "category": {
            "id": item.category.id,
            "name": item.category.name
        } if item.category else None,
        "addons": [
            {
                "id": addon.id,
                "name": addon.name,
                "price": addon.price,
                "price_in_pesos": addon.price / 100,
                "category": addon.category
            }
            for addon in item.addons
        ],
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None
    }


@router.post("/{item_id}/image")
async def upload_item_image(
    request: Request,
    item_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload image for a menu item

    - **item_id**: Menu item ID
    - **file**: Image file (JPG, PNG, GIF, WebP, max 10MB)
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )

    # Validate file size (10MB max)
    max_size = 10 * 1024 * 1024
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

    # Save file (in production, use cloud storage)
    import os
    import uuid
    from pathlib import Path

    # Create uploads directory
    upload_dir = Path("uploads/menu-items")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = upload_dir / unique_filename

    # Save file
    with open(file_path, "wb") as f:
        f.write(content)

    # Update menu item
    service = MenuService(db)
    update_data = MenuItemUpdate(image_path=str(file_path))
    item = await service.update(item_id, update_data)

    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    # Convert ORM object to dict
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description or "",
        "category_id": item.category_id,
        "price": item.price,
        "price_in_pesos": item.price / 100,
        "temperature": item.temperature,
        "prep_time": item.prep_time,
        "size_labels": item.size_labels,
        "featured": item.featured,
        "popular": item.popular,
        "available": item.available,
        "image_path": item.image_path,
        "image_url": get_image_url(request, item.image_path),
        "notes": item.notes,
        "status": item.status,
        "category": {
            "id": item.category.id,
            "name": item.category.name
        } if item.category else None,
        "addons": [
            {
                "id": addon.id,
                "name": addon.name,
                "price": addon.price,
                "price_in_pesos": addon.price / 100,
                "category": addon.category
            }
            for addon in item.addons
        ],
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None
    }


@router.get("/addons/list", response_model=list)
async def get_addons(
    available_only: bool = Query(False, description="Show only available addons"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all addons grouped by category

    Returns addons grouped by category (Extras, Milk, Toppings, Syrups)
    """
    service = MenuService(db)
    addons = await service.get_addons(available_only=available_only)

    # Group by category
    grouped = {}
    for addon in addons:
        if addon.category not in grouped:
            grouped[addon.category] = []
        grouped[addon.category].append({
            "id": addon.id,
            "name": addon.name,
            "price": addon.price,
            "price_in_pesos": addon.price / 100,
            "category": addon.category,
            "available": addon.available
        })

    return [
        {
            "category": category,
            "addons": items
        }
        for category, items in grouped.items()
    ]
