from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class PartParameter(Base):
    __tablename__ = "part_parameters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    component_id = Column(
        Integer, ForeignKey("components.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(100), nullable=False)
    symbol = Column(String(20), nullable=True)
    value_text = Column(String(255), nullable=True)
    value_min = Column(Float, nullable=True)
    value_typical = Column(Float, nullable=True)
    value_max = Column(Float, nullable=True)
    unit = Column(String(50), nullable=True)
    group_name = Column(String(100), nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    component = relationship("Component", back_populates="parameters")
