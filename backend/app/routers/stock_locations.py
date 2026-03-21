import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.part_lot import PartLot
from app.models.stock_location import StockItem, StockLocation
from app.schemas.stock_location import (
    StockItemCreate,
    StockItemResponse,
    StockLocationCreate,
    StockLocationResponse,
    StockLocationTreeResponse,
    StockLocationUpdate,
)

router = APIRouter(prefix="/stock-locations", tags=["stock-locations"])


def _build_pathstring(db: Session, location: StockLocation) -> str:
    """Build the full path string for a location by walking up the tree."""
    parts: list[str] = [location.name]
    current = location
    while current.parent_id is not None:
        current = db.query(StockLocation).filter(StockLocation.id == current.parent_id).first()
        if current is None:
            break
        parts.append(current.name)
    parts.reverse()
    return "/".join(parts)


def _build_tree(location: StockLocation) -> StockLocationTreeResponse:
    """Recursively build a tree response from a location."""
    return StockLocationTreeResponse(
        id=location.id,
        name=location.name,
        description=location.description,
        pathstring=location.pathstring,
        children=[_build_tree(child) for child in location.children],
    )


@router.get("", response_model=list[StockLocationResponse])
def list_stock_locations(
    parent_id: Optional[int] = Query(None, description="Filter by parent location ID. Use 0 for root locations."),
    db: Session = Depends(get_db),
):
    """List stock locations, optionally filtered by parent_id. Use parent_id=0 for root locations."""
    query = db.query(StockLocation)
    if parent_id is not None:
        if parent_id == 0:
            query = query.filter(StockLocation.parent_id.is_(None))
        else:
            query = query.filter(StockLocation.parent_id == parent_id)
    return query.order_by(StockLocation.name).all()


@router.get("/tree", response_model=list[StockLocationTreeResponse])
def get_location_tree(db: Session = Depends(get_db)):
    """Get the full location tree starting from root locations."""
    roots = (
        db.query(StockLocation)
        .filter(StockLocation.parent_id.is_(None))
        .order_by(StockLocation.name)
        .all()
    )
    return [_build_tree(root) for root in roots]


@router.post("", response_model=StockLocationResponse, status_code=201)
def create_stock_location(
    data: StockLocationCreate,
    db: Session = Depends(get_db),
):
    """Create a new stock location."""
    if data.parent_id is not None:
        parent = db.query(StockLocation).filter(StockLocation.id == data.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent location not found")

    location = StockLocation(
        name=data.name,
        description=data.description,
        parent_id=data.parent_id,
    )
    db.add(location)
    db.flush()

    location.pathstring = _build_pathstring(db, location)
    db.commit()
    db.refresh(location)
    return location


@router.get("/{location_id}", response_model=StockLocationResponse)
def get_stock_location(location_id: int, db: Session = Depends(get_db)):
    """Get a stock location by ID."""
    location = db.query(StockLocation).filter(StockLocation.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Stock location not found")
    return location


@router.put("/{location_id}", response_model=StockLocationResponse)
def update_stock_location(
    location_id: int,
    data: StockLocationUpdate,
    db: Session = Depends(get_db),
):
    """Update a stock location."""
    location = db.query(StockLocation).filter(StockLocation.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Stock location not found")

    if data.parent_id is not None:
        if data.parent_id == location_id:
            raise HTTPException(status_code=400, detail="A location cannot be its own parent")
        parent = db.query(StockLocation).filter(StockLocation.id == data.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent location not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(location, key, value)

    location.pathstring = _build_pathstring(db, location)
    db.commit()
    db.refresh(location)
    return location


@router.delete("/{location_id}", status_code=204)
def delete_stock_location(location_id: int, db: Session = Depends(get_db)):
    """Delete a stock location. Fails if it has children or stock items."""
    location = db.query(StockLocation).filter(StockLocation.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Stock location not found")

    if location.children:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete location with child locations. Move or delete children first.",
        )

    stock_count = db.query(StockItem).filter(StockItem.location_id == location_id).count()
    if stock_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete location with stock items. Move or delete stock items first.",
        )

    lot_count = db.query(PartLot).filter(PartLot.location_id == location_id).count()
    if lot_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete location with part lots. Move or delete part lots first.",
        )

    db.delete(location)
    db.commit()


@router.get("/{location_id}/stock", response_model=list[StockItemResponse])
def list_location_stock(location_id: int, db: Session = Depends(get_db)):
    """List all stock items at a specific location."""
    location = db.query(StockLocation).filter(StockLocation.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Stock location not found")

    items = db.query(StockItem).filter(StockItem.location_id == location_id).all()
    return [
        StockItemResponse(
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
        for item in items
    ]


@router.post("/{location_id}/stock", response_model=StockItemResponse, status_code=201)
def add_stock_to_location(
    location_id: int,
    data: StockItemCreate,
    db: Session = Depends(get_db),
):
    """Add a stock item to a specific location."""
    location = db.query(StockLocation).filter(StockLocation.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Stock location not found")

    from app.models.component import Component

    component = db.query(Component).filter(Component.id == data.component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")

    stock_item = StockItem(
        component_id=data.component_id,
        location_id=location_id,
        quantity=data.quantity,
        serial_number=data.serial_number,
        batch=data.batch,
        notes=data.notes,
        status=data.status,
        expiry_date=data.expiry_date,
    )
    db.add(stock_item)
    db.commit()
    db.refresh(stock_item)

    return StockItemResponse(
        id=stock_item.id,
        component_id=stock_item.component_id,
        location_id=stock_item.location_id,
        quantity=stock_item.quantity,
        serial_number=stock_item.serial_number,
        batch=stock_item.batch,
        notes=stock_item.notes,
        status=stock_item.status,
        expiry_date=stock_item.expiry_date,
        component_name=component.name,
        location_name=location.name,
        created_at=stock_item.created_at,
        updated_at=stock_item.updated_at,
    )
