from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func

from app.database import Base


class SavedLabel(Base):
    __tablename__ = "saved_labels"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    paper_size = Column(String(20), nullable=False, default="a4")
    template_index = Column(Integer, nullable=False, default=0)
    font_size = Column(Integer, nullable=False, default=10)
    font_weight = Column(String(10), nullable=False, default="normal")
    show_border = Column(Boolean, nullable=False, default=True)
    labels_json = Column(Text, nullable=False)  # JSON array of label data
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
