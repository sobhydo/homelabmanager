from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_number = Column(String(100), nullable=True)
    supplier = Column(String(255), nullable=True)
    file_path = Column(String(500), nullable=True)
    total_amount = Column(Float, nullable=True)
    currency = Column(String(10), default="USD")
    invoice_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="uploaded")
    raw_text = Column(Text, nullable=True)
    parsed_data = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    component_id = Column(Integer, ForeignKey("components.id"), nullable=True)
    description = Column(Text, nullable=True)
    part_number = Column(String(100), nullable=True)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=True)
    total_price = Column(Float, nullable=True)
    matched = Column(Integer, default=0, server_default="0")
    added_to_stock = Column(Integer, default=0, server_default="0")
    suggested_category = Column(String(100), nullable=True)
    suggested_package = Column(String(50), nullable=True)
    supplier_part_number = Column(String(100), nullable=True)
    manufacturer = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    supplier_url = Column(String(500), nullable=True)
    footprint = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    invoice = relationship("Invoice", back_populates="items")
    component = relationship("Component", back_populates="invoice_items")
