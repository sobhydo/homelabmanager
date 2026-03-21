from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class BOM(Base):
    __tablename__ = "boms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    source_file = Column(String(500), nullable=True)
    version = Column(String(50), nullable=True)
    status = Column(String(50), default="draft")
    total_cost = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    items = relationship("BOMItem", back_populates="bom", cascade="all, delete-orphan")
    builds = relationship("Build", back_populates="bom", cascade="all, delete-orphan")


class BOMItem(Base):
    __tablename__ = "bom_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bom_id = Column(Integer, ForeignKey("boms.id"), nullable=False)
    component_id = Column(Integer, ForeignKey("components.id"), nullable=True)
    reference_designator = Column(String(100), nullable=True)
    quantity = Column(Integer, default=1)
    manufacturer_part_number = Column(String(100), nullable=True)
    supplier_part_number = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    value = Column(String(100), nullable=True)
    package = Column(String(50), nullable=True)
    matched = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    bom = relationship("BOM", back_populates="items")
    component = relationship("Component", back_populates="bom_items")


class Build(Base):
    __tablename__ = "builds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bom_id = Column(Integer, ForeignKey("boms.id"), nullable=False)
    quantity = Column(Integer, default=1)
    status = Column(String(50), default="planned")
    notes = Column(Text, nullable=True)
    built_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    bom = relationship("BOM", back_populates="builds")
