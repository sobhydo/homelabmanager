import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.bom import BOM, BOMItem
from app.models.build_order import BuildAllocation, BuildOrder, BuildOutput
from app.models.stock_location import StockItem
from app.schemas.build_order import (
    BuildAllocationCreate,
    BuildAllocationResponse,
    BuildOrderCreate,
    BuildOrderDetailResponse,
    BuildOrderListResponse,
    BuildOrderResponse,
    BuildOrderUpdate,
    BuildOutputCreate,
    BuildOutputResponse,
)

router = APIRouter(prefix="/build-orders", tags=["build-orders"])


def _generate_reference(db: Session) -> str:
    """Generate the next build order reference like BO-0001."""
    last = (
        db.query(BuildOrder)
        .order_by(BuildOrder.id.desc())
        .first()
    )
    if last:
        try:
            num = int(last.reference.split("-")[1]) + 1
        except (IndexError, ValueError):
            num = last.id + 1
    else:
        num = 1
    return f"BO-{num:04d}"


def _order_to_response(order: BuildOrder) -> BuildOrderResponse:
    return BuildOrderResponse(
        id=order.id,
        reference=order.reference,
        bom_id=order.bom_id,
        title=order.title,
        description=order.description,
        quantity=order.quantity,
        completed_quantity=order.completed_quantity,
        status=order.status,
        priority=order.priority,
        target_date=order.target_date,
        started_at=order.started_at,
        completed_at=order.completed_at,
        notes=order.notes,
        bom_name=order.bom.name if order.bom else None,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


def _order_to_detail(order: BuildOrder) -> BuildOrderDetailResponse:
    return BuildOrderDetailResponse(
        id=order.id,
        reference=order.reference,
        bom_id=order.bom_id,
        title=order.title,
        description=order.description,
        quantity=order.quantity,
        completed_quantity=order.completed_quantity,
        status=order.status,
        priority=order.priority,
        target_date=order.target_date,
        started_at=order.started_at,
        completed_at=order.completed_at,
        notes=order.notes,
        bom_name=order.bom.name if order.bom else None,
        created_at=order.created_at,
        updated_at=order.updated_at,
        allocations=[
            BuildAllocationResponse(
                id=a.id,
                build_order_id=a.build_order_id,
                bom_item_id=a.bom_item_id,
                stock_item_id=a.stock_item_id,
                component_id=a.component_id,
                quantity=a.quantity,
                created_at=a.created_at,
            )
            for a in order.allocations
        ],
        outputs=[
            BuildOutputResponse(
                id=o.id,
                build_order_id=o.build_order_id,
                quantity=o.quantity,
                serial_number=o.serial_number,
                notes=o.notes,
                completed_at=o.completed_at,
            )
            for o in order.outputs
        ],
    )


@router.get("", response_model=BuildOrderListResponse)
def list_build_orders(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("asc"),
    db: Session = Depends(get_db),
):
    """List build orders with search, status filter, and pagination."""
    query = db.query(BuildOrder)

    if status:
        query = query.filter(BuildOrder.status == status)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                BuildOrder.title.ilike(search_term),
                BuildOrder.reference.ilike(search_term),
                BuildOrder.description.ilike(search_term),
            )
        )

    if sort_by and hasattr(BuildOrder, sort_by):
        col = getattr(BuildOrder, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())
    else:
        query = query.order_by(BuildOrder.created_at.desc())

    total = query.count()
    offset = (page - 1) * page_size
    orders = query.offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if page_size else 0

    return BuildOrderListResponse(
        items=[_order_to_response(o) for o in orders],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=BuildOrderResponse, status_code=201)
