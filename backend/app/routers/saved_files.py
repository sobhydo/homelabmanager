import math
import os
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_settings
from app.models.saved_file import SavedFile
from app.schemas.saved_file import SavedFileListResponse, SavedFileResponse
from app.utils.file_handling import save_upload_file

router = APIRouter(prefix="/saved-files", tags=["saved-files"])


@router.get("", response_model=SavedFileListResponse)
def list_saved_files(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List saved files, optionally filtered by category."""
    query = db.query(SavedFile)

    if category:
        query = query.filter(SavedFile.category == category)
    if search:
        term = f"%{search}%"
        query = query.filter(SavedFile.name.ilike(term))

    query = query.order_by(SavedFile.created_at.desc())
    total = query.count()
    offset = (page - 1) * page_size
    files = query.offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if page_size else 0

    return SavedFileListResponse(
        items=files,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=SavedFileResponse)
async def upload_saved_file(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form(...),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
):
    """Upload and save a file for later retrieval."""
    file_path = await save_upload_file(file, settings.UPLOAD_DIR, subdir="saved")

    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else None

    saved = SavedFile(
        name=name,
        original_filename=file.filename or "unknown",
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type,
        category=category,
        notes=notes,
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved


@router.get("/{file_id}", response_model=SavedFileResponse)
def get_saved_file(file_id: int, db: Session = Depends(get_db)):
    """Get saved file metadata."""
    saved = db.query(SavedFile).filter(SavedFile.id == file_id).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved file not found")
    return saved


@router.get("/{file_id}/download")
def download_saved_file(file_id: int, db: Session = Depends(get_db)):
    """Download a saved file."""
    saved = db.query(SavedFile).filter(SavedFile.id == file_id).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved file not found")

    if not os.path.exists(saved.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=saved.file_path,
        filename=saved.original_filename,
        media_type=saved.mime_type or "application/octet-stream",
    )


@router.delete("/{file_id}", status_code=204)
def delete_saved_file(file_id: int, db: Session = Depends(get_db)):
    """Delete a saved file and its data on disk."""
    saved = db.query(SavedFile).filter(SavedFile.id == file_id).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved file not found")

    if saved.file_path and os.path.exists(saved.file_path):
        os.remove(saved.file_path)

    db.delete(saved)
    db.commit()


@router.put("/{file_id}/content", response_model=SavedFileResponse)
async def replace_saved_file_content(
    file_id: int,
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
):
    """Replace the contents of an existing saved file, keeping the same id and name."""
    saved = db.query(SavedFile).filter(SavedFile.id == file_id).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved file not found")

    # Delete the old file on disk (if present) and write the new one
    if saved.file_path and os.path.exists(saved.file_path):
        os.remove(saved.file_path)

    new_path = await save_upload_file(file, settings.UPLOAD_DIR, subdir="saved")
    saved.file_path = new_path
    saved.file_size = os.path.getsize(new_path) if os.path.exists(new_path) else None
    saved.mime_type = file.content_type
    if file.filename:
        saved.original_filename = file.filename
    if notes is not None:
        saved.notes = notes

    db.commit()
    db.refresh(saved)
    return saved


@router.patch("/{file_id}", response_model=SavedFileResponse)
def update_saved_file(
    file_id: int,
    name: Optional[str] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Update saved file metadata (name, notes)."""
    saved = db.query(SavedFile).filter(SavedFile.id == file_id).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved file not found")

    if name is not None:
        saved.name = name
    if notes is not None:
        saved.notes = notes

    db.commit()
    db.refresh(saved)
    return saved
