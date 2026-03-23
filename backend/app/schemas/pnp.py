"""Pydantic schemas for the Pick & Place converter."""

from pydantic import BaseModel


class PnPComponent(BaseModel):
    designator: str
    value: str | None = None
    package: str | None = None
    x: float
    y: float
    rotation: float = 0.0
    side: str = "top"


class PnPParseResponse(BaseModel):
    format: str
    components: list[PnPComponent]
    bounds: dict
    total_count: int
    top_count: int
    bottom_count: int


class CalibrationPoint(BaseModel):
    x: float
    y: float


class CalibrateRequest(BaseModel):
    components: list[PnPComponent]
    file_points: list[CalibrationPoint]
    machine_points: list[CalibrationPoint]


class CalibrateResponse(BaseModel):
    components: list[PnPComponent]
    transform: dict  # {"rotation_deg": float, "scale": float, "offset_x": float, "offset_y": float}


class ExportRequest(BaseModel):
    components: list[PnPComponent]
    side_filter: str = "all"  # "top", "bottom", "all"


class PnPSummary(BaseModel):
    total: int
    top: int
    bottom: int
    unique_packages: list[str]
    unique_values: list[str]
    package_counts: dict[str, int]
