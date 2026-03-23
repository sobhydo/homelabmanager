"""
Pick & Place file converter service.

Converts P&P CSV files from EasyEDA, Eagle, KiCad, and Altium
into YY1 pick-and-place machine format, with coordinate calibration.
"""

import csv
import io
import math
from typing import Optional


# ---------------------------------------------------------------------------
# Header signatures used for auto-detection
# ---------------------------------------------------------------------------

_EASYEDA_HEADERS = {"designator", "mid x", "mid y", "rotation", "comment", "footprint", "layer"}
_KICAD_HEADERS = {"ref", "val", "package", "posx", "posy", "rot", "side"}
_EAGLE_HEADERS = {"part", "value", "package", "x", "y", "angle", "layer"}
_ALTIUM_REQUIRED = {"designator", "comment", "layer", "footprint", "rotation"}
_ALTIUM_XY_VARIANTS = [
    {"center-x(mm)", "center-y(mm)"},
    {"center-x", "center-y"},
    {"mid x", "mid y"},
]


def _normalise_header(h: str | None) -> str:
    """Lower-case, strip whitespace, quotes, and BOM characters."""
    if not h:
        return ""
    return h.strip().strip("\ufeff").strip('"').strip("'").strip().lower()


# ---------------------------------------------------------------------------
# 1. detect_format
# ---------------------------------------------------------------------------

def detect_format(headers: list[str]) -> str:
    """Auto-detect which EDA tool generated the CSV by matching column headers.

    Returns one of: "easyeda", "kicad", "eagle", "altium", "generic".
    Raises ValueError if the headers are completely unrecognisable.
    """
    norm = {_normalise_header(h) for h in headers}

    # EasyEDA
    if _EASYEDA_HEADERS.issubset(norm):
        return "easyeda"

    # KiCad
    if _KICAD_HEADERS.issubset(norm):
        return "kicad"

    # Eagle
    if _EAGLE_HEADERS.issubset(norm):
        return "eagle"

    # Altium — requires core columns + one of the XY variants
    if _ALTIUM_REQUIRED.issubset(norm):
        for xy in _ALTIUM_XY_VARIANTS:
            if xy.issubset(norm):
                return "altium"

    # Generic fallback — look for any x/y/rotation-like columns
    has_x = any("x" in h for h in norm)
    has_y = any("y" in h for h in norm)
    has_rot = any(k in h for h in norm for k in ("rot", "angle", "orientation"))
    if has_x and has_y:
        return "generic"

    raise ValueError(
        f"Unable to detect P&P format from headers: {headers}"
    )


# ---------------------------------------------------------------------------
# Internal helpers for parsing each format
# ---------------------------------------------------------------------------

def _find_header(row: dict, *candidates: str) -> Optional[str]:
    """Return the value from *row* for the first matching candidate key (case-insensitive)."""
    norm_map = {_normalise_header(k): k for k in row if k is not None}
    for c in candidates:
        real_key = norm_map.get(c.lower())
        if real_key is not None:
            val = row[real_key]
            if val is not None:
                # Strip surrounding quotes that some tools leave
                val = val.strip().strip('"').strip("'").strip()
            return val
    return None


def _parse_coord(value: str) -> float:
    """Parse a coordinate string to float, handling mil→mm conversion and quotes."""
    value = value.strip().strip('"').strip("'").strip()
    value = value.replace(",", ".")
    if value.lower().endswith("mil"):
        return float(value[:-3].strip()) * 0.0254
    if value.lower().endswith("mm"):
        return float(value[:-2].strip())
    return float(value)


def _normalise_side(raw: Optional[str]) -> str:
    """Normalise layer/side strings to 'top' or 'bottom'."""
    if raw is None:
        return "top"
    raw = raw.strip().lower()
    if raw in ("top", "t", "1", "toplayer", "top layer", "f.cu", "front"):
        return "top"
    if raw in ("bottom", "bot", "b", "2", "bottomlayer", "bottom layer", "b.cu", "back"):
        return "bottom"
    return "top"


