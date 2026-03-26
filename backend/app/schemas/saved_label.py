from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SavedLabelCreate(BaseModel):
    name: str
    paper_size: str = "a4"
    template_index: int = 0
    font_size: int = 10
    font_weight: str = "normal"
    show_border: bool = True
    labels_json: str  # JSON string


class SavedLabelUpdate(BaseModel):
    name: Optional[str] = None
    paper_size: Optional[str] = None
    template_index: Optional[int] = None
    font_size: Optional[int] = None
    font_weight: Optional[str] = None
    show_border: Optional[bool] = None
    labels_json: Optional[str] = None


class SavedLabelResponse(BaseModel):
    id: int
    name: str
    paper_size: str
    template_index: int
    font_size: int
    font_weight: str
    show_border: bool
    labels_json: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
