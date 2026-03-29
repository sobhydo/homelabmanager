"""Use Claude AI to enrich parsed invoice/CSV items with better component data."""

import json
from typing import Any

import anthropic


async def enrich_invoice_items(
    items: list[dict[str, Any]],
    api_key: str,
    available_footprints: list[str] | None = None,
    available_categories: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Enrich parsed invoice items using Claude AI.

    Takes raw parsed items (from CSV or PDF) and returns enriched items with:
    - Short, readable component names
    - Full descriptions
    - Correct category assignment
    - Footprint matching from available footprints
    - Package type normalization

    Args:
        items: List of parsed item dicts.
        api_key: Anthropic API key.
        available_footprints: List of footprint names in the DB.
        available_categories: List of category names in the DB.

    Returns:
        The same items list, enriched with additional fields.
    """
    if not api_key or not items:
        return items

    # Build a compact representation for the AI
    compact_items = []
    for i, item in enumerate(items):
        compact_items.append({
            "idx": i,
            "mpn": item.get("part_number"),
            "spn": item.get("supplier_part_number") or item.get("lcsc_part_number"),
            "desc": item.get("description", ""),
            "mfr": item.get("manufacturer"),
            "pkg": item.get("suggested_package") or item.get("package"),
            "cat": item.get("suggested_category"),
        })

    footprints_str = ", ".join(available_footprints) if available_footprints else "0201, 0402, 0603, 0805, 1206, SOT-23, SOT-23-5, SOIC-8, SOIC-16, QFN-20, QFP-48, TQFP-32, DIP-8, DIP-16, SMA, USB-C"
    categories_str = ", ".join(available_categories) if available_categories else "Resistors, Capacitors, Inductors, Semiconductors, ICs, Connectors, Electromechanical, Passives - Other"

    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8192,
        messages=[
            {
                "role": "user",
                "content": (
                    "You are an electronics component expert. For each item below, return enriched data as a JSON array.\n\n"
                    f"Available footprints in the database: {footprints_str}\n"
                    f"Available categories: {categories_str}\n\n"
                    "For each item, return:\n"
                    '- "idx": the original index (pass through)\n'
                    '- "name": a SHORT concise component name (e.g. "100nF 0402 X7R 16V", "ESP32-C5-WROOM-1 N16R8", '
                    '"10kΩ 0402 1%", "AO3401A P-MOSFET SOT-23"). For passives: value + package + key spec. '
                    "For ICs: part number + key function. Max 60 chars.\n"
                    '- "description": full technical description with all specs, value, tolerance, voltage, package, etc.\n'
                    '- "category": the BEST matching category from the available list\n'
                    '- "footprint": the BEST matching footprint from the available list, or null if no good match\n'
                    '- "package": normalized package/footprint string (e.g. "0402", "SOT-23-5", "QFN-20")\n\n'
                    "Return JSON array only, no markdown, no explanation.\n\n"
                    f"Items:\n{json.dumps(compact_items, ensure_ascii=False)}"
                ),
            }
        ],
    )

    response_text = message.content[0].text.strip()

    # Handle markdown wrapping
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        json_lines = []
        in_block = False
        for line in lines:
            if line.startswith("```") and not in_block:
                in_block = True
                continue
            elif line.startswith("```") and in_block:
                break
            elif in_block:
                json_lines.append(line)
        response_text = "\n".join(json_lines)

    try:
        enriched: list[dict[str, Any]] = json.loads(response_text)
    except json.JSONDecodeError:
        return items  # fallback: return original items

    # Merge enriched data back into original items
    enriched_by_idx = {e["idx"]: e for e in enriched if "idx" in e}

    for i, item in enumerate(items):
        e = enriched_by_idx.get(i)
        if not e:
            continue

        if e.get("name"):
            item["name"] = e["name"]
        if e.get("description"):
            item["description"] = e["description"]
        if e.get("category"):
            item["suggested_category"] = e["category"]
        if e.get("footprint"):
            item["footprint"] = e["footprint"]
        if e.get("package"):
            item["suggested_package"] = e["package"]

    return items
