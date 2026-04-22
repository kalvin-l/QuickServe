"""
Inventory Router
API endpoints for inventory management operations
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Literal
from app.core.database import get_db
from app.services.inventory_service import InventoryService
from app.models.stock_unit import StockUnit
from app.schemas.inventory import (
    InventoryCreate,
    InventoryUpdate,
    StockAdjustment,
    BulkRestockRequest,
    InventoryStats,
    InventoryResponse,
    LowStockReport
)


router = APIRouter(prefix="/api/inventory", tags=["Inventory"])


def get_image_url(request: Request, image_path: Optional[str]) -> Optional[str]:
    """Convert image path to full URL"""
    if not image_path:
        return None
    base_url = f"{request.url.scheme}://{request.url.netloc}"
    return f"{base_url}/{image_path}"


@router.get("/items")
async def get_inventory_items(
    request: Request,
    search: Optional[str] = Query(None, description="Search in name and description"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    stock_status: Optional[Literal["in_stock", "low_stock", "out_of_stock"]] = Query(
        None, description="Filter by stock status"
    ),
    unit_type: Optional[Literal["count", "volume", "weight"]] = Query(
        None, description="Filter by unit type"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all inventory items with filters and pagination

    Query Parameters:
    - **search**: Search in name and description
    - **category_id**: Filter by category ID
    - **stock_status**: Filter by stock status (in_stock, low_stock, out_of_stock)
    - **unit_type**: Filter by unit type (count, volume, weight)
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    """
    try:
        service = InventoryService(db)
        result = await service.get_all_items(
            search=search,
            category_id=category_id,
            stock_status=stock_status,
            unit_type=unit_type,
            page=page,
            page_size=page_size
        )

        # Convert items to inventory response format
        items_response = [
            service._build_inventory_response(item)
            for item in result["items"]
        ]

        # Add image URLs
        for item_response in items_response:
            item_response["image_url"] = get_image_url(request, item_response.get("image_path"))

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


