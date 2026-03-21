from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Tool(Base):
    __tablename__ = "tools"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    brand = Column(String(100), nullable=True)
    model_number = Column(String(100), nullable=True)
    serial_number = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    condition = Column(String(50), default="good")
    purchase_date = Column(DateTime, nullable=True)
    purchase_price = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="available")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    checkouts = relationship("ToolCheckout", back_populates="tool", cascade="all, delete-orphan")


class ToolCheckout(Base):
    __tablename__ = "tool_checkouts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tool_id = Column(Integer, ForeignKey("tools.id"), nullable=False)
    checked_out_by = Column(String(255), nullable=False)
    checked_out_at = Column(DateTime, server_default=func.now())
    expected_return = Column(DateTime, nullable=True)
    returned_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    tool = relationship("Tool", back_populates="checkouts")
