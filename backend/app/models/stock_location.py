from sqlalchemy import Column, Date, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class StockLocation(Base):
    __tablename__ = "stock_locations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey("stock_locations.id"), nullable=True)
    pathstring = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    parent = relationship(
        "StockLocation", remote_side=[id], back_populates="children"
    )
    children = relationship(
        "StockLocation", back_populates="parent", cascade="all, delete-orphan"
    )
    stock_items = relationship(
        "StockItem", back_populates="location", cascade="all, delete-orphan"
    )
    part_lots = relationship(
        "PartLot", back_populates="location"
    )


class StockItem(Base):
    __tablename__ = "stock_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    component_id = Column(Integer, ForeignKey("components.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("stock_locations.id"), nullable=True)
    quantity = Column(Integer, nullable=False, default=0)
    serial_number = Column(String(100), nullable=True)
    batch = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="in_stock")
    expiry_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    component = relationship("Component", backref="stock_items")
    location = relationship("StockLocation", back_populates="stock_items")