def create_build_order(
    data: BuildOrderCreate,
    db: Session = Depends(get_db),
):
    """Create a new build order with auto-generated reference."""
    bom = db.query(BOM).filter(BOM.id == data.bom_id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")

    reference = _generate_reference(db)

    order = BuildOrder(
        reference=reference,
        bom_id=data.bom_id,
        title=data.title,
        description=data.description,
        quantity=data.quantity,
        priority=data.priority,
        target_date=data.target_date,
        notes=data.notes,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return _order_to_response(order)


@router.get("/{order_id}", response_model=BuildOrderDetailResponse)
def get_build_order(order_id: int, db: Session = Depends(get_db)):
    """Get a build order with allocations and outputs."""
    order = db.query(BuildOrder).filter(BuildOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Build order not found")
    return _order_to_detail(order)


@router.put("/{order_id}", response_model=BuildOrderResponse)
def update_build_order(
    order_id: int,
    data: BuildOrderUpdate,
    db: Session = Depends(get_db),
):
    """Update a build order."""
    order = db.query(BuildOrder).filter(BuildOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Build order not found")

    if order.status in ("completed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Cannot update a {order.status} build order")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)

    db.commit()
    db.refresh(order)
    return _order_to_response(order)


@router.delete("/{order_id}", status_code=204)
def delete_build_order(order_id: int, db: Session = Depends(get_db)):
    """Delete a build order. Only pending orders can be deleted."""
    order = db.query(BuildOrder).filter(BuildOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Build order not found")

    if order.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete a build order with status '{order.status}'. Only pending orders can be deleted.",
        )

    db.delete(order)
    db.commit()


@router.post("/{order_id}/allocate", response_model=BuildAllocationResponse, status_code=201)
def allocate_stock(
    order_id: int,
    data: BuildAllocationCreate,
    db: Session = Depends(get_db),
):
    """Allocate stock for a BOM item in a build order."""
    order = db.query(BuildOrder).filter(BuildOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Build order not found")

    if order.status in ("completed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Cannot allocate to a {order.status} build order")

    bom_item = db.query(BOMItem).filter(BOMItem.id == data.bom_item_id).first()
    if not bom_item:
        raise HTTPException(status_code=404, detail="BOM item not found")

    if data.stock_item_id is not None:
        stock_item = db.query(StockItem).filter(StockItem.id == data.stock_item_id).first()
        if not stock_item:
            raise HTTPException(status_code=404, detail="Stock item not found")
        if stock_item.quantity < data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock: have {stock_item.quantity}, need {data.quantity}",
            )

    # Update order status to in_progress if currently pending
    if order.status == "pending":
        order.status = "in_progress"
        order.started_at = datetime.utcnow()

    allocation = BuildAllocation(
        build_order_id=order_id,
        bom_item_id=data.bom_item_id,
        stock_item_id=data.stock_item_id,
        component_id=data.component_id,
        quantity=data.quantity,
    )
    db.add(allocation)
    db.commit()
    db.refresh(allocation)

    return BuildAllocationResponse(
        id=allocation.id,
        build_order_id=allocation.build_order_id,
        bom_item_id=allocation.bom_item_id,
        stock_item_id=allocation.stock_item_id,
        component_id=allocation.component_id,
        quantity=allocation.quantity,
        created_at=allocation.created_at,
    )


@router.post("/{order_id}/unallocate/{allocation_id}", status_code=204)
def unallocate_stock(
    order_id: int,
    allocation_id: int,
    db: Session = Depends(get_db),
):
    """Remove a stock allocation from a build order."""
    order = db.query(BuildOrder).filter(BuildOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Build order not found")

    if order.status in ("completed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Cannot unallocate from a {order.status} build order")

    allocation = (
        db.query(BuildAllocation)
        .filter(BuildAllocation.id == allocation_id, BuildAllocation.build_order_id == order_id)
        .first()
    )
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")

    db.delete(allocation)
    db.commit()


@router.post("/{order_id}/complete", response_model=BuildOrderDetailResponse)
def complete_build_order(
    order_id: int,
    data: BuildOutputCreate,
    db: Session = Depends(get_db),
):
    """Complete a build order: decrement allocated stock and create output."""
    order = db.query(BuildOrder).filter(BuildOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Build order not found")

    if order.status in ("completed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Build order is already {order.status}")

    # Decrement allocated stock items
    for allocation in order.allocations:
        if allocation.stock_item_id is not None:
            stock_item = db.query(StockItem).filter(StockItem.id == allocation.stock_item_id).first()
            if stock_item:
                stock_item.quantity = max(0, stock_item.quantity - allocation.quantity)

    # Create output record
    output = BuildOutput(
        build_order_id=order_id,
        quantity=data.quantity,
        serial_number=data.serial_number,
        notes=data.notes,
    )
    db.add(output)

    order.completed_quantity += data.quantity

    # Mark as completed if we have built enough
    if order.completed_quantity >= order.quantity:
        order.status = "completed"
        order.completed_at = datetime.utcnow()
    elif order.status == "pending":
        order.status = "in_progress"
        order.started_at = datetime.utcnow()

    db.commit()
    db.refresh(order)
    return _order_to_detail(order)


@router.post("/{order_id}/cancel", response_model=BuildOrderResponse)
def cancel_build_order(order_id: int, db: Session = Depends(get_db)):
    """Cancel a build order."""
    order = db.query(BuildOrder).filter(BuildOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Build order not found")

    if order.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed build order")

    if order.status == "cancelled":
        raise HTTPException(status_code=400, detail="Build order is already cancelled")

    order.status = "cancelled"
    db.commit()
    db.refresh(order)
    return _order_to_response(order)
