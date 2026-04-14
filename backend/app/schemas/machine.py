from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class MachineBase(BaseModel):
    name: str
    machine_type: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    status: str = "offline"
    specs: Optional[dict[str, Any]] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None
    pcb_origin_x: Optional[float] = None
    pcb_origin_y: Optional[float] = None
    nozzle_height_datum: Optional[float] = None
    default_mount_speed: Optional[int] = None


class MachineCreate(MachineBase):
    pass


class MachineUpdate(BaseModel):
    name: Optional[str] = None
    machine_type: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    specs: Optional[dict[str, Any]] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None
    pcb_origin_x: Optional[float] = None
    pcb_origin_y: Optional[float] = None
    nozzle_height_datum: Optional[float] = None
    default_mount_speed: Optional[int] = None


class MachineResponse(MachineBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MachineListResponse(BaseModel):
    items: list[MachineResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class MaintenanceTaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    status: str = "pending"
    scheduled_date: Optional[datetime] = None
    recurrence_days: Optional[int] = None
    notes: Optional[str] = None


class MaintenanceTaskCreate(MaintenanceTaskBase):
    pass


class MaintenanceTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    recurrence_days: Optional[int] = None
    notes: Optional[str] = None


class MaintenanceTaskResponse(MaintenanceTaskBase):
    id: int
    machine_id: int
    completed_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MachineCommand(BaseModel):
    command: str
    params: Optional[dict[str, Any]] = None
