from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.machine import Machine, MaintenanceTask
from app.schemas.machine import (
    MaintenanceTaskCreate,
    MaintenanceTaskResponse,
    MaintenanceTaskUpdate,
)

router = APIRouter(tags=["maintenance"])


@router.get("/maintenance/upcoming", response_model=list[MaintenanceTaskResponse])
def get_upcoming_maintenance(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """Get maintenance tasks scheduled within the next N days."""
    now = datetime.utcnow()
    cutoff = now + timedelta(days=days)
    return (
        db.query(MaintenanceTask)
        .filter(
            MaintenanceTask.status == "pending",
            MaintenanceTask.scheduled_date.isnot(None),
            MaintenanceTask.scheduled_date >= now,
            MaintenanceTask.scheduled_date <= cutoff,
        )
        .order_by(MaintenanceTask.scheduled_date)
        .all()
    )


@router.get("/maintenance/overdue", response_model=list[MaintenanceTaskResponse])
def get_overdue_maintenance(db: Session = Depends(get_db)):
    """Get overdue maintenance tasks."""
    now = datetime.utcnow()
    return (
        db.query(MaintenanceTask)
        .filter(
            MaintenanceTask.status == "pending",
            MaintenanceTask.scheduled_date.isnot(None),
            MaintenanceTask.scheduled_date < now,
        )
        .order_by(MaintenanceTask.scheduled_date)
        .all()
    )


@router.get(
    "/machines/{machine_id}/maintenance",
    response_model=list[MaintenanceTaskResponse],
)
def list_machine_maintenance(machine_id: int, db: Session = Depends(get_db)):
    """List all maintenance tasks for a machine."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return (
        db.query(MaintenanceTask)
        .filter(MaintenanceTask.machine_id == machine_id)
        .order_by(MaintenanceTask.scheduled_date.desc())
        .all()
    )


@router.post(
    "/machines/{machine_id}/maintenance",
    response_model=MaintenanceTaskResponse,
    status_code=201,
)
def create_maintenance_task(
    machine_id: int, data: MaintenanceTaskCreate, db: Session = Depends(get_db)
):
    """Create a maintenance task for a machine."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    task = MaintenanceTask(machine_id=machine_id, **data.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get(
    "/machines/{machine_id}/maintenance/{task_id}",
    response_model=MaintenanceTaskResponse,
)
def get_maintenance_task(
    machine_id: int, task_id: int, db: Session = Depends(get_db)
):
    """Get a specific maintenance task."""
    task = (
        db.query(MaintenanceTask)
        .filter(
            MaintenanceTask.id == task_id,
            MaintenanceTask.machine_id == machine_id,
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")
    return task


@router.put(
    "/machines/{machine_id}/maintenance/{task_id}",
    response_model=MaintenanceTaskResponse,
)
def update_maintenance_task(
    machine_id: int,
    task_id: int,
    data: MaintenanceTaskUpdate,
    db: Session = Depends(get_db),
):
    """Update a maintenance task."""
    task = (
        db.query(MaintenanceTask)
        .filter(
            MaintenanceTask.id == task_id,
            MaintenanceTask.machine_id == machine_id,
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/machines/{machine_id}/maintenance/{task_id}", status_code=204)
def delete_maintenance_task(
    machine_id: int, task_id: int, db: Session = Depends(get_db)
):
    """Delete a maintenance task."""
    task = (
        db.query(MaintenanceTask)
        .filter(
            MaintenanceTask.id == task_id,
            MaintenanceTask.machine_id == machine_id,
        )
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")
    db.delete(task)
    db.commit()
