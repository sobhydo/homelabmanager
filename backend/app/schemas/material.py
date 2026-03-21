from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class MaterialBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    quantity: float = 0.0
    unit: str = "pcs"
    min_quantity: float = 0.0
    location: Optional[str] = None
    supplier: Optional[str] = None
    unit_price: Optional[float] = None
    notes: Optional[str] = None


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    min_quantity: Optional[float] = None
    location: Optional[str] = None
    supplier: Optional[str] = None
    unit_price: Optional[float] = None
    notes: Optional[str] = None


class MaterialResponse(MaterialBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MaterialListResponse(BaseModel):
    items: list[MaterialResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
