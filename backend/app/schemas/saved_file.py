from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SavedFileResponse(BaseModel):
    id: int
    name: str
    original_filename: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    category: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SavedFileListResponse(BaseModel):
    items: list[SavedFileResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
