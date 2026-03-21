from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from sqlalchemy.sql import func

from app.database import Base


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    quantity = Column(Float, default=0.0)
    unit = Column(String(50), default="pcs")
    min_quantity = Column(Float, default=0.0)
    location = Column(String(255), nullable=True)
    supplier = Column(String(255), nullable=True)
    unit_price = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