def _normalise_rotation(deg: float) -> float:
    """Normalise rotation to 0-360 range."""
    deg = deg % 360
    if deg < 0:
        deg += 360
    return deg


def _parse_row_easyeda(row: dict) -> dict:
    return {
        "designator": (_find_header(row, "designator") or "").strip(),
        "value": (_find_header(row, "comment", "value") or "").strip(),
        "package": (_find_header(row, "footprint", "package") or "").strip(),
        "x": _parse_coord(_find_header(row, "mid x") or "0"),
        "y": _parse_coord(_find_header(row, "mid y") or "0"),
        "rotation": _normalise_rotation(float(_find_header(row, "rotation") or "0")),
        "side": _normalise_side(_find_header(row, "layer")),
    }


def _parse_row_kicad(row: dict) -> dict:
    return {
        "designator": (_find_header(row, "ref") or "").strip(),
        "value": (_find_header(row, "val") or "").strip(),
        "package": (_find_header(row, "package") or "").strip(),
        "x": _parse_coord(_find_header(row, "posx") or "0"),
        "y": _parse_coord(_find_header(row, "posy") or "0"),
        "rotation": _normalise_rotation(float(_find_header(row, "rot") or "0")),
        "side": _normalise_side(_find_header(row, "side")),
    }


def _parse_row_eagle(row: dict) -> dict:
    return {
        "designator": (_find_header(row, "part") or "").strip(),
        "value": (_find_header(row, "value") or "").strip(),
        "package": (_find_header(row, "package") or "").strip(),
        "x": _parse_coord(_find_header(row, "x") or "0"),
        "y": _parse_coord(_find_header(row, "y") or "0"),
        "rotation": _normalise_rotation(float(_find_header(row, "angle") or "0")),
        "side": _normalise_side(_find_header(row, "layer")),
    }


def _parse_row_altium(row: dict) -> dict:
    x_raw = _find_header(row, "center-x(mm)", "center-x", "mid x") or "0"
    y_raw = _find_header(row, "center-y(mm)", "center-y", "mid y") or "0"
    return {
        "designator": (_find_header(row, "designator") or "").strip(),
        "value": (_find_header(row, "comment", "value") or "").strip(),
        "package": (_find_header(row, "footprint", "package") or "").strip(),
        "x": _parse_coord(x_raw),
        "y": _parse_coord(y_raw),
        "rotation": _normalise_rotation(float(_find_header(row, "rotation") or "0")),
        "side": _normalise_side(_find_header(row, "layer")),
    }


def _parse_row_generic(row: dict) -> dict:
    norm_map = {_normalise_header(k): k for k in row if k is not None}

    # Find x column
    x_key = None
    y_key = None
    rot_key = None
    des_key = None
    val_key = None
    pkg_key = None
    side_key = None

    for nk, rk in norm_map.items():
        if nk in ("x", "posx", "pos x", "mid x", "center-x", "center-x(mm)"):
            x_key = rk
        elif nk in ("y", "posy", "pos y", "mid y", "center-y", "center-y(mm)"):
            y_key = rk
        elif any(k in nk for k in ("rot", "angle", "orientation")):
            rot_key = rk
        elif nk in ("designator", "ref", "refdes", "part", "reference"):
            des_key = rk
        elif nk in ("value", "val", "comment"):
            val_key = rk
        elif nk in ("package", "footprint", "pattern"):
            pkg_key = rk
        elif nk in ("side", "layer"):
            side_key = rk

    return {
        "designator": (row.get(des_key, "") if des_key else "").strip(),
        "value": (row.get(val_key, "") if val_key else "").strip(),
        "package": (row.get(pkg_key, "") if pkg_key else "").strip(),
        "x": _parse_coord(row.get(x_key, "0") if x_key else "0"),
        "y": _parse_coord(row.get(y_key, "0") if y_key else "0"),
        "rotation": _normalise_rotation(float(row.get(rot_key, "0") if rot_key else "0")),
        "side": _normalise_side(row.get(side_key) if side_key else None),
    }


