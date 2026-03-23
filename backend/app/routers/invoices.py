import csv
import io
import math
import os
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_settings
from app.models.component import Component
from app.models.invoice import Invoice, InvoiceItem
from app.schemas.invoice import (
    InvoiceListResponse,
    InvoiceResponse,
    InvoiceUploadResponse,
)
from app.services.invoice_parser import parse_invoice_pdf
from app.utils.file_handling import save_upload_file

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=InvoiceListResponse)
def list_invoices(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("asc"),
    db: Session = Depends(get_db),
):
    """List all invoices with pagination."""
    query = db.query(Invoice)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Invoice.invoice_number.ilike(search_term),
                Invoice.supplier.ilike(search_term),
            )
        )

    if sort_by and hasattr(Invoice, sort_by):
        col = getattr(Invoice, sort_by)
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())

    total = query.count()
    offset = (page - 1) * page_size
    invoices = query.offset(offset).limit(page_size).all()
    total_pages = math.ceil(total / page_size) if page_size else 0

    return InvoiceListResponse(
        items=invoices,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/upload", response_model=InvoiceUploadResponse)
async def upload_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
):
    """Upload an invoice PDF."""
    file_path = await save_upload_file(file, settings.UPLOAD_DIR, subdir="invoices")

    invoice = Invoice(
        file_path=file_path,
        status="uploaded",
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return InvoiceUploadResponse(
        invoice_id=invoice.id,
        file_path=file_path,
        status="uploaded",
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """Get an invoice by ID."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.post("/{invoice_id}/process", response_model=InvoiceResponse)
async def process_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
):
    """Process an uploaded invoice using Claude to extract data."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if not invoice.file_path:
        raise HTTPException(status_code=400, detail="Invoice has no file to process")

    parsed = await parse_invoice_pdf(invoice.file_path, settings.ANTHROPIC_API_KEY)

    invoice.invoice_number = parsed.get("invoice_number")
    invoice.supplier = parsed.get("supplier")
    invoice.total_amount = parsed.get("total_amount")
    invoice.currency = parsed.get("currency", "USD")
    invoice.status = "processed"
    invoice.parsed_data = str(parsed)

    for item_data in parsed.get("items", []):
        mpn = item_data.get("part_number")
        component = None
        is_matched = 0
        if mpn:
            component = (
                db.query(Component)
                .filter(Component.manufacturer_part_number == mpn)
                .first()
            )
            if component:
                is_matched = 1

        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            component_id=component.id if component else None,
            description=item_data.get("description"),
            part_number=mpn,
            quantity=item_data.get("quantity", 1),
            unit_price=item_data.get("unit_price"),
            total_price=item_data.get("total_price"),
            matched=is_matched,
        )
        db.add(invoice_item)

    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("/{invoice_id}/download")
def download_invoice_file(invoice_id: int, db: Session = Depends(get_db)):
    """Download the original uploaded invoice file."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not invoice.file_path or not os.path.exists(invoice.file_path):
        raise HTTPException(status_code=404, detail="Original file not found on disk")

    filename = os.path.basename(invoice.file_path)
    return FileResponse(
        path=invoice.file_path,
        filename=filename,
        media_type="application/pdf",
    )


@router.get("/{invoice_id}/export-csv")
def export_invoice_csv(invoice_id: int, db: Session = Depends(get_db)):
    """Export processed invoice items as CSV."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Description", "Part Number", "Quantity", "Unit Price", "Total Price", "Matched"])
    for item in invoice.items:
        writer.writerow([
            item.description or "",
            item.part_number or "",
            item.quantity,
            item.unit_price if item.unit_price is not None else "",
            item.total_price if item.total_price is not None else "",
            "Yes" if item.matched else "No",
        ])

    output.seek(0)
    safe_name = (invoice.invoice_number or f"invoice_{invoice_id}").replace(" ", "_")
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_items.csv"'},
    )


@router.delete("/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """Delete an invoice."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(invoice)
    db.commit()
