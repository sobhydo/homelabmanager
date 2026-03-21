from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AttachmentResponse(BaseModel):
    id: int
    filename: str
    filepath: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    attachment_type: str
    entity_type: str
    entity_id: int
    is_primary: bool = False
    description: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