_ROW_PARSERS = {
    "easyeda": _parse_row_easyeda,
    "kicad": _parse_row_kicad,
    "eagle": _parse_row_eagle,
    "altium": _parse_row_altium,
    "generic": _parse_row_generic,
}


# ---------------------------------------------------------------------------
# 2. parse_pnp_file
# ---------------------------------------------------------------------------

def _sniff_delimiter(content: str) -> str:
    """Try to detect the CSV delimiter using csv.Sniffer, falling back to common delimiters."""
    # Take a sample of the content for sniffing
    sample = content[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",\t;")
        return dialect.delimiter
    except csv.Error:
        pass

    # Manual fallback: pick whichever of , \t ; appears most in the first line
    first_line = sample.split("\n", 1)[0]
    counts = {d: first_line.count(d) for d in [",", "\t", ";"]}
    best = max(counts, key=counts.get)  # type: ignore[arg-type]
    return best if counts[best] > 0 else ","


def parse_pnp_file(content: str, filename: str) -> dict:
    """Parse a P&P CSV and return a normalised structure."""
    # Strip BOM
    if content.startswith("\ufeff"):
        content = content[1:]

    # Normalise line endings — csv module chokes on mixed \r\n / \r
    content = content.replace("\r\n", "\n").replace("\r", "\n")

    content = content.strip()
    if not content:
        raise ValueError("Empty file content")

    delimiter = _sniff_delimiter(content)

    reader = csv.DictReader(io.StringIO(content), delimiter=delimiter)
    if reader.fieldnames is None:
        raise ValueError("Could not read CSV headers")

    headers = [h for h in reader.fieldnames if h is not None]
    fmt = detect_format(headers)
    row_parser = _ROW_PARSERS[fmt]

    components: list[dict] = []
    for row in reader:
        # Skip empty rows
        if all(not v or not v.strip() for v in row.values()):
            continue
        try:
            comp = row_parser(row)
            components.append(comp)
        except (ValueError, TypeError):
            # Skip unparseable rows
            continue

    if not components:
        raise ValueError("No valid components found in file")

    xs = [c["x"] for c in components]
    ys = [c["y"] for c in components]

    top_count = sum(1 for c in components if c["side"] == "top")
    bottom_count = sum(1 for c in components if c["side"] == "bottom")

    return {
        "format": fmt,
        "components": components,
        "bounds": {
            "min_x": min(xs),
            "min_y": min(ys),
            "max_x": max(xs),
            "max_y": max(ys),
        },
        "total_count": len(components),
        "top_count": top_count,
        "bottom_count": bottom_count,
    }


# ---------------------------------------------------------------------------
# 3. shift_to_origin
# ---------------------------------------------------------------------------

def shift_to_origin(components: list[dict]) -> list[dict]:
    """Shift all coordinates so the bottom-left corner = (0, 0)."""
    if not components:
        return components

    min_x = min(c["x"] for c in components)
    min_y = min(c["y"] for c in components)

    return [
        {**c, "x": c["x"] - min_x, "y": c["y"] - min_y}
        for c in components
    ]


# ---------------------------------------------------------------------------
# 4. apply_calibration
# ---------------------------------------------------------------------------

def _det3(m: list[list[float]]) -> float:
    """Determinant of a 3x3 matrix."""
    return (
        m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
        - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
        + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
    )


def _solve3(mat: list[list[float]], rhs: list[float]) -> list[float]:
    """Solve a 3x3 linear system via Cramer's rule."""
    d = _det3(mat)
    if abs(d) < 1e-12:
        raise ValueError("Singular matrix — reference points may be collinear")
    results = []
    for col in range(3):
        m = [row[:] for row in mat]
        for row_idx in range(3):
            m[row_idx][col] = rhs[row_idx]
        results.append(_det3(m) / d)
    return results


