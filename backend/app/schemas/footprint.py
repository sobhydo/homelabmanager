from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class FootprintBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None


class FootprintCreate(FootprintBase):
    pass


class FootprintUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None


class FootprintResponse(FootprintBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class FootprintListResponse(BaseModel):
    items: list[FootprintResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
