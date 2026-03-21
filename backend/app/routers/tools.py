import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.tool import Tool, ToolCheckout
from app.schemas.tool import (
    ToolCreate,
    ToolListResponse,
    ToolResponse,
    ToolUpdate,
)

router = APIRouter(prefix="/tools", tags=["tools"])


class CheckoutRequest(BaseModel):
    checked_out_to: str


@router.get("", response_model=ToolListResponse)
def list_tools(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("asc"),
    db: Session = Depends(get_db),
):
    """List all tools with optional filters and pagination."""
    query = db.query(Tool)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Tool.name.ilike(search_term),
                Tool.description.ilike(search_term),
            )
        )

    if category:
        query = query.filter(Tool.category == category)
    if status:
        query = query.filter(Tool.status == status)

    if sort_by and hasattr(Tool, sort_by):
        col = getattr(Tool, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())

    total = query.count()
    offset = (page - 1) * page_size
    tools = query.offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if page_size else 0

    return ToolListResponse(
        items=tools,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=ToolResponse, status_code=201)
def create_tool(data: ToolCreate, db: Session = Depends(get_db)):
    """Create a new tool."""
    tool = Tool(**data.model_dump())
    db.add(tool)
    db.commit()
    db.refresh(tool)
    return tool


@router.get("/{tool_id}", response_model=ToolResponse)
def get_tool(tool_id: int, db: Session = Depends(get_db)):
    """Get a tool by ID."""
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool


@router.put("/{tool_id}", response_model=ToolResponse)
def update_tool(tool_id: int, data: ToolUpdate, db: Session = Depends(get_db)):
    """Update a tool."""
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tool, field, value)
    db.commit()
    db.refresh(tool)
    return tool


@router.delete("/{tool_id}", status_code=204)
def delete_tool(tool_id: int, db: Session = Depends(get_db)):
    """Delete a tool."""
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    db.delete(tool)
    db.commit()


@router.post("/{tool_id}/checkout", response_model=ToolResponse)
def checkout_tool(
    tool_id: int, data: CheckoutRequest, db: Session = Depends(get_db)
):
    """Check out a tool. Frontend sends {checked_out_to: string}."""
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    if tool.status != "available":
        raise HTTPException(status_code=400, detail="Tool is not available for checkout")

    tool.status = "checked_out"
    checkout = ToolCheckout(
        tool_id=tool.id,
        checked_out_by=data.checked_out_to,
    )
    db.add(checkout)
    db.commit()
    db.refresh(tool)
    return tool


@router.post("/{tool_id}/return", response_model=ToolResponse)
def return_tool(
    tool_id: int, db: Session = Depends(get_db)
):
    """Return a checked-out tool."""
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    checkout = (
        db.query(ToolCheckout)
        .filter(ToolCheckout.tool_id == tool_id, ToolCheckout.returned_at.is_(None))
        .order_by(ToolCheckout.checked_out_at.desc())
        .first()
    )
    if not checkout:
        raise HTTPException(status_code=400, detail="No active checkout found")

    checkout.returned_at = datetime.utcnow()
    tool.status = "available"

    db.commit()
    db.refresh(tool)
    return tool
