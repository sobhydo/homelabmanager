from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.component import Component
from app.models.stock_transaction import StockTransaction
from app.models.tool import Tool
from app.models.machine import Machine, MaintenanceTask
from app.models.software import Software, Subscription

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    """Return aggregate stats for the dashboard in the flat format the frontend expects."""
    now = datetime.utcnow()
    thirty_days = now + timedelta(days=30)

    total_components = db.query(Component).count()
    low_stock_count = (
        db.query(Component)
        .filter(Component.quantity < Component.min_quantity)
        .count()
    )
    checked_out_tools = (
        db.query(Tool).filter(Tool.status == "checked_out").count()
    )
    upcoming_maintenance = (
        db.query(MaintenanceTask)
        .filter(
            MaintenanceTask.status == "pending",
            MaintenanceTask.scheduled_date.isnot(None),
            MaintenanceTask.scheduled_date >= now,
            MaintenanceTask.scheduled_date <= thirty_days,
        )
        .count()
    )
    expiring_subscriptions = (
        db.query(Subscription)
        .filter(
            Subscription.status == "active",
            Subscription.expiry_date.isnot(None),
            Subscription.expiry_date >= now,
            Subscription.expiry_date <= thirty_days,
        )
        .count()
    )
    total_machines = db.query(Machine).count()
    online_machines = (
        db.query(Machine).filter(Machine.status == "online").count()
    )
    total_software = db.query(Software).count()

    # Recent transactions (last 10) with component name joined
    recent_txns_query = (
        db.query(
            StockTransaction.id,
            Component.name.label("component_name"),
            StockTransaction.quantity_change,
            StockTransaction.reason,
            StockTransaction.created_at,
        )
        .join(Component, StockTransaction.component_id == Component.id)
        .order_by(StockTransaction.created_at.desc())
        .limit(10)
        .all()
    )
    recent_transactions = [
        {
            "id": txn.id,
            "component_name": txn.component_name,
            "quantity_change": txn.quantity_change,
            "reason": txn.reason,
            "created_at": txn.created_at.isoformat() if txn.created_at else None,
        }
        for txn in recent_txns_query
    ]

    # Components by category
    category_counts = (
        db.query(
            Component.category,
            func.count(Component.id).label("count"),
        )
        .group_by(Component.category)
        .all()
    )
    components_by_category = [
        {
            "category": row.category or "Uncategorized",
            "count": row.count,
        }
        for row in category_counts
    ]

    return {
        "total_components": total_components,
        "low_stock_count": low_stock_count,
        "checked_out_tools": checked_out_tools,
        "upcoming_maintenance": upcoming_maintenance,
        "expiring_subscriptions": expiring_subscriptions,
        "total_machines": total_machines,
        "online_machines": online_machines,
        "total_software": total_software,
        "recent_transactions": recent_transactions,
        "components_by_category": components_by_category,
    }
