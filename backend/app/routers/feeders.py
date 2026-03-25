from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.feeder import Feeder
from app.models.machine import Machine
from app.schemas.feeder import (
    FeederCreate,
    FeederListResponse,
    FeederResponse,
    FeederUpdate,
)

router = APIRouter(prefix="/feeders", tags=["feeders"])


@router.get("", response_model=FeederListResponse)
def list_feeders(
    machine_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """List feeders, optionally filtered by machine."""
    query = db.query(Feeder)
    if machine_id is not None:
        query = query.filter(Feeder.machine_id == machine_id)
    query = query.order_by(Feeder.slot_number)
    items = query.all()
    return FeederListResponse(items=items, total=len(items))


@router.post("", response_model=FeederResponse)
def create_feeder(payload: FeederCreate, db: Session = Depends(get_db)):
    """Create a new feeder slot configuration."""
    machine = db.query(Machine).filter(Machine.id == payload.machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    feeder = Feeder(**payload.model_dump())
    db.add(feeder)
    db.commit()
    db.refresh(feeder)
    return feeder


@router.get("/{feeder_id}", response_model=FeederResponse)
def get_feeder(feeder_id: int, db: Session = Depends(get_db)):
    """Get a feeder by ID."""
    feeder = db.query(Feeder).filter(Feeder.id == feeder_id).first()
    if not feeder:
        raise HTTPException(status_code=404, detail="Feeder not found")
    return feeder


@router.put("/{feeder_id}", response_model=FeederResponse)
def update_feeder(feeder_id: int, payload: FeederUpdate, db: Session = Depends(get_db)):
    """Update a feeder configuration."""
    feeder = db.query(Feeder).filter(Feeder.id == feeder_id).first()
    if not feeder:
        raise HTTPException(status_code=404, detail="Feeder not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(feeder, key, value)
    db.commit()
    db.refresh(feeder)
    return feeder


@router.delete("/{feeder_id}", status_code=204)
def delete_feeder(feeder_id: int, db: Session = Depends(get_db)):
    """Delete a feeder."""
    feeder = db.query(Feeder).filter(Feeder.id == feeder_id).first()
    if not feeder:
        raise HTTPException(status_code=404, detail="Feeder not found")
    db.delete(feeder)
    db.commit()
