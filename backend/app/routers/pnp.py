"""Router for Pick & Place file conversion endpoints."""

import io
import json
from typing import Optional

import anthropic
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_settings
from app.models.feeder import Feeder
from app.schemas.pnp import (
    CalibrateRequest,
    CalibrateResponse,
    ExportRequest,
    PnPParseResponse,
)
from app.services.pnp_converter import (
    apply_calibration,
    generate_summary,
    generate_yy1_csv,
    get_calibration_info,
    parse_pnp_file,
    shift_to_origin,
)

router = APIRouter(prefix="/pnp", tags=["Pick & Place"])


@router.post("/parse", response_model=PnPParseResponse)
async def parse_pnp(file: UploadFile = File(...)):
    """Upload a P&P CSV file, auto-detect format, parse, and shift to origin."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    raw_bytes = await file.read()

    # Detect encoding: UTF-16 LE/BE, UTF-8 BOM, UTF-8, Latin-1
    content = None
    if raw_bytes[:2] in (b"\xff\xfe", b"\xfe\xff"):
        # UTF-16 LE or BE
        content = raw_bytes.decode("utf-16")
    elif raw_bytes[:3] == b"\xef\xbb\xbf":
        content = raw_bytes.decode("utf-8-sig")
    else:
        try:
            content = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content = raw_bytes.decode("latin-1")

    try:
        result = parse_pnp_file(content, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Shift to origin
    result["components"] = shift_to_origin(result["components"])

    # Recalculate bounds after shifting
    if result["components"]:
        xs = [c["x"] for c in result["components"]]
        ys = [c["y"] for c in result["components"]]
        result["bounds"] = {
            "min_x": min(xs),
            "min_y": min(ys),
            "max_x": max(xs),
            "max_y": max(ys),
        }

    return result


@router.post("/calibrate", response_model=CalibrateResponse)
async def calibrate(request: CalibrateRequest):
    """Apply calibration transform using reference points."""
    if len(request.file_points) != len(request.machine_points):
        raise HTTPException(
            status_code=400,
            detail="file_points and machine_points must have the same length",
        )
    if len(request.file_points) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 reference points are required",
        )

    components_dicts = [c.model_dump() for c in request.components]
    fp = [p.model_dump() for p in request.file_points]
    mp = [p.model_dump() for p in request.machine_points]

    try:
        calibrated = apply_calibration(components_dicts, fp, mp)
        transform_info = get_calibration_info(fp, mp)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return CalibrateResponse(components=calibrated, transform=transform_info)


@router.post("/export")
async def export_yy1(request: ExportRequest):
    """Generate YY1 CSV for download."""
    components_dicts = [c.model_dump() for c in request.components]
    csv_content = generate_yy1_csv(components_dicts, request.side_filter)

    return StreamingResponse(
        io.BytesIO(csv_content.encode("utf-8")),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="pnp_yy1_output.csv"',
        },
    )


@router.get("/formats")
async def list_formats():
    """Return list of supported P&P formats."""
    return {"formats": ["easyeda", "kicad", "eagle", "altium"]}


# ── AI Feeder Matching ───────────────────────────────────────────────────


class PnPComponentInput(BaseModel):
    designator: str
    value: Optional[str] = None
    package: Optional[str] = None


class FeederMatchRequest(BaseModel):
    machine_id: int
    components: list[PnPComponentInput]


class FeederMatchResult(BaseModel):
    designator: str
    feeder_slot: Optional[int] = None
    head: int = 0
    mount_speed: int = 100
    confidence: str = "none"  # "high", "medium", "low", "none"
    reason: Optional[str] = None


class FeederMatchResponse(BaseModel):
    matches: list[FeederMatchResult]
    matched_count: int
    total_count: int


class AsciiConvertItem(BaseModel):
    designator: str
    value: Optional[str] = None
    package: Optional[str] = None


class AsciiConvertRequest(BaseModel):
    items: list[AsciiConvertItem]


class AsciiConvertResponse(BaseModel):
    items: list[AsciiConvertItem]


@router.post("/ascii-convert", response_model=AsciiConvertResponse)
async def ascii_convert(
    request: AsciiConvertRequest,
    settings=Depends(get_settings),
):
    """Convert non-ASCII component values to ASCII equivalents using AI.

    Handles Chinese, Arabic, Japanese, Korean characters and transliterates
    them into meaningful ASCII text for P&P machine compatibility.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=400, detail="ANTHROPIC_API_KEY not configured")

    items_data = [i.model_dump() for i in request.items]

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": (
                    "Convert these electronic component fields to ASCII-only text. "
                    "Translate Chinese/Japanese/Korean/Arabic text to English. "
                    "Replace Unicode symbols: Ω→ohm, μ→u, ±→+-, °→deg. "
                    "Keep the meaning - e.g. '沉头螺丝' → 'Countersunk Screw', "
                    "'电阻' → 'Resistor'. Return JSON array only, no markdown.\n\n"
                    f"Input:\n{json.dumps(items_data, ensure_ascii=False)}\n\n"
                    "Return same structure with all values converted to ASCII."
                ),
            }
        ],
    )

    response_text = message.content[0].text.strip()
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
        converted = json.loads(response_text)
        return AsciiConvertResponse(items=[AsciiConvertItem(**i) for i in converted])
    except (json.JSONDecodeError, Exception):
        # Fallback: strip non-ASCII
        import re
        fallback = []
        for item in request.items:
            fallback.append(AsciiConvertItem(
                designator=re.sub(r'[^\x00-\x7F]', '', item.designator),
                value=re.sub(r'[^\x00-\x7F]', '', item.value or '') if item.value else item.value,
                package=re.sub(r'[^\x00-\x7F]', '', item.package or '') if item.package else item.package,
            ))
        return AsciiConvertResponse(items=fallback)


