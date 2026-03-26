from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.saved_label import SavedLabel
from app.schemas.saved_label import (
    SavedLabelCreate,
    SavedLabelResponse,
    SavedLabelUpdate,
)

router = APIRouter(prefix="/saved-labels", tags=["saved-labels"])


@router.get("", response_model=list[SavedLabelResponse])
def list_saved_labels(db: Session = Depends(get_db)):
    """List all saved label configurations."""
    return db.query(SavedLabel).order_by(SavedLabel.updated_at.desc()).all()


@router.get("/{label_id}", response_model=SavedLabelResponse)
def get_saved_label(label_id: int, db: Session = Depends(get_db)):
    """Get a saved label configuration by ID."""
    label = db.query(SavedLabel).filter(SavedLabel.id == label_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Saved label not found")
    return label


@router.post("", response_model=SavedLabelResponse, status_code=201)
def create_saved_label(data: SavedLabelCreate, db: Session = Depends(get_db)):
    """Save a label configuration."""
    label = SavedLabel(**data.model_dump())
    db.add(label)
    db.commit()
    db.refresh(label)
    return label


@router.put("/{label_id}", response_model=SavedLabelResponse)
def update_saved_label(
    label_id: int, data: SavedLabelUpdate, db: Session = Depends(get_db)
):
    """Update a saved label configuration."""
    label = db.query(SavedLabel).filter(SavedLabel.id == label_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Saved label not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(label, field, value)

    db.commit()
    db.refresh(label)
    return label


@router.delete("/{label_id}", status_code=204)
def delete_saved_label(label_id: int, db: Session = Depends(get_db)):
    """Delete a saved label configuration."""
    label = db.query(SavedLabel).filter(SavedLabel.id == label_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Saved label not found")
    db.delete(label)
    db.commit()
