"""Parse LCSC order export CSV files into structured invoice data."""

import csv
import io
from typing import Any


LCSC_HEADERS = {
    "LCSC Part Number",
    "Manufacture Part Number",
    "Manufacturer",
    "Quantity",
    "Unit Price($)",
}


def is_lcsc_csv(content: str) -> bool:
    """Check if the CSV content looks like an LCSC order export."""
    try:
        reader = csv.reader(io.StringIO(content))
        headers = set(next(reader, []))
        return LCSC_HEADERS.issubset(headers)
    except Exception:
        return False


def parse_lcsc_csv(content: str, filename: str = "") -> dict[str, Any]:
    """Parse an LCSC order CSV and return structured invoice data.

    Args:
        content: Raw CSV text content.
        filename: Original filename (used to derive invoice number).

    Returns:
        Dict matching the same shape as parse_invoice_pdf output.
    """
    reader = csv.DictReader(io.StringIO(content))

    items: list[dict[str, Any]] = []
    total = 0.0

    for row in reader:
        qty_str = row.get("Quantity", "0").strip().replace(",", "")
        unit_str = row.get("Unit Price($)", "0").strip()
        ext_str = row.get("Ext.Price($)", "0").strip()

        try:
            qty = int(float(qty_str))
        except ValueError:
            qty = 0

        try:
            unit_price = float(unit_str)
        except ValueError:
            unit_price = 0.0

        try:
            ext_price = float(ext_str)
        except ValueError:
            ext_price = round(unit_price * qty, 4)

        lcsc_pn = row.get("LCSC Part Number", "").strip()
        mfr_pn = row.get("Manufacture Part Number", "").strip()
        manufacturer = row.get("Manufacturer", "").strip()
        customer_no = row.get("Customer NO.", "").strip()
        package = row.get("Package", "").strip()
        description = row.get("Description", "").strip()

        # Build a useful description line
        desc_parts = []
        if description:
            desc_parts.append(description)
        if package:
            desc_parts.append(f"[{package}]")
        if customer_no:
            desc_parts.append(f"Ref: {customer_no}")

        items.append({
            "description": " ".join(desc_parts) if desc_parts else mfr_pn or lcsc_pn,
            "part_number": mfr_pn or lcsc_pn,
            "quantity": qty,
            "unit_price": unit_price,
            "total_price": ext_price,
            "lcsc_part_number": lcsc_pn,
            "manufacturer": manufacturer,
            "customer_no": customer_no,
        })

        total += ext_price

    # Derive invoice number from filename if possible
    invoice_number = None
    if filename:
        # LCSC filenames: LCSC__WM2602110063_20260323200540.csv
        name = filename.replace(".csv", "").replace(".CSV", "")
        parts = name.split("_")
        # Find the order-number-looking segment (starts with WM or is long numeric)
        for p in parts:
            if p.startswith("WM") or (p.isdigit() and len(p) > 6):
                invoice_number = p
                break
        if not invoice_number and len(parts) > 1:
            invoice_number = name

    return {
        "invoice_number": invoice_number,
        "supplier": "LCSC",
        "invoice_date": None,
        "total_amount": round(total, 2),
        "currency": "USD",
        "items": items,
    }
