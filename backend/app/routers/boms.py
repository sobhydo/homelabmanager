import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_settings
from app.models.bom import BOM, BOMItem, Build
from app.models.build_order import BuildOrder
from app.models.component import Component
from app.schemas.bom import (
    BOMAvailability,
    BOMItemAvailability,
    BOMListResponse,
    BOMResponse,
    BOMUploadResponse,
    BuildResponse,
)
from app.services.bom_parser import parse_bom_file
from app.utils.file_handling import save_upload_file

router = APIRouter(prefix="/boms", tags=["boms"])


@router.get("", response_model=BOMListResponse)
def list_boms(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("asc"),
    db: Session = Depends(get_db),
):
    """List all BOMs with pagination."""
    query = db.query(BOM)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                BOM.name.ilike(search_term),
                BOM.description.ilike(search_term),
            )
        )

    if sort_by and hasattr(BOM, sort_by):
        col = getattr(BOM, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())

    total = query.count()
    offset = (page - 1) * page_size
    boms = query.offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if page_size else 0

    return BOMListResponse(
        items=boms,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/upload", response_model=BOMUploadResponse)
async def upload_bom(
    file: UploadFile = File(...),
    name: str = Form(""),
    description: str = Form(""),
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
):
    """Upload and parse a BOM file (CSV or Excel).

    Frontend sends multipart form data with 'file', 'name', and optional 'description'.
    """
    file_path = await save_upload_file(file, settings.UPLOAD_DIR, subdir="boms")

    bom_name = name or file.filename or "Unnamed BOM"
    bom = BOM(
        name=bom_name,
        description=description or None,
        source_file=file_path,
        status="imported",
    )
    db.add(bom)
    db.commit()
    db.refresh(bom)

    parsed_items = parse_bom_file(file_path)
    matched = 0
    for item_data in parsed_items:
        mpn = item_data.get("manufacturer_part_number")
        component = None
        is_matched = 0
        if mpn:
            component = (
                db.query(Component)
                .filter(Component.manufacturer_part_number == mpn)
                .first()
            )
            if component:
                is_matched = 1
                matched += 1

        bom_item = BOMItem(
            bom_id=bom.id,
            component_id=component.id if component else None,
            reference_designator=item_data.get("reference_designator"),
            quantity=item_data.get("quantity", 1),
            manufacturer_part_number=mpn,
            supplier_part_number=item_data.get("supplier_part_number"),
            description=item_data.get("description"),
            value=item_data.get("value"),
            package=item_data.get("package"),
            matched=is_matched,
        )
        db.add(bom_item)

    db.commit()
    total_items = len(parsed_items)
    return BOMUploadResponse(
        bom_id=bom.id,
        name=bom_name,
        total_items=total_items,
        matched_items=matched,
        unmatched_items=total_items - matched,
    )


@router.get("/{bom_id}", response_model=BOMResponse)
def get_bom(bom_id: int, db: Session = Depends(get_db)):
    """Get a BOM by ID including its items."""
    bom = db.query(BOM).filter(BOM.id == bom_id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")
    return bom


@router.delete("/{bom_id}", status_code=204)
def delete_bom(bom_id: int, db: Session = Depends(get_db)):
    """Delete a BOM and its items. Fails if build orders reference it."""
    bom = db.query(BOM).filter(BOM.id == bom_id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")

    build_order_count = db.query(BuildOrder).filter(BuildOrder.bom_id == bom_id).count()
    if build_order_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete BOM with associated build orders. Delete build orders first.",
        )

    db.delete(bom)
    db.commit()


@router.get("/{bom_id}/availability", response_model=BOMAvailability)
def check_bom_availability(bom_id: int, db: Session = Depends(get_db)):
    """Check component availability for a BOM."""
    bom = db.query(BOM).filter(BOM.id == bom_id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")

    availability_items: list[BOMItemAvailability] = []
    all_available = True

    for item in bom.items:
        available = 0
        if item.component_id:
            component = db.query(Component).filter(Component.id == item.component_id).first()
            if component:
                available = component.quantity

        sufficient = available >= item.quantity
        if not sufficient:
            all_available = False

        availability_items.append(
            BOMItemAvailability(
                bom_item_id=item.id,
                component_id=item.component_id,
                manufacturer_part_number=item.manufacturer_part_number,
                required=item.quantity,
                available=available,
                sufficient=sufficient,
            )
        )

    return BOMAvailability(
        bom_id=bom.id,
        bom_name=bom.name,
        total_items=len(bom.items),
        items=availability_items,
        all_available=all_available,
    )


@router.post("/{bom_id}/build", response_model=BuildResponse)
def create_build(bom_id: int, db: Session = Depends(get_db)):
    """Create a build from a BOM, deducting stock.

    Frontend sends POST with no body, defaults to quantity=1.
    """
    bom = db.query(BOM).filter(BOM.id == bom_id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")

    quantity = 1

    # Deduct stock for each matched item
    for item in bom.items:
        if item.component_id:
            component = db.query(Component).filter(Component.id == item.component_id).first()
            if component:
                needed = item.quantity * quantity
                if component.quantity < needed:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient stock for {component.name}: need {needed}, have {component.quantity}",
                    )
                component.quantity -= needed

    build = Build(
        bom_id=bom.id,
        quantity=quantity,
        status="completed",
        built_at=datetime.utcnow(),
    )
    db.add(build)
    db.commit()
    db.refresh(build)
    return build
