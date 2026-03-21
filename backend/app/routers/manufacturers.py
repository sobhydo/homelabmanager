import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.component import Component
from app.models.supplier import Manufacturer, ManufacturerPart
from app.schemas.supplier import (
    ManufacturerCreate,
    ManufacturerListResponse,
    ManufacturerPartCreate,
    ManufacturerPartResponse,
    ManufacturerResponse,
    ManufacturerUpdate,
)

router = APIRouter(prefix="/manufacturers", tags=["manufacturers"])


def _manufacturer_part_to_response(mp: ManufacturerPart) -> dict:
    """Convert a ManufacturerPart ORM object to a response dict with names."""
    data = {
        "id": mp.id,
        "component_id": mp.component_id,
        "manufacturer_id": mp.manufacturer_id,
        "manufacturer_part_number": mp.manufacturer_part_number,
        "description": mp.description,
        "url": mp.url,
        "created_at": mp.created_at,
        "updated_at": mp.updated_at,
        "manufacturer_name": mp.manufacturer.name if mp.manufacturer else None,
        "component_name": mp.component.name if mp.component else None,
    }
    return data


@router.get("", response_model=ManufacturerListResponse)
def list_manufacturers(
    search: Optional[str] = Query(None, description="Search query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: Optional[str] = Query(None, description="Sort field"),
    sort_order: str = Query("asc", description="Sort order (asc or desc)"),
    db: Session = Depends(get_db),
):
    """List manufacturers with optional search and pagination."""
    query = db.query(Manufacturer)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Manufacturer.name.ilike(search_term),
                Manufacturer.description.ilike(search_term),
            )
        )

    if sort_by and hasattr(Manufacturer, sort_by):
        col = getattr(Manufacturer, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())

    total = query.count()
    offset = (page - 1) * page_size
    manufacturers = query.offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if page_size else 0

    return ManufacturerListResponse(
        items=manufacturers,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=ManufacturerResponse, status_code=201)
def create_manufacturer(data: ManufacturerCreate, db: Session = Depends(get_db)):
    """Create a new manufacturer."""
    existing = (
        db.query(Manufacturer).filter(Manufacturer.name == data.name).first()
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="Manufacturer with this name already exists"
        )
    manufacturer = Manufacturer(**data.model_dump())
    db.add(manufacturer)
    db.commit()
    db.refresh(manufacturer)
    return manufacturer


@router.get("/{manufacturer_id}", response_model=ManufacturerResponse)
def get_manufacturer(manufacturer_id: int, db: Session = Depends(get_db)):
    """Get a manufacturer by ID."""
    manufacturer = (
        db.query(Manufacturer).filter(Manufacturer.id == manufacturer_id).first()
    )
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    return manufacturer


@router.put("/{manufacturer_id}", response_model=ManufacturerResponse)
def update_manufacturer(
    manufacturer_id: int,
    data: ManufacturerUpdate,
    db: Session = Depends(get_db),
):
    """Update a manufacturer."""
    manufacturer = (
        db.query(Manufacturer).filter(Manufacturer.id == manufacturer_id).first()
    )
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(manufacturer, field, value)

    db.commit()
    db.refresh(manufacturer)
    return manufacturer


@router.delete("/{manufacturer_id}", status_code=204)
def delete_manufacturer(manufacturer_id: int, db: Session = Depends(get_db)):
    """Delete a manufacturer."""
    manufacturer = (
        db.query(Manufacturer).filter(Manufacturer.id == manufacturer_id).first()
    )
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    db.delete(manufacturer)
    db.commit()


@router.get(
    "/{manufacturer_id}/parts",
    response_model=list[ManufacturerPartResponse],
)
def list_manufacturer_parts(
    manufacturer_id: int, db: Session = Depends(get_db)
):
    """List parts for a manufacturer with component details."""
    manufacturer = (
        db.query(Manufacturer).filter(Manufacturer.id == manufacturer_id).first()
    )
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")

    parts = (
        db.query(ManufacturerPart)
        .filter(ManufacturerPart.manufacturer_id == manufacturer_id)
        .all()
    )
    return [_manufacturer_part_to_response(p) for p in parts]


@router.post(
    "/{manufacturer_id}/parts",
    response_model=ManufacturerPartResponse,
    status_code=201,
)
def create_manufacturer_part(
    manufacturer_id: int,
    data: ManufacturerPartCreate,
    db: Session = Depends(get_db),
):
    """Add a manufacturer part linking a component to this manufacturer."""
    manufacturer = (
        db.query(Manufacturer).filter(Manufacturer.id == manufacturer_id).first()
    )
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")

    component = db.query(Component).filter(Component.id == data.component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")

    part_data = data.model_dump()
    part_data["manufacturer_id"] = manufacturer_id  # override with path parameter
    mp = ManufacturerPart(**part_data)
    db.add(mp)
    db.commit()
    db.refresh(mp)
    return _manufacturer_part_to_response(mp)