def _solve_affine(
    file_points: list[dict], machine_points: list[dict]
) -> tuple[float, float, float, float, float, float]:
    """Solve the full 6-parameter affine transform.

    machine_X = a·eda_X + b·eda_Y + tx
    machine_Y = c·eda_X + d·eda_Y + ty

    For N=2: similarity (rigid rotation + uniform scale + translation).
    For N=3: exact affine (anisotropic scale + shear).
    For N≥4: least-squares best-fit affine.

    Returns (a, b, tx, c, d, ty).
    """
    n = len(file_points)

    if n == 2:
        # Similarity transform: 4 unknowns (a, b, tx, ty)
        # Constraints: d=a, c=-b (uniform scale, no shear)
        fx1, fy1 = file_points[0]["x"], file_points[0]["y"]
        fx2, fy2 = file_points[1]["x"], file_points[1]["y"]
        mx1, my1 = machine_points[0]["x"], machine_points[0]["y"]
        mx2, my2 = machine_points[1]["x"], machine_points[1]["y"]

        dfx, dfy = fx2 - fx1, fy2 - fy1
        dmx, dmy = mx2 - mx1, my2 - my1

        denom = dfx * dfx + dfy * dfy
        if denom < 1e-12:
            raise ValueError(
                "File reference points are identical — cannot compute transform"
            )

        a = (dfx * dmx + dfy * dmy) / denom
        b_param = (dfy * dmx - dfx * dmy) / denom  # note: b for X row

        tx = mx1 - a * fx1 - b_param * fy1
        ty = my1 + b_param * fx1 - a * fy1

        # Map to general affine: x' = a*x + b*y + tx, y' = c*x + d*y + ty
        # Similarity: c = -b_param, d = a  (but let's verify the sign convention)
        # x' = a*x + b_param*y + tx
        # y' = -b_param*x + a*y + ty
        return (a, b_param, tx, -b_param, a, ty)

    # General case: N≥3  —  least squares via normal equations
    # A = [[x_i, y_i, 1], ...], solve (AᵀA)·params = Aᵀ·b
    s_xx = sum(fp["x"] ** 2 for fp in file_points)
    s_yy = sum(fp["y"] ** 2 for fp in file_points)
    s_xy = sum(fp["x"] * fp["y"] for fp in file_points)
    s_x = sum(fp["x"] for fp in file_points)
    s_y = sum(fp["y"] for fp in file_points)

    ata = [
        [s_xx, s_xy, s_x],
        [s_xy, s_yy, s_y],
        [s_x, s_y, float(n)],
    ]

    atbx = [
        sum(fp["x"] * mp["x"] for fp, mp in zip(file_points, machine_points)),
        sum(fp["y"] * mp["x"] for fp, mp in zip(file_points, machine_points)),
        sum(mp["x"] for mp in machine_points),
    ]
    atby = [
        sum(fp["x"] * mp["y"] for fp, mp in zip(file_points, machine_points)),
        sum(fp["y"] * mp["y"] for fp, mp in zip(file_points, machine_points)),
        sum(mp["y"] for mp in machine_points),
    ]

    a, b, tx = _solve3(ata, atbx)
    c, d, ty = _solve3(ata, atby)

    return (a, b, tx, c, d, ty)


def apply_calibration(
    components: list[dict],
    file_points: list[dict],
    machine_points: list[dict],
) -> list[dict]:
    """Apply affine transformation to all components.

    machine_X = a·eda_X + b·eda_Y + tx
    machine_Y = c·eda_X + d·eda_Y + ty

    Rotation offset derived from matrix: atan2(c, a).
    Component rotation normalised to -180..180 for YY1.
    """
    if len(file_points) != len(machine_points):
        raise ValueError("file_points and machine_points must have the same length")
    if len(file_points) < 2:
        raise ValueError("At least 2 reference points are required")

    a, b, tx, c, d, ty = _solve_affine(file_points, machine_points)
    rotation_deg = math.degrees(math.atan2(c, a))

    result = []
    for comp in components:
        nx = a * comp["x"] + b * comp["y"] + tx
        ny = c * comp["x"] + d * comp["y"] + ty
        new_rot = (comp["rotation"] + rotation_deg) % 360
        if new_rot > 180:
            new_rot -= 360
        result.append({**comp, "x": nx, "y": ny, "rotation": round(new_rot, 4)})

    return result


