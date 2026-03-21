from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class BuildOrder(Base):
    __tablename__ = "build_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reference = Column(String(100), nullable=False, unique=True)
    bom_id = Column(Integer, ForeignKey("boms.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    quantity = Column(Integer, nullable=False)
    completed_quantity = Column(Integer, default=0)
    status = Column(String(50), default="pending")
    priority = Column(Integer, default=0)
    target_date = Column(Date, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    bom = relationship("BOM", backref="build_orders")
    allocations = relationship(
        "BuildAllocation", back_populates="build_order", cascade="all, delete-orphan"
    )
    outputs = relationship(
        "BuildOutput", back_populates="build_order", cascade="all, delete-orphan"
    )


class BuildAllocation(Base):
    __tablename__ = "build_allocations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    build_order_id = Column(Integer, ForeignKey("build_orders.id"), nullable=False)
    bom_item_id = Column(Integer, ForeignKey("bom_items.id"), nullable=False)
    stock_item_id = Column(Integer, ForeignKey("stock_items.id"), nullable=True)
    component_id = Column(Integer, ForeignKey("components.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    build_order = relationship("BuildOrder", back_populates="allocations")
    bom_item = relationship("BOMItem", backref="build_allocations")
    stock_item = relationship("StockItem", backref="build_allocations")
    component = relationship("Component", backref="build_allocations")


class BuildOutput(Base):
    __tablename__ = "build_outputs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    build_order_id = Column(Integer, ForeignKey("build_orders.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    serial_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, server_default=func.now())

    build_order = relationship("BuildOrder", back_populates="outputs")
