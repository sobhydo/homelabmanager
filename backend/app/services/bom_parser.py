import csv
import os
from typing import Any

import openpyxl


# Common column name mappings for auto-detection
_COLUMN_ALIASES: dict[str, list[str]] = {
    "reference_designator": ["reference", "ref", "ref des", "designator", "refdes"],
    "quantity": ["qty", "quantity", "count", "amount"],
    "manufacturer_part_number": ["mpn", "mfr part", "manufacturer part", "mfg part", "part number", "mfr p/n"],
    "supplier_part_number": ["spn", "supplier part", "vendor part", "digikey", "mouser", "supplier p/n"],
    "description": ["description", "desc", "comment"],
    "value": ["value", "val"],
    "package": ["package", "footprint", "pkg", "case"],
}


def _normalize_header(header: str) -> str:
    """Normalize a header string for matching."""
    return header.strip().lower().replace("_", " ").replace("-", " ")


def _detect_columns(headers: list[str]) -> dict[str, int]:
    """Auto-detect which column index maps to which field based on header names."""
    mapping: dict[str, int] = {}
    normalized = [_normalize_header(h) for h in headers]

    for field, aliases in _COLUMN_ALIASES.items():
        for i, header in enumerate(normalized):
            if header in aliases or header == field.replace("_", " "):
                mapping[field] = i
                break

    return mapping


def _parse_csv(file_path: str) -> list[dict[str, Any]]:
    """Parse a CSV BOM file."""
    items: list[dict[str, Any]] = []

    with open(file_path, "r", newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        headers = next(reader, None)
        if not headers:
            return items

        col_map = _detect_columns(headers)

        for row in reader:
            if not any(cell.strip() for cell in row):
                continue
            item: dict[str, Any] = {}
            for field, idx in col_map.items():
                if idx < len(row):
                    val = row[idx].strip()
                    if field == "quantity":
                        try:
                            item[field] = int(val)
                        except (ValueError, TypeError):
                            item[field] = 1
                    else:
                        item[field] = val if val else None
            if item:
                item.setdefault("quantity", 1)
                items.append(item)

    return items


def _parse_excel(file_path: str) -> list[dict[str, Any]]:
    """Parse an Excel BOM file."""
    items: list[dict[str, Any]] = []
    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    ws = wb.active

    if ws is None:
        return items

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return items

    headers = [str(cell) if cell else "" for cell in rows[0]]
    col_map = _detect_columns(headers)

    for row in rows[1:]:
        if not any(cell for cell in row):
            continue
        item: dict[str, Any] = {}
        for field, idx in col_map.items():
            if idx < len(row):
                val = row[idx]
                if field == "quantity":
                    try:
                        item[field] = int(val) if val else 1
                    except (ValueError, TypeError):
                        item[field] = 1
                else:
                    item[field] = str(val).strip() if val else None
        if item:
            item.setdefault("quantity", 1)
            items.append(item)

    wb.close()
    return items


def parse_bom_file(file_path: str) -> list[dict[str, Any]]:
    """Parse a BOM file (CSV or Excel) and return a list of item dicts.

    Auto-detects columns based on header names.

    Args:
        file_path: Path to the BOM file.

    Returns:
        List of dicts with keys matching BOMItem fields.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext in (".xlsx", ".xls"):
        return _parse_excel(file_path)
    elif ext in (".csv", ".tsv"):
        return _parse_csv(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}. Use CSV or Excel.")
