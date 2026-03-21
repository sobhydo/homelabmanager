from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------- Stock Location ----------

class StockLocationBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None


class StockLocationCreate(StockLocationBase):
    pass


class StockLocationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None


class StockLocationResponse(StockLocationBase):
    id: int
    pathstring: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class StockLocationTreeResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    pathstring: Optional[str] = None
    children: list["StockLocationTreeResponse"] = []

    model_config = ConfigDict(from_attributes=True)


# ---------- Stock Item ----------

class StockItemBase(BaseModel):
    component_id: int
    location_id: Optional[int] = None
    quantity: int = 0
    serial_number: Optional[str] = None
    batch: Optional[str] = None
    notes: Optional[str] = None
    status: str = "in_stock"
    expiry_date: Optional[date] = None


class StockItemCreate(StockItemBase):
    pass


class StockItemUpdate(BaseModel):
    component_id: Optional[int] = None
    location_id: Optional[int] = None
    quantity: Optional[int] = None
    serial_number: Optional[str] = None
    batch: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    expiry_date: Optional[date] = None


class StockItemResponse(StockItemBase):
    id: int
    component_name: Optional[str] = None
    location_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class StockItemListResponse(BaseModel):
    items: list[StockItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class StockItemMoveRequest(BaseModel):
    location_id: int


class StockItemAdjustRequest(BaseModel):
    quantity: int
    reason: Optional[str] = None
