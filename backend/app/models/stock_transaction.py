from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    component_id = Column(Integer, ForeignKey("components.id"), nullable=False)
    quantity_change = Column(Integer, nullable=False)
    reason = Column(String(50), nullable=False)
    reference_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    component = relationship("Component", back_populates="stock_transactions")
