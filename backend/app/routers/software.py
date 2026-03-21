import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.software import Software
from app.schemas.software import (
    SoftwareCreate,
    SoftwareListResponse,
    SoftwareResponse,
    SoftwareUpdate,
)

router = APIRouter(prefix="/software", tags=["software"])


@router.get("", response_model=SoftwareListResponse)
def list_software(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("asc"),
    db: Session = Depends(get_db),
):
    """List all software with optional filters and pagination."""
    query = db.query(Software)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Software.name.ilike(search_term),
                Software.description.ilike(search_term),
            )
        )

    if category:
        query = query.filter(Software.category == category)
    if status:
        query = query.filter(Software.status == status)

    if sort_by and hasattr(Software, sort_by):
        col = getattr(Software, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())

    total = query.count()
    offset = (page - 1) * page_size
    sw_list = query.offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if page_size else 0

    return SoftwareListResponse(
        items=sw_list,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=SoftwareResponse, status_code=201)
def create_software(data: SoftwareCreate, db: Session = Depends(get_db)):
    """Create a new software entry."""
    sw = Software(**data.model_dump())
    db.add(sw)
    db.commit()
    db.refresh(sw)
    return sw


@router.get("/{software_id}", response_model=SoftwareResponse)
def get_software(software_id: int, db: Session = Depends(get_db)):
    """Get software by ID."""
    sw = db.query(Software).filter(Software.id == software_id).first()
    if not sw:
        raise HTTPException(status_code=404, detail="Software not found")
    return sw


@router.put("/{software_id}", response_model=SoftwareResponse)
def update_software(
    software_id: int, data: SoftwareUpdate, db: Session = Depends(get_db)
):
    """Update software."""
    sw = db.query(Software).filter(Software.id == software_id).first()
    if not sw:
        raise HTTPException(status_code=404, detail="Software not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(sw, field, value)
    db.commit()
    db.refresh(sw)
    return sw


@router.delete("/{software_id}", status_code=204)
def delete_software(software_id: int, db: Session = Depends(get_db)):
    """Delete software."""
    sw = db.query(Software).filter(Software.id == software_id).first()
    if not sw:
        raise HTTPException(status_code=404, detail="Software not found")
    db.delete(sw)
    db.commit()
