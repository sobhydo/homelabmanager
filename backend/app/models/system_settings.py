from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(255), nullable=False, unique=True, index=True)
    value = Column(Text, nullable=True)
    value_type = Column(String(50), default="string")  # "string", "integer", "boolean", "json"
    category = Column(String(100), nullable=True)  # "general", "appearance", "integrations", "notifications"
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
