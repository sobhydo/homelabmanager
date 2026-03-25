from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Feeder(Base):
    __tablename__ = "feeders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    slot_number = Column(Integer, nullable=False)
    component_value = Column(String(255), nullable=True)
    component_package = Column(String(100), nullable=True)
    part_number = Column(String(100), nullable=True)
    nozzle = Column(Integer, default=1)
    pick_height = Column(Float, default=0.0)
    place_height = Column(Float, default=0.0)
    mount_speed = Column(Integer, default=100)
    head = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    machine = relationship("Machine", backref="feeders")
