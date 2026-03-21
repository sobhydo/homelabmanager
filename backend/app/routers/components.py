import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.component import Component
from app.models.stock_location import StockItem
from app.models.stock_transaction import StockTransaction
from app.models.supplier import Supplier, Manufacturer, SupplierPart, ManufacturerPart
from app.models.part_parameter import PartParameter
from app.models.part_lot import PartLot
from app.schemas.component import (
    ComponentCreate,
    ComponentListResponse,
    ComponentResponse,
    ComponentUpdate,
    StockTransactionResponse,
)
from app.schemas.supplier import (
    ManufacturerPartCreate,
    ManufacturerPartResponse,
    SupplierPartCreate,
    SupplierPartResponse,
)
from app.schemas.part_parameter import (
    PartParameterCreate,
    PartParameterResponse,
    PartParameterUpdate,
)
from app.schemas.part_lot import (
    PartLotCreate,
    PartLotResponse,
    PartLotUpdate,
)

router = APIRouter(prefix="/components", tags=["components"])


@router.get("/low-stock", response_model=list[ComponentResponse])
def get_low_stock_components(db: Session = Depends(get_db)):
    """Return components where quantity < min_quantity."""
    components = (
        db.query(Component)
        .filter(Component.quantity < Component.min_quantity)
        .all()
    )
    return [_enrich_component(c) for c in components]


@router.get("/search", response_model=list[ComponentResponse])
def search_components(
    q: str = Query(..., description="Search query"),
    db: Session = Depends(get_db),
):
    """Search components by name, part numbers, or description."""
    search = f"%{q}%"
    components = (
        db.query(Component)
        .filter(
            or_(
                Component.name.ilike(search),
                Component.manufacturer_part_number.ilike(search),
                Component.supplier_part_number.ilike(search),
                Component.description.ilike(search),
            )
        )
        .all()
    )
    return [_enrich_component(c) for c in components]


@router.get("", response_model=ComponentListResponse)
def list_components(
    search: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: Optional[str] = Query(None, description="Sort field"),
    sort_order: str = Query("asc", description="Sort order (asc or desc)"),
    db: Session = Depends(get_db),
):
    """List components with optional search, category filter, and pagination."""
    query = db.query(Component)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Component.name.ilike(search_term),
                Component.manufacturer_part_number.ilike(search_term),
                Component.supplier_part_number.ilike(search_term),
                Component.description.ilike(search_term),
            )
        )

    if category:
        query = query.filter(Component.category == category)

    if sort_by and hasattr(Component, sort_by):
        col = getattr(Component, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())

    total = query.count()
    offset = (page - 1) * page_size
    components = query.offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if page_size else 0

    return ComponentListResponse(
        items=[_enrich_component(c) for c in components],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def _enrich_component(component: Component) -> dict:
    """Add computed fields to a component for the response."""
    data = {c.key: getattr(component, c.key) for c in component.__table__.columns}
    data["category_name"] = component.category_rel.name if component.category_rel else None
    data["footprint_name"] = component.footprint.name if component.footprint else None
    return data


@router.post("", response_model=ComponentResponse, status_code=201)
def create_component(data: ComponentCreate, db: Session = Depends(get_db)):
    """Create a new component."""
    component = Component(**data.model_dump())
    db.add(component)
    db.commit()
    db.refresh(component)
    return _enrich_component(component)


@router.get("/{component_id}", response_model=ComponentResponse)
def get_component(component_id: int, db: Session = Depends(get_db)):
    """Get a component by ID."""
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    return _enrich_component(component)


@router.put("/{component_id}", response_model=ComponentResponse)
def update_component(
    component_id: int, data: ComponentUpdate, db: Session = Depends(get_db)
):
    """Update a component."""
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(component, field, value)

    db.commit()
    db.refresh(component)
    return _enrich_component(component)


@router.delete("/{component_id}", status_code=204)
def delete_component(component_id: int, db: Session = Depends(get_db)):
    """Delete a component. Fails if stock items or build allocations reference it."""
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")

    stock_item_count = db.query(StockItem).filter(StockItem.component_id == component_id).count()
    if stock_item_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete component with stock items. Delete stock items first.",
        )

    from app.models.build_order import BuildAllocation
    allocation_count = db.query(BuildAllocation).filter(BuildAllocation.component_id == component_id).count()
    if allocation_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete component with build allocations. Delete allocations first.",
        )

    # Nullify BOM item references (nullable FK)
    from app.models.bom import BOMItem
    db.query(BOMItem).filter(BOMItem.component_id == component_id).update(
        {"component_id": None, "matched": 0}
    )

    # Nullify invoice item references (nullable FK)
    from app.models.invoice import InvoiceItem
    db.query(InvoiceItem).filter(InvoiceItem.component_id == component_id).update(
        {"component_id": None, "matched": 0}
    )

    db.delete(component)
    db.commit()


