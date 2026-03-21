import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_settings
from app.models.attachment import Attachment
from app.schemas.attachment import AttachmentResponse

router = APIRouter(prefix="/attachments", tags=["attachments"])


@router.post("/upload", response_model=AttachmentResponse, status_code=201)
async def upload_attachment(
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    entity_id: int = Form(...),
    attachment_type: str = Form("other"),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """Upload an attachment for any entity."""
    settings = get_settings()

    # Create upload directory
    upload_dir = os.path.join(settings.UPLOAD_DIR, "attachments", entity_type)
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_name = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, unique_name)

    # Save file
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    attachment = Attachment(
        filename=file.filename or unique_name,
        filepath=filepath,
        file_size=len(content),
        mime_type=file.content_type,
        attachment_type=attachment_type,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("", response_model=list[AttachmentResponse])
def list_attachments(
    entity_type: str = Query(..., description="Entity type"),
    entity_id: int = Query(..., description="Entity ID"),
    db: Session = Depends(get_db),
):
    """List attachments for an entity."""
    attachments = (
        db.query(Attachment)
        .filter(
            Attachment.entity_type == entity_type,
            Attachment.entity_id == entity_id,
        )
        .order_by(Attachment.created_at.desc())
        .all()
    )
    return attachments


@router.get("/{attachment_id}", response_model=AttachmentResponse)
def get_attachment(attachment_id: int, db: Session = Depends(get_db)):
    """Get an attachment by ID."""
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return attachment


@router.delete("/{attachment_id}", status_code=204)
def delete_attachment(attachment_id: int, db: Session = Depends(get_db)):
    """Delete an attachment and its file."""
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Remove file from disk
    if os.path.exists(attachment.filepath):
        os.remove(attachment.filepath)

    db.delete(attachment)
    db.commit()


@router.put("/{attachment_id}/primary", response_model=AttachmentResponse)
def set_primary_attachment(attachment_id: int, db: Session = Depends(get_db)):
    """Set an attachment as the primary image for its entity."""
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Unset other primaries for same entity
    db.query(Attachment).filter(
        Attachment.entity_type == attachment.entity_type,
        Attachment.entity_id == attachment.entity_id,
        Attachment.id != attachment_id,
    ).update({"is_primary": False})

    attachment.is_primary = True
    db.commit()
    db.refresh(attachment)
    return attachment