def get_calibration_info(
    file_points: list[dict],
    machine_points: list[dict],
) -> dict:
    """Compute transform parameters and quality metrics.

    Returns:
        rotation_deg, scale_x, scale_y, offset_x, offset_y,
        rms_error, per_point_residuals, warnings
    """
    a, b, tx, c, d, ty = _solve_affine(file_points, machine_points)

    rotation_deg = math.degrees(math.atan2(c, a))
    scale_x = math.sqrt(a * a + c * c)
    scale_y = math.sqrt(b * b + d * d)

    # Compute per-point residuals
    residuals: list[dict] = []
    sum_sq = 0.0
    for fp, mp in zip(file_points, machine_points):
        pred_x = a * fp["x"] + b * fp["y"] + tx
        pred_y = c * fp["x"] + d * fp["y"] + ty
        err = math.sqrt((pred_x - mp["x"]) ** 2 + (pred_y - mp["y"]) ** 2)
        sum_sq += err * err
        residuals.append({
            "file_x": fp["x"],
            "file_y": fp["y"],
            "machine_x": mp["x"],
            "machine_y": mp["y"],
            "predicted_x": round(pred_x, 4),
            "predicted_y": round(pred_y, 4),
            "error_mm": round(err, 4),
        })

    rms_error = math.sqrt(sum_sq / len(file_points))

    # Warnings
    warnings: list[str] = []
    if rms_error > 0.05:
        warnings.append(f"RMS error is {rms_error:.3f}mm — consider rechecking measurements")
    for i, r in enumerate(residuals):
        if r["error_mm"] > 0.2:
            warnings.append(f"Point {i + 1} has high error ({r['error_mm']:.3f}mm) — may be mismeasured")

    return {
        "rotation_deg": round(rotation_deg, 4),
        "scale_x": round(scale_x, 6),
        "scale_y": round(scale_y, 6),
        "offset_x": round(tx, 4),
        "offset_y": round(ty, 4),
        "rms_error": round(rms_error, 4),
        "residuals": residuals,
        "warnings": warnings,
        "matrix": {"a": round(a, 6), "b": round(b, 6), "c": round(c, 6), "d": round(d, 6), "tx": round(tx, 4), "ty": round(ty, 4)},
    }


# ---------------------------------------------------------------------------
# 5. generate_yy1_csv
# ---------------------------------------------------------------------------

def generate_yy1_csv(components: list[dict], side_filter: str = "all") -> str:
    """Generate YY1 pick-and-place machine format CSV.

    Columns: Designator, Val, Package, Mid X(mm), Mid Y(mm), Rotation, Layer
    """
    filtered = components
    if side_filter == "top":
        filtered = [c for c in components if c["side"] == "top"]
    elif side_filter == "bottom":
        filtered = [c for c in components if c["side"] == "bottom"]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Designator", "Val", "Package", "Mid X(mm)", "Mid Y(mm)", "Rotation", "Layer"])

    for comp in filtered:
        rot = _normalise_rotation(comp["rotation"])
        layer = "T" if comp["side"] == "top" else "B"
        writer.writerow([
            comp["designator"],
            comp.get("value", ""),
            comp.get("package", ""),
            f"{comp['x']:.4f}",
            f"{comp['y']:.4f}",
            f"{rot:.4f}",
            layer,
        ])

    return output.getvalue()


# ---------------------------------------------------------------------------
# 6. generate_summary
# ---------------------------------------------------------------------------

def generate_summary(components: list[dict]) -> dict:
    """Return a summary of the component list."""
    top = sum(1 for c in components if c["side"] == "top")
    bottom = sum(1 for c in components if c["side"] == "bottom")

    packages: dict[str, int] = {}
    values_set: set[str] = set()

    for c in components:
        pkg = c.get("package", "")
        val = c.get("value", "")
        if pkg:
            packages[pkg] = packages.get(pkg, 0) + 1
        if val:
            values_set.add(val)

    return {
        "total": len(components),
        "top": top,
        "bottom": bottom,
        "unique_packages": sorted(packages.keys()),
        "unique_values": sorted(values_set),
        "package_counts": packages,
    }
