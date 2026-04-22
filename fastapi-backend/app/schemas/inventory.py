"""
Inventory Schemas
Pydantic schemas for inventory validation and response
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime, timedelta
from app.models.stock_unit import StockUnit


class InventoryBase(BaseModel):
    """Base inventory item schema"""
    name: str = Field(..., min_length=1, max_length=255, description="Item name")
    description: Optional[str] = Field(None, max_length=1000, description="Item description")
    category_id: Optional[int] = Field(None, description="Category ID")

    # Stock management fields
    stock_quantity: int = Field(default=0, ge=0, description="Current stock quantity")
    stock_unit: str = Field(default="pcs", description="Unit of measurement (pcs, l, kg, ml, g, etc.)")
    low_stock_threshold: int = Field(default=10, ge=0, description="Low stock alert threshold")
    reorder_level: int = Field(default=5, ge=0, description="Reorder point")
    reorder_quantity: int = Field(default=50, ge=1, description="Suggested restock quantity")

    # Container tracking (optional)
    container_type: Optional[str] = Field(None, max_length=50, description="Container type (Box, Bottle, Sack, etc.)")
    container_capacity: Optional[int] = Field(None, ge=1, description="Container capacity in stock_unit")

    @field_validator('stock_unit')
    @classmethod
    def validate_stock_unit(cls, v):
        """Validate that the stock unit is valid"""
        valid_units = [u['value'] for u in StockUnit.get_all_units()]
        if v not in valid_units:
            raise ValueError(f"Invalid stock unit. Must be one of: {', '.join(valid_units)}")
        return v


class InventoryCreate(InventoryBase):
    """Schema for creating an inventory item"""
    pass


class InventoryUpdate(BaseModel):
    """Schema for updating an inventory item"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    category_id: Optional[int] = None

    # Stock management fields (optional for update)
    stock_quantity: Optional[int] = Field(None, ge=0)
    stock_unit: Optional[str] = Field(None, description="Unit of measurement")
    low_stock_threshold: Optional[int] = Field(None, ge=0)
    reorder_level: Optional[int] = Field(None, ge=0)
    reorder_quantity: Optional[int] = Field(None, ge=1)

    # Container tracking (optional)
    container_type: Optional[str] = Field(None, max_length=50)
    container_capacity: Optional[int] = Field(None, ge=1)

    @field_validator('stock_unit')
    @classmethod
    def validate_stock_unit(cls, v):
        """Validate that the stock unit is valid"""
        if v is not None:
            valid_units = [u['value'] for u in StockUnit.get_all_units()]
            if v not in valid_units:
                raise ValueError(f"Invalid stock unit. Must be one of: {', '.join(valid_units)}")
        return v


class StockLevel(BaseModel):
    """Stock level status for inventory display"""
    current: int = Field(..., description="Current stock quantity")
    unit: str = Field(..., description="Unit of measurement")
    unit_display: str = Field(..., description="Human-readable unit name")
    status: Literal["in_stock", "low_stock", "out_of_stock"] = Field(..., description="Stock status")
    threshold: int = Field(..., description="Low stock threshold")
    percentage: int = Field(..., description="Stock level percentage for progress bars")


class InventoryResponse(InventoryBase):
    """Schema for inventory item response"""
    id: int
    last_restocked_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    category: Optional[dict] = None

    # Computed fields
    stock_status: Literal["in_stock", "low_stock", "out_of_stock"]
    needs_reorder: bool
    stock_level_percentage: int
    unit_display: str
    unit_type: str
    days_since_restock: Optional[int] = None

    # Container tracking (optional)
    container_type: Optional[str] = None
    container_capacity: Optional[int] = None
    container_count: Optional[float] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_relations(cls, obj, category=None):
        """Create response with relations"""
        data = cls.from_orm(obj)

        # Add category info
        if category:
            data.category = {
                "id": category.id,
                "name": category.name
            }

        # Add computed fields
        data.stock_status = obj.stock_status
        data.needs_reorder = obj.needs_reorder
        data.stock_level_percentage = obj.stock_level_percentage
        data.unit_display = obj.get_unit_display_name()
        data.unit_type = obj.get_unit_type()

        # Calculate days since restock
        if obj.last_restocked_at:
            data.days_since_restock = (datetime.now() - obj.last_restocked_at.replace(tzinfo=None)).days

        return data


class InventoryListResponse(BaseModel):
    """Schema for list of inventory items"""
    items: list[InventoryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class InventorySearchParams(BaseModel):
    """Schema for inventory search parameters"""
    search: Optional[str] = Field(None, description="Search in name and description")
    category_id: Optional[int] = Field(None, description="Filter by category")
    stock_status: Optional[Literal["in_stock", "low_stock", "out_of_stock"]] = Field(None, description="Filter by stock status")
    unit_type: Optional[Literal["count", "volume", "weight"]] = Field(None, description="Filter by unit type")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Items per page")


class LowStockItemResponse(InventoryResponse):
    """Extended response for low stock items"""
    pass


class LowStockReport(BaseModel):
    """Low stock items report"""
    items: list[LowStockItemResponse]
    total_count: int
    categories: dict[str, int] = Field(default_factory=dict, description="Count by category")


class StockAdjustment(BaseModel):
    """Stock adjustment request"""
    quantity: int = Field(..., description="Quantity to add (positive) or remove (negative)")
    reason: str = Field(..., min_length=1, max_length=255, description="Reason for adjustment")
    reference: Optional[str] = Field(None, max_length=100, description="Reference number (order, invoice, etc.)")


class StockAdjustmentReason(str):
    """Predefined stock adjustment reasons"""
    SALE = "sale"               # Sold to customer
    RESTOCK = "restock"         # Restocked from supplier
    DAMAGE = "damage"           # Item damaged
    SPOILAGE = "spoilage"       # Item spoiled/expired
    THEFT = "theft"             # Item stolen
    ADJUSTMENT = "adjustment"   # Manual adjustment
    RETURN = "return"           # Customer return
    TRANSFER = "transfer"       # Transferred to/from another location
    WASTE = "waste"             # Waste/spillage


class BulkRestockRequest(BaseModel):
    """Request for bulk restocking multiple items"""
    item_ids: list[int] = Field(..., min_items=1, description="List of item IDs to restock")
    quantity: Optional[int] = Field(None, ge=1, description="Custom quantity (default: use reorder_quantity)")


class InventoryStats(BaseModel):
    """Inventory statistics for dashboard"""
    total_items: int = Field(..., description="Total number of inventory items")
    in_stock_count: int = Field(..., description="Number of items in stock")
    low_stock_count: int = Field(..., description="Number of items at low stock")
    out_of_stock_count: int = Field(..., description="Number of items out of stock")
    total_value: float = Field(..., description="Total value of inventory in pesos")
    categories: list[dict] = Field(default_factory=list, description="Breakdown by category")


class StockLevelUpdate(BaseModel):
    """Request to update stock thresholds"""
    low_stock_threshold: Optional[int] = Field(None, ge=0, description="New low stock threshold")
    reorder_level: Optional[int] = Field(None, ge=0, description="New reorder level")
    reorder_quantity: Optional[int] = Field(None, ge=1, description="New reorder quantity")
