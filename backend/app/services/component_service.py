from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.component import Component
from app.models.stock_transaction import StockTransaction


def search_components(
    db: Session,
    query: str,
    category: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Component], int]:
    """Search components across name, MPN, and SPN fields.

    Returns a tuple of (results, total_count).
    """
    search = f"%{query}%"
    q = db.query(Component).filter(
        or_(
            Component.name.ilike(search),
            Component.manufacturer_part_number.ilike(search),
            Component.supplier_part_number.ilike(search),
            Component.description.ilike(search),
        )
    )

    if category:
        q = q.filter(Component.category == category)

    total = q.count()
    results = q.offset(offset).limit(limit).all()
    return results, total


def adjust_stock(
    db: Session,
    component_id: int,
    quantity_change: int,
    reason: str,
    reference_id: int | None = None,
) -> Component:
    """Adjust stock for a component and create a transaction record.

    Args:
        db: Database session.
        component_id: ID of the component.
        quantity_change: Positive to add stock, negative to remove.
        reason: Reason for the adjustment (e.g. "purchase", "build", "manual").
        reference_id: Optional reference to a related record (e.g. invoice or build ID).

    Returns:
        The updated Component.

    Raises:
        ValueError: If component not found or resulting quantity would be negative.
    """
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise ValueError(f"Component with id {component_id} not found")

    new_quantity = (component.quantity or 0) + quantity_change
    if new_quantity < 0:
        raise ValueError(
            f"Insufficient stock: have {component.quantity}, trying to remove {abs(quantity_change)}"
        )

    component.quantity = new_quantity

    transaction = StockTransaction(
        component_id=component_id,
        quantity_change=quantity_change,
        reason=reason,
        reference_id=reference_id,
    )
    db.add(transaction)
    db.commit()
    db.refresh(component)
    return component
