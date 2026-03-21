from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------- Build Allocation ----------

class BuildAllocationCreate(BaseModel):
    bom_item_id: int
    stock_item_id: Optional[int] = None
    component_id: int
    quantity: int


class BuildAllocationResponse(BaseModel):
    id: int
    build_order_id: int
    bom_item_id: int
    stock_item_id: Optional[int] = None
    component_id: int
    quantity: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ---------- Build Output ----------

class BuildOutputCreate(BaseModel):
    quantity: int
    serial_number: Optional[str] = None
    notes: Optional[str] = None


class BuildOutputResponse(BaseModel):
    id: int
    build_order_id: int
    quantity: int
    serial_number: Optional[str] = None
    notes: Optional[str] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ---------- Build Order ----------

class BuildOrderBase(BaseModel):
    bom_id: int
    title: str
    description: Optional[str] = None
    quantity: int
    priority: int = 0
    target_date: Optional[date] = None
    notes: Optional[str] = None


class BuildOrderCreate(BuildOrderBase):
    pass


class BuildOrderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    priority: Optional[int] = None
    target_date: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class BuildOrderResponse(BaseModel):
    id: int
    reference: str
    bom_id: int
    title: str
    description: Optional[str] = None
    quantity: int
    completed_quantity: int = 0
    status: str
    priority: int = 0
    target_date: Optional[date] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    bom_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BuildOrderDetailResponse(BuildOrderResponse):
    allocations: list[BuildAllocationResponse] = []
    outputs: list[BuildOutputResponse] = []


class BuildOrderListResponse(BaseModel):
    items: list[BuildOrderResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
