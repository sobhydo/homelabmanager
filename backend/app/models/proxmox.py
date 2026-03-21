from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from app.database import Base


class ProxmoxServer(Base):
    __tablename__ = "proxmox_servers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    host = Column(String(255), nullable=False)
    port = Column(Integer, default=8006)
    username = Column(String(255), nullable=True)
    token_name = Column(String(255), nullable=True)
    token_value = Column(String(500), nullable=True)
    verify_ssl = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="unknown")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
