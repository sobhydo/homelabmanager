from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SystemSettingResponse(BaseModel):
    id: int
    key: str
    value: Optional[str] = None
    value_type: str
    category: Optional[str] = None
    description: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SystemSettingUpdate(BaseModel):
    value: str


class SystemSettingBulkUpdateItem(BaseModel):
    key: str
    value: str


class SystemSettingBulkUpdate(BaseModel):
    settings: list[SystemSettingBulkUpdateItem]
