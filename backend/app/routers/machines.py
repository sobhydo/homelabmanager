import math
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.machine import Machine
from app.schemas.machine import (
    MachineCommand,
    MachineCreate,
    MachineListResponse,
    MachineResponse,
    MachineUpdate,
)

router = APIRouter(prefix="/machines", tags=["machines"])


@router.get("", response_model=MachineListResponse)
def list_machines(
    search: Optional[str] = Query(None),
    machine_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("asc"),
    db: Session = Depends(get_db),
):
    """List all machines with optional filters and pagination."""
    query = db.query(Machine)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Machine.name.ilike(search_term),
                Machine.notes.ilike(search_term),
            )
        )

    if machine_type:
        query = query.filter(Machine.machine_type == machine_type)
    if status:
        query = query.filter(Machine.status == status)

    if sort_by and hasattr(Machine, sort_by):
        col = getattr(Machine, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())

    total = query.count()
    offset = (page - 1) * page_size
    machines = query.offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if page_size else 0

    return MachineListResponse(
        items=machines,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=MachineResponse, status_code=201)
def create_machine(data: MachineCreate, db: Session = Depends(get_db)):
    """Create a new machine."""
    machine = Machine(**data.model_dump())
    db.add(machine)
    db.commit()
    db.refresh(machine)
    return machine


@router.get("/{machine_id}", response_model=MachineResponse)
def get_machine(machine_id: int, db: Session = Depends(get_db)):
    """Get a machine by ID."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine


@router.put("/{machine_id}", response_model=MachineResponse)
def update_machine(
    machine_id: int, data: MachineUpdate, db: Session = Depends(get_db)
):
    """Update a machine."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(machine, field, value)
    db.commit()
    db.refresh(machine)
    return machine


@router.delete("/{machine_id}", status_code=204)
def delete_machine(machine_id: int, db: Session = Depends(get_db)):
    """Delete a machine."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    db.delete(machine)
    db.commit()


@router.get("/{machine_id}/status")
def get_machine_status(machine_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Get the current status of a machine."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return {
        "id": machine.id,
        "name": machine.name,
        "status": machine.status,
        "ip_address": machine.ip_address,
        "specs": machine.specs,
    }


@router.post("/{machine_id}/command")
def send_machine_command(
    machine_id: int, data: MachineCommand, db: Session = Depends(get_db)
) -> dict[str, Any]:
    """Send a command to a machine (placeholder for machine-specific integrations)."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    # Placeholder: in production, this would dispatch to machine-specific clients
    return {
        "machine_id": machine.id,
        "command": data.command,
        "params": data.params,
        "status": "sent",
        "message": f"Command '{data.command}' sent to {machine.name}",
    }
