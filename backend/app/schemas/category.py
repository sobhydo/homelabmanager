from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None
    pathstring: Optional[str] = None
    default_footprint_id: Optional[int] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None
    pathstring: Optional[str] = None
    default_footprint_id: Optional[int] = None


class CategoryResponse(CategoryBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CategoryDetailResponse(CategoryResponse):
    children_count: int = 0
    parts_count: int = 0


class CategoryTreeResponse(CategoryResponse):
    children: list[CategoryTreeResponse] = []

    model_config = ConfigDict(from_attributes=True)
