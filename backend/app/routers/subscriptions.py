import math
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.software import Subscription
from app.schemas.software import (
    SubscriptionCreate,
    SubscriptionListResponse,
    SubscriptionResponse,
    SubscriptionUpdate,
)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("/expiring", response_model=list[SubscriptionResponse])
def get_expiring_subscriptions(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """Get subscriptions expiring within the next N days."""
    now = datetime.utcnow()
    cutoff = now + timedelta(days=days)
    return (
        db.query(Subscription)
        .filter(
            Subscription.status == "active",
            Subscription.expiry_date.isnot(None),
            Subscription.expiry_date >= now,
            Subscription.expiry_date <= cutoff,
        )
        .order_by(Subscription.expiry_date)
        .all()
    )


@router.get("", response_model=SubscriptionListResponse)
def list_subscriptions(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("asc"),
    db: Session = Depends(get_db),
):
    """List all subscriptions with pagination."""
    query = db.query(Subscription)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Subscription.name.ilike(search_term),
                Subscription.description.ilike(search_term),
            )
        )

    if status:
        query = query.filter(Subscription.status == status)

    if sort_by and hasattr(Subscription, sort_by):
        col = getattr(Subscription, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())

    total = query.count()
    offset = (page - 1) * page_size
    subs = query.offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if page_size else 0

    return SubscriptionListResponse(
        items=subs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=SubscriptionResponse, status_code=201)
def create_subscription(data: SubscriptionCreate, db: Session = Depends(get_db)):
    """Create a new subscription."""
    sub = Subscription(**data.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(subscription_id: int, db: Session = Depends(get_db)):
    """Get a subscription by ID."""
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@router.put("/{subscription_id}", response_model=SubscriptionResponse)
def update_subscription(
    subscription_id: int, data: SubscriptionUpdate, db: Session = Depends(get_db)
):
    """Update a subscription."""
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(sub, field, value)
    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/{subscription_id}", status_code=204)
def delete_subscription(subscription_id: int, db: Session = Depends(get_db)):
    """Delete a subscription."""
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    db.delete(sub)
    db.commit()
