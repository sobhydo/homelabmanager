import csv
import io
import math
import os
import re
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
from app.models.category import Category
from app.models.footprint import Footprint
from app.services.ai_enrichment import enrich_invoice_items
from app.services.category_classifier import classify_component
from app.services.invoice_parser import parse_invoice_pdf
from app.services.lcsc_parser import is_lcsc_csv, parse_lcsc_csv
from app.utils.file_handling import save_upload_file

router = APIRouter(prefix="/invoices", tags=["invoices"])


# ── Helpers ──────────────────────────────────────────────────────────────


def _match_component(db: Session, item_data: dict) -> tuple[Optional[Component], int]:
    """Try to match an invoice item to a component in the DB.

    Matching priority:
    1. Manufacturer part number (MPN)
    2. Supplier part number (e.g. LCSC C1523)
    3. MPN field on component
    """
    mpn = item_data.get("part_number")
    spn = item_data.get("supplier_part_number") or item_data.get("lcsc_part_number")

    component = None

    # Try MPN match first
    if mpn:
        component = (
            db.query(Component)
            .filter(
                or_(
                    Component.manufacturer_part_number == mpn,
                    Component.mpn == mpn,
                )
            )
            .first()
        )

    # Fallback: try supplier part number
    if not component and spn:
        component = (
            db.query(Component)
            .filter(Component.supplier_part_number == spn)
            .first()
        )

    return component, 1 if component else 0


async def _enrich_items_with_ai(
    items: list[dict], db: Session, api_key: str
) -> list[dict]:
    """Enrich parsed items using AI, with footprints and categories from the DB."""
    try:
        footprints = [f.name for f in db.query(Footprint).order_by(Footprint.name).all()]
        categories = [
            c.name for c in db.query(Category).filter(Category.parent_id.is_(None)).order_by(Category.name).all()
        ]
        return await enrich_invoice_items(items, api_key, footprints, categories)
    except Exception:
        return items  # fallback to original on any error


def _create_invoice_items(db: Session, invoice: Invoice, items: list[dict]) -> None:
    """Create InvoiceItem records from parsed data with component matching and classification."""
    for item_data in items:
        component, is_matched = _match_component(db, item_data)

        mpn = item_data.get("part_number")
        spn = item_data.get("supplier_part_number") or item_data.get("lcsc_part_number")
        description = item_data.get("description", "")

        # Classify the component
        category, package = classify_component(description, mpn or "")
        # Use AI-suggested category if provided, otherwise use rule-based
        suggested_cat = item_data.get("suggested_category") or category
        suggested_pkg = item_data.get("suggested_package") or package

        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            component_id=component.id if component else None,
            description=item_data.get("name") or description,
            part_number=mpn,
            supplier_part_number=spn,
            quantity=item_data.get("quantity", 1),
            unit_price=item_data.get("unit_price"),
            total_price=item_data.get("total_price"),
            matched=is_matched,
            suggested_category=suggested_cat,
            suggested_package=suggested_pkg,
            manufacturer=item_data.get("manufacturer"),
            notes=item_data.get("notes"),
            supplier_url=item_data.get("supplier_url"),
            footprint=item_data.get("footprint"),
        )
        db.add(invoice_item)


def _extract_order_number(filename: str) -> Optional[str]:
    """Try to extract an LCSC order/reference number from a filename.

    Matches patterns like WL2602220109, WM2602110063.
    """
    # Look for WL/WM followed by digits
    m = re.search(r"(W[LM]\d{8,})", filename, re.IGNORECASE)
    if m:
        return m.group(1).upper()
    return None


