import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.component import Component
from app.models.footprint import Footprint
from app.schemas.footprint import (
    FootprintCreate,
    FootprintListResponse,
    FootprintResponse,
    FootprintUpdate,
)

router = APIRouter(prefix="/footprints", tags=["footprints"])


@router.get("", response_model=FootprintListResponse)
def list_footprints(
    search: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List footprints with optional search and pagination."""
    query = db.query(Footprint)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Footprint.name.ilike(term),
                Footprint.description.ilike(term),
            )
        )

    if category:
        query = query.filter(Footprint.category == category)

    total = query.count()
    offset = (page - 1) * page_size
    footprints = query.order_by(Footprint.name).offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if page_size else 0

    return FootprintListResponse(
        items=footprints,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=FootprintResponse, status_code=201)
def create_footprint(data: FootprintCreate, db: Session = Depends(get_db)):
    """Create a new footprint."""
    existing = db.query(Footprint).filter(Footprint.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Footprint with this name already exists")

    footprint = Footprint(**data.model_dump())
    db.add(footprint)
    db.commit()
    db.refresh(footprint)
    return footprint


@router.get("/{footprint_id}", response_model=FootprintResponse)
def get_footprint(footprint_id: int, db: Session = Depends(get_db)):
    """Get a footprint by ID."""
    footprint = db.query(Footprint).filter(Footprint.id == footprint_id).first()
    if not footprint:
        raise HTTPException(status_code=404, detail="Footprint not found")
    return footprint


@router.put("/{footprint_id}", response_model=FootprintResponse)
def update_footprint(
    footprint_id: int, data: FootprintUpdate, db: Session = Depends(get_db)
):
    """Update a footprint."""
    footprint = db.query(Footprint).filter(Footprint.id == footprint_id).first()
    if not footprint:
        raise HTTPException(status_code=404, detail="Footprint not found")

    update_data = data.model_dump(exclude_unset=True)
    if "name" in update_data:
        existing = (
            db.query(Footprint)
            .filter(Footprint.name == update_data["name"], Footprint.id != footprint_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Footprint with this name already exists")

    for field, value in update_data.items():
        setattr(footprint, field, value)

    db.commit()
    db.refresh(footprint)
    return footprint


@router.delete("/{footprint_id}", status_code=204)
def delete_footprint(footprint_id: int, db: Session = Depends(get_db)):
    """Delete a footprint. Fails if components reference it."""
    footprint = db.query(Footprint).filter(Footprint.id == footprint_id).first()
    if not footprint:
        raise HTTPException(status_code=404, detail="Footprint not found")

    parts_count = db.query(Component).filter(Component.footprint_id == footprint_id).count()
    if parts_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete footprint with associated components",
        )

    db.delete(footprint)
    db.commit()