@router.get(
    "/{component_id}/transactions",
    response_model=list[StockTransactionResponse],
)
def get_component_transactions(
    component_id: int, db: Session = Depends(get_db)
):
    """Get stock transactions for a component."""
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    transactions = (
        db.query(StockTransaction)
        .filter(StockTransaction.component_id == component_id)
        .order_by(StockTransaction.created_at.desc())
        .all()
    )
    return transactions


def _supplier_part_to_response(sp: SupplierPart) -> dict:
    """Convert a SupplierPart ORM object to a response dict with names."""
    return {
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


def _manufacturer_part_to_response(mp: ManufacturerPart) -> dict:
    """Convert a ManufacturerPart ORM object to a response dict with names."""
    return {
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


@router.get(
    "/{component_id}/supplier-parts",
    response_model=list[SupplierPartResponse],
)
def get_component_supplier_parts(
    component_id: int, db: Session = Depends(get_db)
):
    """Get supplier parts for a component."""
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    parts = (
        db.query(SupplierPart)
        .filter(SupplierPart.component_id == component_id)
        .all()
    )
    return [_supplier_part_to_response(p) for p in parts]


@router.post(
    "/{component_id}/supplier-parts",
    response_model=SupplierPartResponse,
    status_code=201,
)
def create_component_supplier_part(
    component_id: int,
    data: SupplierPartCreate,
    db: Session = Depends(get_db),
):
    """Add a supplier part to a component."""
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")

    part_data = data.model_dump()
    part_data["component_id"] = component_id

    if not part_data.get("supplier_id"):
        raise HTTPException(status_code=400, detail="supplier_id is required")

    supplier = db.query(Supplier).filter(Supplier.id == part_data["supplier_id"]).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    sp = SupplierPart(**part_data)
    db.add(sp)
    db.commit()
    db.refresh(sp)
    return _supplier_part_to_response(sp)


@router.get(
    "/{component_id}/manufacturer-parts",
    response_model=list[ManufacturerPartResponse],
)
def get_component_manufacturer_parts(
    component_id: int, db: Session = Depends(get_db)
):
    """Get manufacturer parts for a component."""
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    parts = (
        db.query(ManufacturerPart)
        .filter(ManufacturerPart.component_id == component_id)
        .all()
    )
    return [_manufacturer_part_to_response(p) for p in parts]


@router.post(
    "/{component_id}/manufacturer-parts",
    response_model=ManufacturerPartResponse,
    status_code=201,
)
def create_component_manufacturer_part(
    component_id: int,
    data: ManufacturerPartCreate,
    db: Session = Depends(get_db),
):
    """Add a manufacturer part to a component."""
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")

    part_data = data.model_dump()
    part_data["component_id"] = component_id

    if not part_data.get("manufacturer_id"):
        raise HTTPException(status_code=400, detail="manufacturer_id is required")

    manufacturer = db.query(Manufacturer).filter(Manufacturer.id == part_data["manufacturer_id"]).first()
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")

    mp = ManufacturerPart(**part_data)
    db.add(mp)
    db.commit()
    db.refresh(mp)
    return _manufacturer_part_to_response(mp)


# ── Part Parameters ──────────────────────────────────────────────────────────


@router.get(
    "/{component_id}/parameters",
    response_model=list[PartParameterResponse],
)
def get_component_parameters(
    component_id: int, db: Session = Depends(get_db)
):
    """Get parameters for a component."""
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    params = (
        db.query(PartParameter)
        .filter(PartParameter.component_id == component_id)
        .order_by(PartParameter.sort_order, PartParameter.name)
        .all()
    )
    return params


@router.post(
    "/{component_id}/parameters",
    response_model=PartParameterResponse,
    status_code=201,
)
def create_component_parameter(
    component_id: int,
    data: PartParameterCreate,
    db: Session = Depends(get_db),
):
    """Add a parameter to a component."""
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")

    param = PartParameter(component_id=component_id, **data.model_dump())
    db.add(param)
    db.commit()
    db.refresh(param)
    return param


@router.put(
    "/{component_id}/parameters/{param_id}",
    response_model=PartParameterResponse,
)
def update_component_parameter(
    component_id: int,
    param_id: int,
    data: PartParameterUpdate,
    db: Session = Depends(get_db),
):
    """Update a parameter of a component."""
    param = (
        db.query(PartParameter)
        .filter(
            PartParameter.id == param_id,
            PartParameter.component_id == component_id,
        )
        .first()
    )
    if not param:
        raise HTTPException(status_code=404, detail="Parameter not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(param, field, value)

    db.commit()
    db.refresh(param)
    return param


@router.delete("/{component_id}/parameters/{param_id}", status_code=204)
def delete_component_parameter(
    component_id: int,
    param_id: int,
    db: Session = Depends(get_db),
):
    """Delete a parameter from a component."""
    param = (
        db.query(PartParameter)
        .filter(
            PartParameter.id == param_id,
            PartParameter.component_id == component_id,
        )
        .first()
    )
    if not param:
        raise HTTPException(status_code=404, detail="Parameter not found")
    db.delete(param)
    db.commit()


# ── Part Lots ────────────────────────────────────────────────────────────────


def _lot_to_response(lot: PartLot) -> dict:
    """Convert a PartLot ORM object to a response dict with location name."""
    return {
        "id": lot.id,
        "component_id": lot.component_id,
        "location_id": lot.location_id,
        "quantity": lot.quantity,
        "description": lot.description,
        "expiry_date": lot.expiry_date,
        "needs_refill": lot.needs_refill,
        "created_at": lot.created_at,
        "updated_at": lot.updated_at,
        "location_name": lot.location.name if lot.location else None,
    }


@router.get(
    "/{component_id}/lots",
    response_model=list[PartLotResponse],
)
def get_component_lots(
    component_id: int, db: Session = Depends(get_db)
):
    """Get part lots for a component."""
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    lots = (
        db.query(PartLot)
        .filter(PartLot.component_id == component_id)
        .order_by(PartLot.created_at.desc())
        .all()
    )
    return [_lot_to_response(lot) for lot in lots]


@router.post(
    "/{component_id}/lots",
    response_model=PartLotResponse,
    status_code=201,
)
def create_component_lot(
    component_id: int,
    data: PartLotCreate,
    db: Session = Depends(get_db),
):
    """Add a part lot to a component."""
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")

    lot = PartLot(component_id=component_id, **data.model_dump())
    db.add(lot)
    db.commit()
    db.refresh(lot)
    return _lot_to_response(lot)


@router.put(
    "/{component_id}/lots/{lot_id}",
    response_model=PartLotResponse,
)
def update_component_lot(
    component_id: int,
    lot_id: int,
    data: PartLotUpdate,
    db: Session = Depends(get_db),
):
    """Update a part lot."""
    lot = (
        db.query(PartLot)
        .filter(
            PartLot.id == lot_id,
            PartLot.component_id == component_id,
        )
        .first()
    )
    if not lot:
        raise HTTPException(status_code=404, detail="Part lot not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lot, field, value)

    db.commit()
    db.refresh(lot)
    return _lot_to_response(lot)


@router.delete("/{component_id}/lots/{lot_id}", status_code=204)
def delete_component_lot(
    component_id: int,
    lot_id: int,
    db: Session = Depends(get_db),
):
    """Delete a part lot from a component."""
    lot = (
        db.query(PartLot)
        .filter(
            PartLot.id == lot_id,
            PartLot.component_id == component_id,
        )
        .first()
    )
    if not lot:
        raise HTTPException(status_code=404, detail="Part lot not found")
    db.delete(lot)
    db.commit()
