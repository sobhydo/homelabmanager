import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.build_order import BuildAllocation
from app.models.component import Component
from app.models.stock_location import StockItem, StockLocation
from app.schemas.stock_location import (
    StockItemAdjustRequest,
    StockItemListResponse,
    StockItemMoveRequest,
    StockItemResponse,
    StockItemUpdate,
)

router = APIRouter(prefix="/stock", tags=["stock"])


def _item_to_response(item: StockItem) -> StockItemResponse:
    return StockItemResponse(
        id=item.id,
        component_id=item.component_id,
        location_id=item.location_id,
        quantity=item.quantity,
        serial_number=item.serial_number,
        batch=item.batch,
        notes=item.notes,
        status=item.status,
        expiry_date=item.expiry_date,
        component_name=item.component.name if item.component else None,
        location_name=item.location.name if item.location else None,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=StockItemListResponse)
def list_stock_items(
    search: Optional[str] = Query(None),
    component_id: Optional[int] = Query(None),
    location_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List all stock items with search, pagination, and filters."""
    query = db.query(StockItem)

    if component_id is not None:
        query = query.filter(StockItem.component_id == component_id)

    if location_id is not None:
        query = query.filter(StockItem.location_id == location_id)

    if status is not None:
        query = query.filter(StockItem.status == status)

    if search:
        search_term = f"%{search}%"
        query = query.join(Component, StockItem.component_id == Component.id).filter(
            or_(
                Component.name.ilike(search_term),
                StockItem.serial_number.ilike(search_term),
                StockItem.batch.ilike(search_term),
                StockItem.notes.ilike(search_term),
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if page_size else 0

    return StockItemListResponse(
        items=[_item_to_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{item_id}", response_model=StockItemResponse)
def get_stock_item(item_id: int, db: Session = Depends(get_db)):
    """Get a stock item by ID."""
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")
    return _item_to_response(item)


@router.put("/{item_id}", response_model=StockItemResponse)
def update_stock_item(
    item_id: int,
    data: StockItemUpdate,
    db: Session = Depends(get_db),
):
    """Update a stock item."""
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")

    update_data = data.model_dump(exclude_unset=True)

    if "location_id" in update_data and update_data["location_id"] is not None:
        loc = db.query(StockLocation).filter(StockLocation.id == update_data["location_id"]).first()
        if not loc:
            raise HTTPException(status_code=404, detail="Location not found")

    if "component_id" in update_data and update_data["component_id"] is not None:
        comp = db.query(Component).filter(Component.id == update_data["component_id"]).first()
        if not comp:
            raise HTTPException(status_code=404, detail="Component not found")

    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return _item_to_response(item)


@router.delete("/{item_id}", status_code=204)
def delete_stock_item(item_id: int, db: Session = Depends(get_db)):
    """Delete a stock item. Fails if build allocations reference it."""
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")

    allocation_count = db.query(BuildAllocation).filter(BuildAllocation.stock_item_id == item_id).count()
    if allocation_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete stock item with build allocations. Remove allocations first.",
        )

    db.delete(item)
    db.commit()


@router.post("/{item_id}/move", response_model=StockItemResponse)
def move_stock_item(
    item_id: int,
    data: StockItemMoveRequest,
    db: Session = Depends(get_db),
):
    """Move a stock item to a different location."""
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")

    location = db.query(StockLocation).filter(StockLocation.id == data.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Target location not found")

    item.location_id = data.location_id
    db.commit()
    db.refresh(item)
    return _item_to_response(item)


@router.post("/{item_id}/adjust", response_model=StockItemResponse)
def adjust_stock_item(
    item_id: int,
    data: StockItemAdjustRequest,
    db: Session = Depends(get_db),
):
    """Adjust the quantity of a stock item with a reason."""
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")

    new_quantity = item.quantity + data.quantity
    if new_quantity < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Adjustment would result in negative quantity ({new_quantity})",
        )

    item.quantity = new_quantity
    if data.reason:
        existing_notes = item.notes or ""
        adjustment_note = f"[Adjusted by {data.quantity}: {data.reason}]"
        item.notes = f"{existing_notes}\n{adjustment_note}".strip() if existing_notes else adjustment_note

    db.commit()
    db.refresh(item)
    return _item_to_response(item)
