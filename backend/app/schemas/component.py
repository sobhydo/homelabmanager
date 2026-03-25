from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ComponentBase(BaseModel):
    name: str
    manufacturer_part_number: Optional[str] = None
    supplier_part_number: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    quantity: int = 0
    min_quantity: int = 0
    location: Optional[str] = None
    datasheet_url: Optional[str] = None
    unit_price: Optional[float] = None
    supplier: Optional[str] = None
    supplier_url: Optional[str] = None
    package_type: Optional[str] = None
    notes: Optional[str] = None
    # Part-DB style fields
    category_id: Optional[int] = None
    footprint_id: Optional[int] = None
    tags: Optional[str] = None
    manufacturer: Optional[str] = None
    mpn: Optional[str] = None
    ipn: Optional[str] = None
    is_favorite: bool = False
    status: str = "active"
    min_order_quantity: Optional[int] = None


class ComponentCreate(ComponentBase):
    pass


class ComponentUpdate(BaseModel):
    name: Optional[str] = None
    manufacturer_part_number: Optional[str] = None
    supplier_part_number: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    quantity: Optional[int] = None
    min_quantity: Optional[int] = None
    location: Optional[str] = None
    datasheet_url: Optional[str] = None
    unit_price: Optional[float] = None
    supplier: Optional[str] = None
    supplier_url: Optional[str] = None
    package_type: Optional[str] = None
    notes: Optional[str] = None
    # Part-DB style fields
    category_id: Optional[int] = None
    footprint_id: Optional[int] = None
    tags: Optional[str] = None
    manufacturer: Optional[str] = None
    mpn: Optional[str] = None
    ipn: Optional[str] = None
    is_favorite: Optional[bool] = None
    status: Optional[str] = None
    min_order_quantity: Optional[int] = None


class ComponentResponse(ComponentBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    category_name: Optional[str] = None
    footprint_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StockTransactionResponse(BaseModel):
    id: int
    component_id: int
    quantity_change: int
    reason: str
    reference_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ComponentListResponse(BaseModel):
    items: list[ComponentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
