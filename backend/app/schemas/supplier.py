from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# --- Supplier ---

class SupplierBase(BaseModel):
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierResponse(SupplierBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SupplierListResponse(BaseModel):
    items: list[SupplierResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- Manufacturer ---

class ManufacturerBase(BaseModel):
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class ManufacturerCreate(ManufacturerBase):
    pass


class ManufacturerUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ManufacturerResponse(ManufacturerBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ManufacturerListResponse(BaseModel):
    items: list[ManufacturerResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- SupplierPart ---

class SupplierPartBase(BaseModel):
    component_id: int
    supplier_id: int
    supplier_part_number: Optional[str] = None
    unit_price: Optional[float] = None
    currency: str = "USD"
    pack_quantity: int = 1
    lead_time_days: Optional[int] = None
    url: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class SupplierPartCreate(BaseModel):
    component_id: int
    supplier_id: Optional[int] = None
    supplier_part_number: Optional[str] = None
    unit_price: Optional[float] = None
    currency: str = "USD"
    pack_quantity: int = 1
    lead_time_days: Optional[int] = None
    url: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class SupplierPartUpdate(BaseModel):
    supplier_part_number: Optional[str] = None
    unit_price: Optional[float] = None
    currency: Optional[str] = None
    pack_quantity: Optional[int] = None
    lead_time_days: Optional[int] = None
    url: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierPartResponse(SupplierPartBase):
    id: int
    supplier_name: Optional[str] = None
    component_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# --- ManufacturerPart ---

class ManufacturerPartBase(BaseModel):
    component_id: int
    manufacturer_id: int
    manufacturer_part_number: str
    description: Optional[str] = None
    url: Optional[str] = None


class ManufacturerPartCreate(BaseModel):
    component_id: int
    manufacturer_id: Optional[int] = None
    manufacturer_part_number: str
    description: Optional[str] = None
    url: Optional[str] = None


class ManufacturerPartUpdate(BaseModel):
    manufacturer_part_number: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None


class ManufacturerPartResponse(ManufacturerPartBase):
    id: int
    manufacturer_name: Optional[str] = None
    component_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
