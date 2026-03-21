import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.component import Component
from app.models.supplier import Supplier, SupplierPart
from app.schemas.supplier import (
    SupplierCreate,
    SupplierListResponse,
    SupplierPartCreate,
    SupplierPartResponse,
    SupplierResponse,
    SupplierUpdate,
)

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def _supplier_part_to_response(sp: SupplierPart) -> dict:
    """Convert a SupplierPart ORM object to a response dict with names."""
    data = {
        "id": sp.id,
        "component_id": sp.component_id,
        "supplier_id": sp.supplier_id,
        "supplier_part_number": sp.supplier_part_number,
        "unit_price": sp.unit_price,
        "currency": sp.currency,
        "pack_quantity": sp.pack_quantity,
        "lead_time_days": sp.lead_time_days,
        "url": sp.url,
        "notes": sp.notes,
        "is_active": sp.is_active,
        "created_at": sp.created_at,
        "updated_at": sp.updated_at,
        "supplier_name": sp.supplier.name if sp.supplier else None,
        "component_name": sp.component.name if sp.component else None,
    }
    return data


@router.get("", response_model=SupplierListResponse)
def list_suppliers(
    search: Optional[str] = Query(None, description="Search query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: Optional[str] = Query(None, description="Sort field"),
    sort_order: str = Query("asc", description="Sort order (asc or desc)"),
    db: Session = Depends(get_db),
):
    """List suppliers with optional search and pagination."""
    query = db.query(Supplier)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Supplier.name.ilike(search_term),
                Supplier.description.ilike(search_term),
                Supplier.email.ilike(search_term),
            )
        )

    if sort_by and hasattr(Supplier, sort_by):
        col = getattr(Supplier, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())

    total = query.count()
    offset = (page - 1) * page_size
    suppliers = query.offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if page_size else 0

    return SupplierListResponse(
        items=suppliers,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
    """Create a new supplier."""
    existing = db.query(Supplier).filter(Supplier.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Supplier with this name already exists")
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    """Get a supplier by ID, including supplier_parts count."""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int, data: SupplierUpdate, db: Session = Depends(get_db)
):
    """Update a supplier."""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)

    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    """Delete a supplier."""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.delete(supplier)
    db.commit()


@router.get("/{supplier_id}/parts", response_model=list[SupplierPartResponse])
def list_supplier_parts(supplier_id: int, db: Session = Depends(get_db)):
    """List parts for a supplier with component details."""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    parts = (
        db.query(SupplierPart)
        .filter(SupplierPart.supplier_id == supplier_id)
        .all()
    )
    return [_supplier_part_to_response(p) for p in parts]


@router.post(
    "/{supplier_id}/parts",
    response_model=SupplierPartResponse,
    status_code=201,
)
def create_supplier_part(
    supplier_id: int, data: SupplierPartCreate, db: Session = Depends(get_db)
):
    """Add a supplier part linking a component to this supplier."""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    component = db.query(Component).filter(Component.id == data.component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")

    part_data = data.model_dump()
    part_data["supplier_id"] = supplier_id  # override with path parameter
    sp = SupplierPart(**part_data)
    db.add(sp)
    db.commit()
    db.refresh(sp)
    return _supplier_part_to_response(sp)
