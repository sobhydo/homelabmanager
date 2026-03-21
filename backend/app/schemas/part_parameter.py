from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PartParameterBase(BaseModel):
    name: str
    symbol: Optional[str] = None
    value_text: Optional[str] = None
    value_min: Optional[float] = None
    value_typical: Optional[float] = None
    value_max: Optional[float] = None
    unit: Optional[str] = None
    group_name: Optional[str] = None
    sort_order: int = 0


class PartParameterCreate(PartParameterBase):
    pass


class PartParameterUpdate(BaseModel):
    name: Optional[str] = None
    symbol: Optional[str] = None
    value_text: Optional[str] = None
    value_min: Optional[float] = None
    value_typical: Optional[float] = None
    value_max: Optional[float] = None
    unit: Optional[str] = None
    group_name: Optional[str] = None
    sort_order: Optional[int] = None


class PartParameterResponse(PartParameterBase):
    id: int
    component_id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