def _merge_items(items_list: list[list[dict]]) -> list[dict]:
    """Merge item lists from multiple files of the same order.

    Uses MPN as the key. Enriches items with data from other files:
    - Prices from commercial invoice
    - LCSC Part # from packing list or CSV
    - Best description (longest)
    """
    merged: dict[str, dict] = {}  # keyed by normalized MPN

    for items in items_list:
        for item in items:
            mpn = (item.get("part_number") or "").strip()
            if not mpn:
                # Try supplier_part_number as fallback key
                mpn = (item.get("supplier_part_number") or item.get("lcsc_part_number") or "").strip()
            if not mpn:
                continue

            key = mpn.upper().replace(" ", "").replace("-", "")

            if key not in merged:
                merged[key] = dict(item)
            else:
                existing = merged[key]
                # Enrich: prefer non-null values
                if item.get("unit_price") and not existing.get("unit_price"):
                    existing["unit_price"] = item["unit_price"]
                if item.get("total_price") and not existing.get("total_price"):
                    existing["total_price"] = item["total_price"]
                if item.get("supplier_part_number") and not existing.get("supplier_part_number"):
                    existing["supplier_part_number"] = item["supplier_part_number"]
                if item.get("lcsc_part_number") and not existing.get("lcsc_part_number"):
                    existing["lcsc_part_number"] = item["lcsc_part_number"]
                # Use the longest description (usually most complete)
                new_desc = item.get("description") or ""
                old_desc = existing.get("description") or ""
                if len(new_desc) > len(old_desc):
                    existing["description"] = new_desc
                # Prefer the higher quantity (shipped qty vs ordered)
                new_qty = item.get("quantity", 0)
                old_qty = existing.get("quantity", 0)
                if new_qty > old_qty:
                    existing["quantity"] = new_qty

    return list(merged.values())


# ── Endpoints ────────────────────────────────────────────────────────────


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


@router.post("/upload", response_model=InvoiceResponse)
async def upload_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
):
    """Upload an invoice file (PDF or LCSC CSV).

    PDFs are saved and require a separate /process call.
    LCSC CSVs are parsed immediately and returned fully processed.
    """
    raw_bytes = await file.read()
    await file.seek(0)

    file_path = await save_upload_file(file, settings.UPLOAD_DIR, subdir="invoices")
    filename = file.filename or ""
    is_csv = filename.lower().endswith(".csv")

    if is_csv:
        try:
            content = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content = raw_bytes.decode("latin-1")

        if is_lcsc_csv(content):
            parsed = parse_lcsc_csv(content, filename)

            # AI enrichment: better names, descriptions, footprint matching
            items = parsed.get("items", [])
            if settings.ANTHROPIC_API_KEY:
                items = await _enrich_items_with_ai(items, db, settings.ANTHROPIC_API_KEY)

            invoice = Invoice(
                file_path=file_path,
                invoice_number=parsed.get("invoice_number"),
                supplier=parsed.get("supplier"),
                total_amount=parsed.get("total_amount"),
                currency=parsed.get("currency", "USD"),
                status="processed",
                parsed_data=str(parsed),
            )
            db.add(invoice)
            db.flush()
            _create_invoice_items(db, invoice, items)
            db.commit()
            db.refresh(invoice)
            return invoice

    invoice = Invoice(file_path=file_path, status="uploaded")
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