@router.get("/items/{item_id}")
async def get_inventory_item(
    request: Request,
    item_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single inventory item by ID

    - **item_id**: Menu item ID
    """
    service = InventoryService(db)
    item = await service.get_by_id(item_id)

    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    response = service._build_inventory_response(item)
    response["image_url"] = get_image_url(request, response.get("image_path"))
    return response


@router.get("/low-stock")
async def get_low_stock_items(
    request: Request,
    threshold: Optional[int] = Query(None, description="Override default low stock threshold"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get items below their low stock threshold

    Query Parameters:
    - **threshold**: Custom threshold (overrides each item's low_stock_threshold)
    - **category_id**: Filter by category ID

    Returns items that need restocking, sorted by stock quantity (lowest first)
    """
    service = InventoryService(db)
    items = await service.get_low_stock_items(threshold=threshold, category_id=category_id)

    # Convert to response format
    items_response = [
        service._build_inventory_response(item)
        for item in items
    ]

    # Add image URLs
    for item_response in items_response:
        item_response["image_url"] = get_image_url(request, item_response.get("image_path"))

    # Count by category
    categories = {}
    for item_response in items_response:
        category = item_response.get("category")
        cat_name = category.get("name") if category else "Uncategorized"
        categories[cat_name] = categories.get(cat_name, 0) + 1

    return {
        "items": items_response,
        "total_count": len(items_response),
        "categories": categories
    }


@router.get("/stats")
async def get_inventory_stats(
    db: AsyncSession = Depends(get_db)
):
    """
    Get inventory statistics for dashboard

    Returns:
    - total_items: Total number of inventory items
    - in_stock_count: Number of items in stock
    - low_stock_count: Number of items at low stock
    - out_of_stock_count: Number of items out of stock
    - total_value: Total value of inventory in pesos
    - categories: Breakdown by category
    """
    service = InventoryService(db)
    stats = await service.get_inventory_stats()
    return stats


@router.get("/categories")
async def get_inventory_categories(
    db: AsyncSession = Depends(get_db)
):
    """
    Get all categories for inventory filtering

    Returns list of {value: str, label: str} for select dropdowns
    """
    service = InventoryService(db)
    categories = await service.get_categories_with_inventory()

    # Add "All Categories" option at the beginning
    return [
        {"value": "", "label": "All Categories"},
        *categories
    ]


@router.post("/items")
async def create_inventory_item(
    item_data: InventoryCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new inventory item

    Request body:
    - **name**: Item name (required)
    - **description**: Item description
    - **category_id**: Category ID
    - **stock_quantity**: Current stock quantity (default: 0)
    - **stock_unit**: Unit of measurement (default: pcs)
    - **low_stock_threshold**: Low stock alert threshold (default: 10)
    - **reorder_level**: Reorder point (default: 5)
    - **reorder_quantity**: Suggested restock quantity (default: 50)

    Example:
    ```json
    {
        "name": "Whole Milk",
        "description": "Fresh whole milk for coffee drinks",
        "category_id": 1,
        "stock_quantity": 5000,
        "stock_unit": "ml",
        "low_stock_threshold": 1000,
        "reorder_level": 500,
        "reorder_quantity": 5000
    }
    ```
    """
    try:
        service = InventoryService(db)
        item = await service.create(item_data)
        return service._build_inventory_response(item)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/items/{item_id}")
async def update_inventory_item(
    item_id: int,
    item_data: InventoryUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing inventory item

    - **item_id**: Inventory item ID
    - All fields are optional, only provided fields will be updated

    Example:
    ```json
    {
        "name": "Whole Milk 2%",
        "stock_quantity": 6000,
        "low_stock_threshold": 1500
    }
    ```
    """
    try:
        service = InventoryService(db)
        item = await service.update(item_id, item_data)

        if not item:
            raise HTTPException(status_code=404, detail="Inventory item not found")

        return service._build_inventory_response(item)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/items/{item_id}")
async def delete_inventory_item(
    item_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an inventory item

    - **item_id**: Inventory item ID

    **Warning**: This will permanently delete the item. If the item is used in recipes,
    consider what happens to those recipes.
    """
    service = InventoryService(db)
    success = await service.delete(item_id)

    if not success:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    return {"message": "Inventory item deleted successfully"}


@router.patch("/items/{item_id}/stock")
async def adjust_stock(
    request: Request,
    item_id: int,
    adjustment: StockAdjustment,
    db: AsyncSession = Depends(get_db)
):
    """
    Adjust stock quantity for an item

    - **item_id**: Menu item ID
    - **quantity**: Quantity to add (positive) or remove (negative)
    - **reason**: Reason for adjustment (sale, restock, damage, spoilage, theft, etc.)
    - **reference**: Optional reference number (order ID, invoice, etc.)

    Example:
    ```json
    {
        "quantity": -5,
        "reason": "sale",
        "reference": "ORD-12345"
    }
    ```
    """
    try:
        service = InventoryService(db)
        item = await service.adjust_stock(
            item_id=item_id,
            quantity=adjustment.quantity,
            reason=adjustment.reason,
            reference=adjustment.reference
        )

        if not item:
            raise HTTPException(status_code=404, detail="Inventory item not found")

        response = service._build_inventory_response(item)
        response["image_url"] = get_image_url(request, response.get("image_path"))
        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/items/{item_id}/restock")
async def restock_item(
    request: Request,
    item_id: int,
    quantity: Optional[int] = Query(None, description="Custom restock quantity"),
    db: AsyncSession = Depends(get_db)
):
    """
    Restock an item to its reorder_quantity level or custom amount

    - **item_id**: Menu item ID
    - **quantity**: Custom restock quantity (if not provided, uses item's reorder_quantity)

    This adds the specified quantity to the current stock level and updates last_restocked_at.
    """
    service = InventoryService(db)
    item = await service.restock_item(item_id=item_id, quantity=quantity)

    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    response = service._build_inventory_response(item)
    response["image_url"] = get_image_url(request, response.get("image_path"))
    return response


@router.post("/bulk-restock")
async def bulk_restock(
    request: Request,
    data: BulkRestockRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Restock multiple items at once

    Request body:
    - **item_ids**: List of item IDs to restock
    - **quantity**: Custom restock quantity (if not provided, uses each item's reorder_quantity)

    Example:
    ```json
    {
        "item_ids": [1, 2, 3],
        "quantity": 100
    }
    ```
    """
    service = InventoryService(db)
    results = await service.bulk_restock(
        item_ids=data.item_ids,
        quantity=data.quantity
    )

    # Return success/failure status for each item
    success_count = sum(1 for v in results.values() if v)
    failed_count = len(results) - success_count

    return {
        "results": results,
        "summary": {
            "total": len(results),
            "success": success_count,
            "failed": failed_count
        }
    }


@router.put("/items/{item_id}/stock-levels")
async def set_stock_levels(
    request: Request,
    item_id: int,
    stock_quantity: int = Query(..., ge=0, description="New stock quantity"),
    low_stock_threshold: Optional[int] = Query(None, ge=0, description="New low stock threshold"),
    reorder_level: Optional[int] = Query(None, ge=0, description="New reorder level"),
    reorder_quantity: Optional[int] = Query(None, ge=1, description="New reorder quantity"),
    db: AsyncSession = Depends(get_db)
):
    """
    Set stock levels for an item

    - **item_id**: Menu item ID
    - **stock_quantity**: New stock quantity (required)
    - **low_stock_threshold**: New low stock threshold (optional)
    - **reorder_level**: New reorder level (optional)
    - **reorder_quantity**: New reorder quantity (optional)

    All parameters are optional except stock_quantity. Only provided parameters will be updated.
    """
    service = InventoryService(db)
    item = await service.set_stock_levels(
        item_id=item_id,
        stock_quantity=stock_quantity,
        low_stock_threshold=low_stock_threshold,
        reorder_level=reorder_level,
        reorder_quantity=reorder_quantity
    )

    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    response = service._build_inventory_response(item)
    response["image_url"] = get_image_url(request, response.get("image_path"))
    return response


@router.get("/units")
async def get_stock_units():
    """
    Get all available stock units with their metadata

    Returns list of units grouped by type (count, volume, weight)
    """
    return {
        "count": StockUnit.get_units_by_type("count"),
        "volume": StockUnit.get_units_by_type("volume"),
        "weight": StockUnit.get_units_by_type("weight")
    }
