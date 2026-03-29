"""Parse LCSC order export CSV files into structured invoice data."""

import csv
import io
import re
from typing import Any

from app.services.category_classifier import classify_component


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


def _extract_component_name(description: str, mpn: str, package: str) -> str:
    """Build a concise component name from CSV fields.

    For passives: "100nF 0402 X7R 16V" style
    For ICs: description truncated
    """
    if not description:
        return mpn or "Unknown"

    # The CSV description is usually good enough as-is, just trim it
    name = description.strip()
    if len(name) > 200:
        name = name[:200]
    return name


def _build_supplier_url(lcsc_pn: str) -> str:
    """Build an LCSC product page URL from the part number."""
    if lcsc_pn:
        return f"https://www.lcsc.com/product-detail/{lcsc_pn}.html"
    return ""


def parse_lcsc_csv(content: str, filename: str = "") -> dict[str, Any]:
    """Parse an LCSC order CSV and return structured invoice data.

    Extracts as much info as possible to map to the Component model:
    - name: from description
    - manufacturer_part_number / mpn: from MPN column
    - supplier_part_number: LCSC Part Number
    - manufacturer: from Manufacturer column
    - package_type: from Package column
    - category / suggested_category: auto-classified
    - notes: Customer NO. (reference designators)
    - supplier_url: built from LCSC part number
    - unit_price / total_price
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
        rohs = row.get("RoHS", "").strip()

        # Classify the component
        category, detected_package = classify_component(description, mfr_pn)
        # Prefer CSV package field over regex-detected one
        final_package = package if package and package != "-" else detected_package

        # Build a clean name
        name = _extract_component_name(description, mfr_pn, package)

        # Build notes from customer reference designators
        notes_parts = []
        if customer_no:
            notes_parts.append(f"Ref: {customer_no}")
        if rohs and rohs.upper() == "YES":
            notes_parts.append("RoHS")

        items.append({
            "description": description or name,
            "part_number": mfr_pn or None,
            "supplier_part_number": lcsc_pn or None,
            "lcsc_part_number": lcsc_pn or None,
            "quantity": qty,
            "unit_price": unit_price,
            "total_price": ext_price,
            "suggested_category": category,
            "suggested_package": final_package,
            # Extra fields for component creation
            "manufacturer": manufacturer or None,
            "customer_no": customer_no or None,
            "notes": "; ".join(notes_parts) if notes_parts else None,
            "name": name,
            "supplier_url": _build_supplier_url(lcsc_pn),
        })

        total += ext_price

    # Derive invoice number from filename if possible
    invoice_number = None
    if filename:
        name = filename.replace(".csv", "").replace(".CSV", "")
        parts = name.split("_")
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
