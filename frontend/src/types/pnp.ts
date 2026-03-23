export interface PnPComponent {
  designator: string;
  value: string | null;
  package: string | null;
  x: number;
  y: number;
  rotation: number;
  side: string;
}

export interface PnPParseResponse {
  format: string;
  components: PnPComponent[];
  bounds: { min_x: number; min_y: number; max_x: number; max_y: number };
  total_count: number;
  top_count: number;
  bottom_count: number;
}

export interface CalibrationResidual {
  file_x: number;
  file_y: number;
  machine_x: number;
  machine_y: number;
  predicted_x: number;
  predicted_y: number;
  error_mm: number;
}

export interface TransformInfo {
  rotation_deg: number;
  scale_x: number;
  scale_y: number;
  offset_x: number;
  offset_y: number;
  rms_error: number;
  residuals: CalibrationResidual[];
  warnings: string[];
  matrix: { a: number; b: number; c: number; d: number; tx: number; ty: number };
}

export interface CalibrateResponse {
  components: PnPComponent[];
  transform: TransformInfo;
}