@router.post("/upload-multiple", response_model=list[InvoiceResponse])
async def upload_multiple_invoices(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
):
    """Upload multiple invoice files at once with smart merging.

    Files from the same LCSC order (detected by WL/WM number in filename) are merged
    into a single invoice, combining items from packing list (LCSC Part #, quantities),
    commercial invoice (prices), and CSV (full data).

    Files from different orders or without a recognizable order number are kept separate.
    """
    # Phase 1: Save all files and parse CSVs, collect metadata
    file_records: list[dict] = []

    for file in files:
        raw_bytes = await file.read()
        await file.seek(0)

        file_path = await save_upload_file(file, settings.UPLOAD_DIR, subdir="invoices")
        filename = file.filename or ""
        is_csv = filename.lower().endswith(".csv")
        order_number = _extract_order_number(filename)

        record: dict = {
            "file_path": file_path,
            "filename": filename,
            "is_csv": is_csv,
            "order_number": order_number,
            "raw_bytes": raw_bytes,
            "parsed": None,
            "invoice": None,
        }

        # Parse CSV immediately
        if is_csv:
            try:
                content = raw_bytes.decode("utf-8")
            except UnicodeDecodeError:
                content = raw_bytes.decode("latin-1")

            if is_lcsc_csv(content):
                record["parsed"] = parse_lcsc_csv(content, filename)
                # CSV order number may also be in the parsed data
                if not record["order_number"] and record["parsed"].get("invoice_number"):
                    record["order_number"] = record["parsed"]["invoice_number"]

        file_records.append(record)

    # Phase 2: Group files by order number for merging
    order_groups: dict[str, list[dict]] = {}  # order_number -> list of records
    ungrouped: list[dict] = []

    for rec in file_records:
        if rec["order_number"]:
            order_groups.setdefault(rec["order_number"], []).append(rec)
        else:
            ungrouped.append(rec)

    # If a group has only one file that isn't a CSV, it can't be merged usefully
    # Move single-PDF groups to ungrouped
    for order_num, group in list(order_groups.items()):
        if len(group) == 1 and not group[0].get("parsed"):
            ungrouped.append(group[0])
            del order_groups[order_num]

    results: list[Invoice] = []

    # Phase 3: Process merged groups
    for order_num, group in order_groups.items():
        # Collect all parsed item lists and metadata
        all_items: list[list[dict]] = []
        best_supplier = None
        best_date = None
        best_total = None
        best_currency = "USD"
        file_paths = []

        for rec in group:
            file_paths.append(rec["file_path"])
            if rec["parsed"]:
                all_items.append(rec["parsed"].get("items", []))
                if rec["parsed"].get("supplier"):
                    best_supplier = rec["parsed"]["supplier"]
                if rec["parsed"].get("invoice_date"):
                    best_date = rec["parsed"]["invoice_date"]
                if rec["parsed"].get("total_amount"):
                    best_total = rec["parsed"]["total_amount"]
                if rec["parsed"].get("currency"):
                    best_currency = rec["parsed"]["currency"]

        # For PDFs in the group that haven't been parsed yet, parse them now
        for rec in group:
            if not rec["parsed"] and not rec["is_csv"]:
                try:
                    parsed = await parse_invoice_pdf(rec["file_path"], settings.ANTHROPIC_API_KEY)
                    rec["parsed"] = parsed
                    all_items.append(parsed.get("items", []))
                    if parsed.get("supplier") and not best_supplier:
                        best_supplier = parsed["supplier"]
                    if parsed.get("invoice_date") and not best_date:
                        best_date = parsed["invoice_date"]
                    if parsed.get("total_amount") and not best_total:
                        best_total = parsed["total_amount"]
                    if parsed.get("currency"):
                        best_currency = parsed["currency"]
                except Exception:
                    # If AI parsing fails, skip this file's items
                    pass

        # Merge all items
        merged_items = _merge_items(all_items) if len(all_items) > 1 else (all_items[0] if all_items else [])

        # Calculate total from items if not available
        if not best_total and merged_items:
            item_total = sum(i.get("total_price") or 0 for i in merged_items)
            if item_total > 0:
                best_total = round(item_total, 2)

        # Create the merged invoice
        invoice = Invoice(
            file_path=file_paths[0],  # primary file
            invoice_number=order_num,
            supplier=best_supplier or "LCSC",
            total_amount=best_total,
            currency=best_currency,
            status="processed",
            parsed_data=str({
                "merged_from": [r["filename"] for r in group],
                "file_count": len(group),
            }),
        )
        db.add(invoice)
        db.flush()
        # AI enrichment for merged items
        if settings.ANTHROPIC_API_KEY and merged_items:
            merged_items = await _enrich_items_with_ai(merged_items, db, settings.ANTHROPIC_API_KEY)
        _create_invoice_items(db, invoice, merged_items)
        db.commit()
        db.refresh(invoice)
        results.append(invoice)

    # Phase 4: Process ungrouped files normally
    for rec in ungrouped:
        if rec.get("parsed"):
            parsed = rec["parsed"]
            ungrouped_items = parsed.get("items", [])
            # AI enrichment for ungrouped CSV items
            if settings.ANTHROPIC_API_KEY and ungrouped_items:
                ungrouped_items = await _enrich_items_with_ai(ungrouped_items, db, settings.ANTHROPIC_API_KEY)
            invoice = Invoice(
                file_path=rec["file_path"],
                invoice_number=parsed.get("invoice_number"),
                supplier=parsed.get("supplier"),
                total_amount=parsed.get("total_amount"),
                currency=parsed.get("currency", "USD"),
                status="processed",
                parsed_data=str(parsed),
            )
            db.add(invoice)
            db.flush()
            _create_invoice_items(db, invoice, ungrouped_items)
            db.commit()
            db.refresh(invoice)
            results.append(invoice)
        else:
            invoice = Invoice(file_path=rec["file_path"], status="uploaded")
            db.add(invoice)
            db.commit()
            db.refresh(invoice)
            results.append(invoice)

    return results


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

    _create_invoice_items(db, invoice, parsed.get("items", []))

    db.commit()
    db.refresh(invoice)
    return invoice


