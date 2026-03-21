from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Component(Base):
    __tablename__ = "components"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    manufacturer_part_number = Column(String(100), unique=True, index=True, nullable=True)
    supplier_part_number = Column(String(100), index=True, nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    subcategory = Column(String(100), nullable=True)
    quantity = Column(Integer, default=0)
    min_quantity = Column(Integer, default=0)
    location = Column(String(255), nullable=True)
    datasheet_url = Column(String(500), nullable=True)
    unit_price = Column(Float, nullable=True)
    supplier = Column(String(255), nullable=True)
    package_type = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    # Part-DB style fields
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    footprint_id = Column(Integer, ForeignKey("footprints.id"), nullable=True)
    tags = Column(String(500), nullable=True)
    manufacturer = Column(String(255), nullable=True)
    mpn = Column(String(100), nullable=True)
    ipn = Column(String(100), nullable=True)
    is_favorite = Column(Boolean, default=False)
    status = Column(String(50), default="active")
    min_order_quantity = Column(Integer, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    stock_transactions = relationship("StockTransaction", back_populates="component", cascade="all, delete-orphan")
    bom_items = relationship("BOMItem", back_populates="component")
    invoice_items = relationship("InvoiceItem", back_populates="component")
    supplier_parts = relationship("SupplierPart", back_populates="component", cascade="all, delete-orphan")
    manufacturer_parts = relationship("ManufacturerPart", back_populates="component", cascade="all, delete-orphan")
    parameters = relationship("PartParameter", back_populates="component", cascade="all, delete-orphan")
    part_lots = relationship("PartLot", back_populates="component", cascade="all, delete-orphan")
    footprint = relationship("Footprint", back_populates="components")
    category_rel = relationship("Category", back_populates="components")
