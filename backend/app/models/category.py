from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    pathstring = Column(String(500), nullable=True)
    default_footprint_id = Column(
        Integer, ForeignKey("footprints.id"), nullable=True
    )
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    parent = relationship(
        "Category", remote_side=[id], back_populates="children"
    )
    children = relationship(
        "Category", back_populates="parent", cascade="all, delete-orphan"
    )
    components = relationship("Component", back_populates="category_rel")
    default_footprint = relationship("Footprint", foreign_keys=[default_footprint_id])
