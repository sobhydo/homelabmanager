from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class FeederBase(BaseModel):
    machine_id: int
    slot_number: int
    component_value: Optional[str] = None
    component_package: Optional[str] = None
    part_number: Optional[str] = None
    nozzle: int = 1
    pick_height: float = 0.0
    place_height: float = 0.0
    mount_speed: int = 100
    head: int = 0
    notes: Optional[str] = None


class FeederCreate(FeederBase):
    pass


class FeederUpdate(BaseModel):
    slot_number: Optional[int] = None
    component_value: Optional[str] = None
    component_package: Optional[str] = None
    part_number: Optional[str] = None
    nozzle: Optional[int] = None
    pick_height: Optional[float] = None
    place_height: Optional[float] = None
    mount_speed: Optional[int] = None
    head: Optional[int] = None
    notes: Optional[str] = None


class FeederResponse(FeederBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class FeederListResponse(BaseModel):
    items: list[FeederResponse]
    total: int
