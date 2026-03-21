from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PartLotBase(BaseModel):
    location_id: Optional[int] = None
    quantity: int = 0
    description: Optional[str] = None
    expiry_date: Optional[date] = None
    needs_refill: bool = False


class PartLotCreate(PartLotBase):
    pass


class PartLotUpdate(BaseModel):
    location_id: Optional[int] = None
    quantity: Optional[int] = None
    description: Optional[str] = None
    expiry_date: Optional[date] = None
    needs_refill: Optional[bool] = None


class PartLotResponse(PartLotBase):
    id: int
    component_id: int
    location_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
