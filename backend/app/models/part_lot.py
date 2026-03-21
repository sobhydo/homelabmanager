from sqlalchemy import Column, Integer, Boolean, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class PartLot(Base):
    __tablename__ = "part_lots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    component_id = Column(
        Integer, ForeignKey("components.id", ondelete="CASCADE"), nullable=False
    )
    location_id = Column(
        Integer, ForeignKey("stock_locations.id"), nullable=True
    )
    quantity = Column(Integer, nullable=False, default=0)
    description = Column(Text, nullable=True)
    expiry_date = Column(Date, nullable=True)
    needs_refill = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    component = relationship("Component", back_populates="part_lots")
    location = relationship("StockLocation", back_populates="part_lots")
