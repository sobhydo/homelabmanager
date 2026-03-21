from sqlalchemy import (
    Boolean,
    Column,
    Float,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    website = Column(String(500), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    supplier_parts = relationship(
        "SupplierPart", back_populates="supplier", cascade="all, delete-orphan"
    )


class Manufacturer(Base):
    __tablename__ = "manufacturers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    website = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    manufacturer_parts = relationship(
        "ManufacturerPart", back_populates="manufacturer", cascade="all, delete-orphan"
    )


class SupplierPart(Base):
    __tablename__ = "supplier_parts"
    __table_args__ = (
        UniqueConstraint(
            "component_id",
            "supplier_id",
            "supplier_part_number",
            name="uq_supplier_part",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    component_id = Column(Integer, ForeignKey("components.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    supplier_part_number = Column(String(100), nullable=True)
    unit_price = Column(Float, nullable=True)
    currency = Column(String(10), default="USD")
    pack_quantity = Column(Integer, default=1)
    lead_time_days = Column(Integer, nullable=True)
    url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    component = relationship("Component", back_populates="supplier_parts")
    supplier = relationship("Supplier", back_populates="supplier_parts")


class ManufacturerPart(Base):
    __tablename__ = "manufacturer_parts"
    __table_args__ = (
        UniqueConstraint(
            "component_id",
            "manufacturer_id",
            "manufacturer_part_number",
            name="uq_manufacturer_part",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    component_id = Column(Integer, ForeignKey("components.id"), nullable=False)
    manufacturer_id = Column(Integer, ForeignKey("manufacturers.id"), nullable=False)
    manufacturer_part_number = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    url = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    component = relationship("Component", back_populates="manufacturer_parts")
    manufacturer = relationship("Manufacturer", back_populates="manufacturer_parts")
