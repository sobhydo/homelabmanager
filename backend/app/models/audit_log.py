from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # "login", "logout", "create", "update", "delete", "settings_change"
    entity_type = Column(String(100), nullable=True)  # "component", "user", "settings", etc.
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)  # JSON string with details
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
