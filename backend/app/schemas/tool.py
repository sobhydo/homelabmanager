from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ToolBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    location: Optional[str] = None
    condition: str = "good"
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None
    status: str = "available"


class ToolCreate(ToolBase):
    pass


class ToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    location: Optional[str] = None
    condition: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class ToolResponse(ToolBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ToolListResponse(BaseModel):
    items: list[ToolResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ToolCheckoutBase(BaseModel):
    checked_out_by: str
    expected_return: Optional[datetime] = None
    notes: Optional[str] = None


class ToolCheckoutCreate(ToolCheckoutBase):
    pass


class ToolCheckinRequest(BaseModel):
    notes: Optional[str] = None


class ToolCheckoutResponse(ToolCheckoutBase):
    id: int
    tool_id: int
    checked_out_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
