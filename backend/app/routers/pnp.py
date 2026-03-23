"""Router for Pick & Place file conversion endpoints."""

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

import io

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
