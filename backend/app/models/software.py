from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from sqlalchemy.sql import func

from app.database import Base


class Software(Base):
    __tablename__ = "software"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    version = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    license_type = Column(String(100), nullable=True)
    license_key = Column(String(500), nullable=True)
    vendor = Column(String(255), nullable=True)
    url = Column(String(500), nullable=True)
    installed_on = Column(String(255), nullable=True)
    status = Column(String(50), default="active")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    provider = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    cost = Column(Float, nullable=True)
    billing_cycle = Column(String(50), default="monthly")
    start_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    auto_renew = Column(Integer, default=1)
    category = Column(String(100), nullable=True)
    url = Column(String(500), nullable=True)
    status = Column(String(50), default="active")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