@router.post("/ai-feeder-match", response_model=FeederMatchResponse)
async def ai_feeder_match(
    request: FeederMatchRequest,
    db: Session = Depends(get_db),
    settings=Depends(get_settings),
):
    """Use AI to match PnP components to machine feeder slots.

    Compares component value/footprint from the PnP file against the
    feeder configuration to find the best slot for each component.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=400, detail="ANTHROPIC_API_KEY not configured")

    # Load feeders for this machine
    feeders = (
        db.query(Feeder)
        .filter(Feeder.machine_id == request.machine_id)
        .order_by(Feeder.slot_number)
        .all()
    )
    if not feeders:
        raise HTTPException(status_code=400, detail="No feeders configured for this machine")

    # Build feeder list for AI
    feeder_list = []
    for f in feeders:
        feeder_list.append({
            "slot": f.slot_number,
            "value": f.component_value,
            "package": f.component_package,
            "part_number": f.part_number,
            "supplier_part_number": f.supplier_part_number,
            "head": f.head,
            "mount_speed": f.mount_speed,
        })

    # Get unique component values to reduce AI tokens
    unique_components: dict[str, list[str]] = {}  # "value|package" -> [designators]
    for c in request.components:
        key = f"{c.value or ''}|{c.package or ''}"
        unique_components.setdefault(key, []).append(c.designator)

    compact_components = []
    for key, designators in unique_components.items():
        value, package = key.split("|", 1)
        compact_components.append({
            "value": value or None,
            "package": package or None,
            "designators": designators,
        })

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": (
                    "You are an electronics Pick & Place machine expert.\n\n"
                    "Match each PnP component to the correct feeder slot based on value and footprint/package.\n\n"
                    "FEEDER CONFIGURATION:\n"
                    f"{json.dumps(feeder_list, ensure_ascii=False)}\n\n"
                    "PNP COMPONENTS TO MATCH:\n"
                    f"{json.dumps(compact_components, ensure_ascii=False)}\n\n"
                    "MATCHING RULES:\n"
                    "- Match by component value (e.g. '100nF' matches '100nF 0402 X7R 16V')\n"
                    "- Match by package/footprint when value is ambiguous\n"
                    "- PnP values are shorthand: '10k' = '10kΩ', '100n' = '100nF', '1u' = '1uF'\n"
                    "- Common abbreviations: 'C' prefix = capacitor, 'R' = resistor, 'L' = inductor, 'U' = IC\n"
                    "- Package names may differ: '0402' matches '0402', 'SOT23' matches 'SOT-23'\n"
                    "- If a component clearly matches a feeder, confidence is 'high'\n"
                    "- If the match is plausible but uncertain, confidence is 'medium'\n"
                    "- If no good match, feeder_slot should be null\n\n"
                    "Return JSON array only (no markdown):\n"
                    "[\n"
                    '  {"value": "100nF", "package": "0402", "feeder_slot": 5, "confidence": "high", "reason": "100nF matches feeder slot 5 value"}\n'
                    "]\n"
                    "One entry per unique component group. Include ALL groups even if no match."
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
        ai_matches: list[dict] = json.loads(response_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    # Build a lookup from AI results: "value|package" -> match info
    ai_lookup: dict[str, dict] = {}
    for m in ai_matches:
        key = f"{m.get('value') or ''}|{m.get('package') or ''}"
        ai_lookup[key] = m

    # Build feeder lookup for head/speed
    feeder_by_slot: dict[int, Feeder] = {f.slot_number: f for f in feeders}

    # Expand to all designators
    results: list[FeederMatchResult] = []
    matched_count = 0

    for c in request.components:
        key = f"{c.value or ''}|{c.package or ''}"
        ai_match = ai_lookup.get(key, {})
        slot = ai_match.get("feeder_slot")
        confidence = ai_match.get("confidence", "none")
        reason = ai_match.get("reason")

        head = 0
        mount_speed = 100
        if slot and slot in feeder_by_slot:
            f = feeder_by_slot[slot]
            head = f.head
            mount_speed = f.mount_speed
            matched_count += 1
        else:
            slot = None
            if confidence != "none":
                confidence = "none"

        results.append(FeederMatchResult(
            designator=c.designator,
            feeder_slot=slot,
            head=head,
            mount_speed=mount_speed,
            confidence=confidence,
            reason=reason,
        ))

    return FeederMatchResponse(
        matches=results,
        matched_count=matched_count,
        total_count=len(request.components),
    )
