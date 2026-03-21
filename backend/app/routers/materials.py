import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.material import Material
from app.schemas.material import (
    MaterialCreate,
    MaterialListResponse,
    MaterialResponse,
    MaterialUpdate,
)

router = APIRouter(prefix="/materials", tags=["materials"])


@router.get("/low-stock", response_model=list[MaterialResponse])
def get_low_stock_materials(db: Session = Depends(get_db)):
    """Return materials where quantity < min_quantity."""
    return (
        db.query(Material)
        .filter(Material.quantity < Material.min_quantity)
        .all()
    )


@router.get("", response_model=MaterialListResponse)
def list_materials(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("asc"),
    db: Session = Depends(get_db),
):
    """List all materials with optional filters and pagination."""
    query = db.query(Material)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Material.name.ilike(search_term),
                Material.description.ilike(search_term),
            )
        )

    if category:
        query = query.filter(Material.category == category)

    if sort_by and hasattr(Material, sort_by):
        col = getattr(Material, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())

    total = query.count()
    offset = (page - 1) * page_size
    materials = query.offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if page_size else 0

    return MaterialListResponse(
        items=materials,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=MaterialResponse, status_code=201)
def create_material(data: MaterialCreate, db: Session = Depends(get_db)):
    """Create a new material."""
    material = Material(**data.model_dump())
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.get("/{material_id}", response_model=MaterialResponse)
def get_material(material_id: int, db: Session = Depends(get_db)):
    """Get a material by ID."""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material


@router.put("/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: int, data: MaterialUpdate, db: Session = Depends(get_db)
):
    """Update a material."""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(material, field, value)
    db.commit()
    db.refresh(material)
    return material


@router.delete("/{material_id}", status_code=204)
def delete_material(material_id: int, db: Session = Depends(get_db)):
    """Delete a material."""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    db.delete(material)
    db.commit()
