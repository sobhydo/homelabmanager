from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class BOMItemBase(BaseModel):
    reference_designator: Optional[str] = None
    quantity: int = 1
    manufacturer_part_number: Optional[str] = None
    supplier_part_number: Optional[str] = None
    description: Optional[str] = None
    value: Optional[str] = None
    package: Optional[str] = None


class BOMItemCreate(BOMItemBase):
    bom_id: int
    component_id: Optional[int] = None


class BOMItemResponse(BOMItemBase):
    id: int
    bom_id: int
    component_id: Optional[int] = None
    matched: int = 0
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BOMBase(BaseModel):
    name: str
    description: Optional[str] = None
    version: Optional[str] = None
    status: str = "draft"


class BOMCreate(BOMBase):
    pass


class BOMResponse(BOMBase):
    id: int
    source_file: Optional[str] = None
    total_cost: Optional[float] = None
    items: list[BOMItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BOMListResponse(BaseModel):
    items: list[BOMResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class BuildBase(BaseModel):
    quantity: int = 1
    notes: Optional[str] = None


class BuildCreate(BuildBase):
    pass


class BuildResponse(BuildBase):
    id: int
    bom_id: int
    status: str
    built_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BOMUploadResponse(BaseModel):
    bom_id: int
    name: str
    total_items: int
    matched_items: int
    unmatched_items: int


class BOMItemAvailability(BaseModel):
    bom_item_id: int
    component_id: Optional[int] = None
    manufacturer_part_number: Optional[str] = None
    required: int
    available: int
    sufficient: bool


class BOMAvailability(BaseModel):
    bom_id: int
    bom_name: str
    total_items: int
    items: list[BOMItemAvailability]
    all_available: bool
