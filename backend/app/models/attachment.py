from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, Index
from sqlalchemy.sql import func

from app.database import Base


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    attachment_type = Column(String(50), nullable=False)  # datasheet, image, manual, other
    entity_type = Column(String(50), nullable=False)  # component, machine, tool, etc.
    entity_id = Column(Integer, nullable=False)
    is_primary = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_attachments_entity", "entity_type", "entity_id"),
    )