@router.post("/{invoice_id}/import-to-inventory", response_model=InvoiceResponse)
def import_to_inventory(
    invoice_id: int,
    db: Session = Depends(get_db),
):
    """Import invoice items into the component inventory.

    For each item:
    - If matched to an existing component: increase its stock quantity.
    - If new: create a new component with the extracted data.
    Marks each item as added_to_stock=1 after processing.
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status != "processed":
        raise HTTPException(status_code=400, detail="Invoice must be processed first")

    for item in invoice.items:
        if item.added_to_stock:
            continue  # already imported

        if item.matched and item.component_id:
            # Existing component - increase stock
            component = db.query(Component).filter(Component.id == item.component_id).first()
            if component:
                component.quantity = (component.quantity or 0) + item.quantity
                # Update price if we have it and component doesn't
                if item.unit_price and not component.unit_price:
                    component.unit_price = item.unit_price
                item.added_to_stock = 1
        else:
            # New component - check if MPN already exists (unique constraint)
            mpn = item.part_number
            spn = item.supplier_part_number

            if mpn:
                existing = (
                    db.query(Component)
                    .filter(Component.manufacturer_part_number == mpn)
                    .first()
                )
                if existing:
                    # MPN exists but wasn't matched earlier - link and update stock
                    existing.quantity = (existing.quantity or 0) + item.quantity
                    if item.unit_price and not existing.unit_price:
                        existing.unit_price = item.unit_price
                    item.component_id = existing.id
                    item.matched = 1
                    item.added_to_stock = 1
                    continue

            # Find category_id from suggested_category name
            category_id = None
            if item.suggested_category:
                cat = db.query(Category).filter(Category.name == item.suggested_category).first()
                if cat:
                    category_id = cat.id

            # Find footprint_id from footprint name
            footprint_id = None
            if item.footprint:
                fp = db.query(Footprint).filter(Footprint.name == item.footprint).first()
                if fp:
                    footprint_id = fp.id

            # Use the AI-enriched name, falling back to description
            name = item.description or ""
            desc = item.description or ""

            component = Component(
                name=name[:255] if name else (mpn or spn or "Unknown"),
                manufacturer_part_number=mpn,
                supplier_part_number=spn,
                description=desc,
                category=item.suggested_category,
                category_id=category_id,
                package_type=item.suggested_package,
                footprint_id=footprint_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                supplier=invoice.supplier,
                supplier_url=item.supplier_url,
                manufacturer=item.manufacturer,
                mpn=mpn,
                notes=item.notes,
            )
            db.add(component)
            db.flush()

            item.component_id = component.id
            item.matched = 1
            item.added_to_stock = 1

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
    media = "text/csv" if filename.lower().endswith(".csv") else "application/pdf"
    return FileResponse(
        path=invoice.file_path,
        filename=filename,
        media_type=media,
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
