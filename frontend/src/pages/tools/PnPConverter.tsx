import { useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  CheckIcon,
  TrashIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  SparklesIcon,
  BookmarkIcon,
  FolderOpenIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import apiClient from "../../api/client";
import FileUpload from "../../components/ui/FileUpload";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";
import DataTable, { type Column } from "../../components/ui/table";
import type {
  PnPComponent,
  PnPParseResponse,
  CalibrateResponse,
  TransformInfo,
} from "../../types/pnp";
import {
  useSavedFiles,
  useUploadSavedFile,
  useReplaceSavedFile,
  useDeleteSavedFile,
} from "../../api/saved-files";
import { useFeeders } from "../../api/feeders";
import { useMachines } from "../../api/machines";
import type { Feeder } from "../../types/feeder";

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------
const STEPS = [
  { num: 1, label: "Upload" },
  { num: 2, label: "Preview" },
  { num: 3, label: "Calibrate" },
  { num: 4, label: "Export" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s, idx) => {
        const isCompleted = s.num < current;
        const isActive = s.num === current;
        const isUpcoming = s.num > current;

        return (
          <div key={s.num} className="flex items-center">
            {/* Connecting line before (except first) */}
            {idx > 0 && (
              <div
                className={`h-0.5 w-10 sm:w-16 ${
                  isCompleted || isActive ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  s.num
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isUpcoming ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board map visualization with rotation, mirror & calibration highlighting
// ---------------------------------------------------------------------------
// Side colors: top = blue, bottom = green
const SIDE_COLOR_TOP = "hsl(210 100% 60%)";
const SIDE_COLOR_BOTTOM = "hsl(150 80% 45%)";
const CALIBRATION_COLOR = "hsl(30 100% 50%)";

function sideColor(side: string) {
  return side.toLowerCase() === "bottom" ? SIDE_COLOR_BOTTOM : SIDE_COLOR_TOP;
}

function BoardMap({
  components,
  highlightedDesignators,
  calibrationDesignators,
  onClickComponent,
  rotation = 0,
  mirrorX = false,
  mirrorY = false,
  layerFilter = "all",
  width = 400,
  height = 300,
}: {
  components: PnPComponent[];
  highlightedDesignators: Set<string>;
  calibrationDesignators?: Set<string>;
  onClickComponent?: (designator: string) => void;
  rotation?: number; // 0, 90, 180, 270
  mirrorX?: boolean;
  mirrorY?: boolean;
  layerFilter?: "all" | "top" | "bottom";
  width?: number;
  height?: number;
}) {
  if (components.length === 0) return null;

  // Filter by layer
  const visible = layerFilter === "all"
    ? components
    : components.filter((c) => c.side.toLowerCase() === layerFilter);

  // Apply rotation + mirror to coordinates for display
  const rad = (rotation * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  const transformed = visible.map((c) => {
    let tx = c.x * cosR - c.y * sinR;
    let ty = c.x * sinR + c.y * cosR;
    if (mirrorX) tx = -tx;
    if (mirrorY) ty = -ty;
    return { ...c, tx, ty };
  });

  if (transformed.length === 0) return null;

  const xs = transformed.map((c) => c.tx);
  const ys = transformed.map((c) => c.ty);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const pad = 30;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const scale = Math.min(innerW / rangeX, innerH / rangeY);

  function toSvg(tx: number, ty: number) {
    return {
      sx: pad + (tx - minX) * scale,
      sy: pad + (maxY - ty) * scale, // flip Y for screen coords
    };
  }

  return (
    <svg
      width={width}
      height={height}
      className="bg-card border border-border rounded-lg"
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Board outline */}
      <rect
        x={pad - 5}
        y={pad - 5}
        width={rangeX * scale + 10}
        height={rangeY * scale + 10}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.1}
        strokeWidth={1}
        rx={3}
      />
      {/* Origin marker */}
      {(() => {
        const { sx: ox, sy: oy } = toSvg(minX, Math.min(...ys));
        return (
          <g>
            <line x1={ox} y1={oy} x2={ox + 18} y2={oy} stroke="hsl(var(--destructive))" strokeWidth={1.5} opacity={0.5} />
            <line x1={ox} y1={oy} x2={ox} y2={oy - 18} stroke="hsl(0 130 50)" strokeWidth={1.5} opacity={0.5} />
            <text x={ox + 20} y={oy} fill="hsl(var(--destructive))" fontSize={8} opacity={0.6}>X</text>
            <text x={ox + 2} y={oy - 20} fill="hsl(0 130 50)" fontSize={8} opacity={0.6}>Y</text>
          </g>
        );
      })()}
      {/* Legend */}
      {layerFilter === "all" && (
        <g>
          <circle cx={width - 70} cy={12} r={4} fill={SIDE_COLOR_TOP} />
          <text x={width - 63} y={15} fill={SIDE_COLOR_TOP} fontSize={9}>Top</text>
          <circle cx={width - 35} cy={12} r={4} fill={SIDE_COLOR_BOTTOM} />
          <text x={width - 28} y={15} fill={SIDE_COLOR_BOTTOM} fontSize={9}>Bot</text>
        </g>
      )}
      {/* All components as dots */}
      {transformed.map((c) => {
        const { sx, sy } = toSvg(c.tx, c.ty);
        const isCalibration = calibrationDesignators?.has(c.designator);
        const isHighlighted = highlightedDesignators.has(c.designator);
        const baseSideColor = sideColor(c.side);
        const dotColor = isCalibration
          ? CALIBRATION_COLOR
          : isHighlighted
          ? baseSideColor
          : baseSideColor;
        const r = isCalibration ? 7 : isHighlighted ? 6 : 3;
        return (
          <g
            key={c.designator}
            onClick={() => onClickComponent?.(c.designator)}
            className={onClickComponent ? "cursor-pointer" : ""}
          >
            {isCalibration && (
              <circle
                cx={sx}
                cy={sy}
                r={10}
                fill="none"
                stroke={CALIBRATION_COLOR}
                strokeWidth={2}
                strokeDasharray="3 2"
                opacity={0.6}
              />
            )}
            <circle
              cx={sx}
              cy={sy}
              r={r}
              fill={dotColor}
              fillOpacity={isHighlighted || isCalibration ? 1 : 0.35}
              stroke={isCalibration ? CALIBRATION_COLOR : isHighlighted ? baseSideColor : "none"}
              strokeWidth={isHighlighted || isCalibration ? 2 : 0}
            />
            {(isHighlighted || isCalibration) && (
              <text
                x={sx}
                y={sy - (isCalibration ? 14 : 10)}
                textAnchor="middle"
                fill={isCalibration ? CALIBRATION_COLOR : baseSideColor}
                fontSize={isCalibration ? 11 : 10}
                fontWeight={600}
              >
                {c.designator}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Calibration point type
// ---------------------------------------------------------------------------
interface CalibrationPoint {
  designator: string; // selected component designator
  fileX: string;
  fileY: string;
  fileRotation: string;
  machineX: string;
  machineY: string;
  machineRotation: string;
}

const emptyPoint = (): CalibrationPoint => ({
  designator: "",
  fileX: "",
  fileY: "",
  fileRotation: "",
  machineX: "",
  machineY: "",
  machineRotation: "",
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function PnPConverter() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<PnPParseResponse | null>(null);
  const [components, setComponents] = useState<PnPComponent[]>([]);
  const [calibrationPoints, setCalibrationPoints] = useState<CalibrationPoint[]>([
    emptyPoint(),
    emptyPoint(),
  ]);
  const [calibrated, setCalibrated] = useState(false);
  const [transformInfo, setTransformInfo] = useState<TransformInfo | null>(null);
  const [sideFilter, setSideFilter] = useState<"all" | "top" | "bottom">("all");
  const [loading, setLoading] = useState(false);
  // Per-component YY1 settings: feederNo, skip, head, mountSpeed, pickHeight, placeHeight, mode
  const [componentSettings, setComponentSettings] = useState<
    Record<string, { feederNo: number; skip: boolean; head: number; mountSpeed: number }>
  >({});
  const [showSavedSessions, setShowSavedSessions] = useState(false);
  // CSV calibration: all matched points from uploaded CSV, with selection
  const [csvCalibrationPoints, setCsvCalibrationPoints] = useState<(CalibrationPoint & { selected: boolean })[]>([]);

  // Board orientation for calibration visualization
  const [boardRotation, setBoardRotation] = useState<number>(0); // 0, 90, 180, 270
  const [boardMirrorX, setBoardMirrorX] = useState(false);
  const [boardMirrorY, setBoardMirrorY] = useState(false);
  const [boardLayerFilter, setBoardLayerFilter] = useState<"all" | "top" | "bottom">("all");

  // Feeder configuration
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const { data: machinesData } = useMachines({ page_size: 200 });
  const pnpMachines = (machinesData?.items || []).filter((m) => m.machine_type === "Pick & Place");
  const { data: feedersData } = useFeeders(selectedMachineId ?? undefined);
  const feeders: Feeder[] = feedersData?.items || [];
  const selectedMachine = pnpMachines.find((m) => m.id === selectedMachineId);
  const pcbOriginX = selectedMachine?.pcb_origin_x ?? null;
  const pcbOriginY = selectedMachine?.pcb_origin_y ?? null;
  const hasPcbOrigin = pcbOriginX !== null && pcbOriginY !== null;

  // Saved sessions
  const PNP_CATEGORY = "pnp_session";
  const { data: savedSessions, isLoading: loadingSessions } = useSavedFiles(PNP_CATEGORY);
  const saveMutation = useUploadSavedFile();
  const replaceMutation = useReplaceSavedFile();
  const deleteMutation = useDeleteSavedFile();
  // Tracks which saved session (if any) is currently loaded — used for "Save" (update) vs "Save As New"
  const [loadedSessionId, setLoadedSessionId] = useState<number | null>(null);
  const [loadedSessionName, setLoadedSessionName] = useState<string | null>(null);

  // ---- helpers ----
  const filteredComponents = components.filter((c) => {
    if (sideFilter === "all") return true;
    return c.side.toLowerCase() === sideFilter;
  });

  const uniquePackages = new Set(components.map((c) => c.package).filter(Boolean));

  function getSettings(designator: string) {
    const defaultSpeed = selectedMachine?.default_mount_speed ?? 100;
    return componentSettings[designator] || { feederNo: 1, skip: false, head: 0, mountSpeed: defaultSpeed };
  }

  function updateSettings(designator: string, patch: Partial<{ feederNo: number; skip: boolean; head: number; mountSpeed: number }>) {
    setComponentSettings((prev) => ({
      ...prev,
      [designator]: { ...getSettings(designator), ...patch },
    }));
  }

  // ---- save / load session ----
  interface PnPSession {
    step: number;
    fileName: string;
    parseResult: PnPParseResponse | null;
    components: PnPComponent[];
    calibrationPoints: CalibrationPoint[];
    calibrated: boolean;
    transformInfo: TransformInfo | null;
    sideFilter: "all" | "top" | "bottom";
    componentSettings: Record<string, { feederNo: number; skip: boolean; head: number; mountSpeed: number }>;
    selectedMachineId?: number | null;
  }

  function buildSessionBlob(name: string): File {
    const session: PnPSession = {
      step,
      fileName: file?.name || loadedSessionName || "unknown",
      parseResult,
      components,
      calibrationPoints,
      calibrated,
      transformInfo,
      sideFilter,
      componentSettings,
      selectedMachineId,
    };
    const blob = new Blob([JSON.stringify(session)], { type: "application/json" });
    return new File([blob], `${name}.json`, { type: "application/json" });
  }

  function sessionNotes(): string {
    return `${components.length} components · ${parseResult?.format || "?"} · ${calibrated ? "calibrated" : "uncalibrated"}`;
  }

  // "Save" — updates the currently loaded session if any, otherwise prompts for a new name
  async function handleSaveSession() {
    if (loadedSessionId !== null) {
      const sessionFile = buildSessionBlob(loadedSessionName || "session");
      try {
        await replaceMutation.mutateAsync({
          id: loadedSessionId,
          file: sessionFile,
          notes: sessionNotes(),
        });
        toast.success(`Session "${loadedSessionName}" updated.`);
      } catch {
        // handled by interceptor
      }
      return;
    }
    await handleSaveAsNewSession();
  }

  async function handleSaveAsNewSession() {
    const defaultName = loadedSessionName
      ? `${loadedSessionName} (copy)`
      : file?.name?.replace(/\.[^.]+$/, "") || "session";
    const sessionName = prompt("Name for this P&P session:", defaultName);
    if (!sessionName) return;

    const sessionFile = buildSessionBlob(sessionName);

    try {
      const created = await saveMutation.mutateAsync({
        file: sessionFile,
        name: sessionName,
        category: PNP_CATEGORY,
        notes: sessionNotes(),
      });
      setLoadedSessionId(created.id);
      setLoadedSessionName(sessionName);
      toast.success("Session saved.");
    } catch {
      // handled by interceptor
    }
  }

  async function handleLoadSession(id: number) {
    try {
      // cache-buster — the file on disk may have been replaced by a "Save" while the URL stays the same
      const { data } = await apiClient.get<PnPSession>(
        `/saved-files/${id}/download?t=${Date.now()}`
      );
      setStep(data.step);
      setFile(null); // original File not available, but state is restored
      setParseResult(data.parseResult);
      setComponents(data.components);
      setCalibrationPoints(data.calibrationPoints);
      setCalibrated(data.calibrated);
      setTransformInfo(data.transformInfo);
      setSideFilter(data.sideFilter);
      setComponentSettings(data.componentSettings);
      if (data.selectedMachineId !== undefined) {
        setSelectedMachineId(data.selectedMachineId);
      }
      setShowSavedSessions(false);
      setLoadedSessionId(id);
      const meta = savedSessions?.items?.find((s) => s.id === id);
      setLoadedSessionName(meta?.name ?? null);
      toast.success("Session loaded.");
    } catch {
      toast.error("Failed to load session.");
    }
  }

  async function handleDeleteSession(id: number) {
    if (!confirm("Delete this saved session?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Session deleted.");
    } catch {
      // handled
    }
  }

  // ---- step 1: upload & parse ----
  async function handleFileSelect(files: File[]) {
    const selected = files[0];
    if (!selected) return;
    setFile(selected);
    setLoadedSessionId(null);
    setLoadedSessionName(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selected);
      const { data } = await apiClient.post<PnPParseResponse>("/pnp/parse", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setParseResult(data);
      setComponents(data.components);
      toast.success(`Parsed ${data.total_count} components`);
    } catch {
      toast.error("Failed to parse file");
      setFile(null);
    } finally {
      setLoading(false);
    }
  }

  // ---- step 3: calibrate ----
  async function handleCalibrate() {
    const filePoints = calibrationPoints.map((p) => ({
      x: parseFloat(p.fileX),
      y: parseFloat(p.fileY),
    }));
    const machinePoints = calibrationPoints.map((p) => ({
      x: parseFloat(p.machineX),
      y: parseFloat(p.machineY),
    }));

    if (filePoints.some((p) => isNaN(p.x) || isNaN(p.y)) || machinePoints.some((p) => isNaN(p.x) || isNaN(p.y))) {
      toast.error("All coordinate fields must be valid numbers");
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.post<CalibrateResponse>("/pnp/calibrate", {
        components,
        file_points: filePoints,
        machine_points: machinePoints,
      });
      setComponents(data.components);
      setTransformInfo(data.transform);
      setCalibrated(true);
      toast.success("Calibration applied");
    } catch {
      toast.error("Calibration failed");
    } finally {
      setLoading(false);
    }
  }

  // ---- ASCII sanitizer for P&P machine compatibility ----
  const UNICODE_MAP: Record<string, string> = {
    "Ω": "ohm", "\u2126": "ohm", "μ": "u", "µ": "u", "±": "+-",
    "°": "deg", "℃": "degC", "℉": "degF", "²": "2", "³": "3",
    "×": "x", "–": "-", "—": "-", "\u2018": "'", "\u2019": "'",
    "\u201C": '"', "\u201D": '"', "…": "...", "≥": ">=", "≤": "<=",
  };

  function quickAscii(str: string): string {
    let out = str;
    for (const [k, v] of Object.entries(UNICODE_MAP)) {
      out = out.replaceAll(k, v);
    }
    return out;
  }

  function hasNonAscii(str: string): boolean {
    return /[^\x00-\x7F]/.test(str);
  }

  async function ensureAsciiComponents(): Promise<typeof components> {
    // Quick pass: replace known Unicode symbols
    let cleaned = components.map((c) => ({
      ...c,
      value: c.value ? quickAscii(c.value) : c.value,
      package: c.package ? quickAscii(c.package) : c.package,
      designator: quickAscii(c.designator),
    }));

    // Check if any non-ASCII remains (Chinese, Arabic, etc.)
    const needsAi = cleaned.filter(
      (c) => hasNonAscii(c.value || "") || hasNonAscii(c.package || "") || hasNonAscii(c.designator)
    );

    if (needsAi.length === 0) return cleaned;

    // Use AI to transliterate remaining non-ASCII
    try {
      const toFix = needsAi.map((c) => ({
        designator: c.designator,
        value: c.value,
        package: c.package,
      }));
      const { data } = await apiClient.post<{
        items: Array<{ designator: string; value: string; package: string }>;
      }>("/pnp/ascii-convert", { items: toFix });

      const fixMap = new Map(data.items.map((i) => [i.designator, i]));
      cleaned = cleaned.map((c) => {
        const fix = fixMap.get(c.designator);
        if (fix) {
          return {
            ...c,
            designator: fix.designator,
            value: fix.value || c.value,
            package: fix.package || c.package,
          };
        }
        return c;
      });
    } catch {
      // Fallback: strip non-ASCII
      cleaned = cleaned.map((c) => ({
        ...c,
        value: c.value?.replace(/[^\x00-\x7F]/g, "") || c.value,
        package: c.package?.replace(/[^\x00-\x7F]/g, "") || c.package,
        designator: c.designator.replace(/[^\x00-\x7F]/g, ""),
      }));
    }

    return cleaned;
  }

  // ---- print feeder configuration ----
  function handlePrintFeederConfig() {
    const active = filteredComponents.filter((c) => !getSettings(c.designator).skip);

    // Group by feeder number
    const feederMap = new Map<number, { feederNo: number; feeder?: Feeder; components: { designator: string; value: string | null; package: string | null; x: number; y: number; rotation: number; head: number; mountSpeed: number }[] }>();
    for (const c of active) {
      const s = getSettings(c.designator);
      if (!feederMap.has(s.feederNo)) {
        feederMap.set(s.feederNo, {
          feederNo: s.feederNo,
          feeder: feeders.find((f) => f.slot_number === s.feederNo),
          components: [],
        });
      }
      feederMap.get(s.feederNo)!.components.push({
        designator: c.designator,
        value: c.value,
        package: c.package,
        x: c.x,
        y: c.y,
        rotation: c.rotation,
        head: s.head,
        mountSpeed: s.mountSpeed,
      });
    }

    const sorted = [...feederMap.values()].sort((a, b) => a.feederNo - b.feederNo);
    const machineName = pnpMachines.find((m) => m.id === selectedMachineId)?.name || "—";

    const html = `<!DOCTYPE html>
<html><head><title>Feeder Configuration</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; color: #111; padding: 16px; }
  h1 { font-size: 16px; margin-bottom: 2px; }
  .meta { color: #666; font-size: 10px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #ccc; padding: 3px 6px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; font-size: 10px; text-transform: uppercase; }
  .feeder-header { background: #e8e8e8; font-weight: 600; }
  .feeder-header td { padding: 5px 6px; }
  .mono { font-family: "SF Mono", "Consolas", monospace; font-size: 10px; }
  .summary { margin-bottom: 12px; }
  .summary span { display: inline-block; margin-right: 16px; }
  @media print { body { padding: 8px; } }
</style>
</head><body>
<h1>Feeder Configuration</h1>
<div class="meta">
  File: ${file?.name || "—"} &nbsp;|&nbsp; Machine: ${machineName} &nbsp;|&nbsp; ${format(new Date(), "yyyy-MM-dd HH:mm")}
</div>
<div class="summary">
  <span><strong>${active.length}</strong> components</span>
  <span><strong>${sorted.length}</strong> feeders</span>
  <span>Side: ${sideFilter}</span>
  <span>Calibrated: ${calibrated ? "Yes" : "No"}</span>
</div>
<table>
  <thead>
    <tr>
      <th>Feeder #</th>
      <th>Value / Package</th>
      <th>Designator</th>
      <th>X (mm)</th>
      <th>Y (mm)</th>
      <th>Rot</th>
      <th>Head</th>
      <th>Speed %</th>
    </tr>
  </thead>
  <tbody>
    ${sorted.map((g) => {
      const label = g.feeder
        ? `${g.feeder.component_value || ""} ${g.feeder.component_package || ""}`.trim() || `Slot ${g.feederNo}`
        : `Slot ${g.feederNo}`;
      return g.components.map((c, i) => `
    <tr${i === 0 ? ' class="feeder-header"' : ""}>
      ${i === 0 ? `<td rowspan="${g.components.length}">${g.feederNo}</td><td rowspan="${g.components.length}">${label}</td>` : ""}
      <td>${c.designator}</td>
      <td class="mono">${c.x.toFixed(2)}</td>
      <td class="mono">${c.y.toFixed(2)}</td>
      <td class="mono">${c.rotation.toFixed(1)}</td>
      <td>${c.head}</td>
      <td>${c.mountSpeed}</td>
    </tr>`).join("");
    }).join("")}
  </tbody>
</table>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.onload = () => w.print();
    }
  }

  // ---- step 4: export (client-side YY1 CSV generation) ----
  async function handleExport() {
    // YY1 template header (11 rows)
    const header = [
      "NEODEN,YY1,P&P FILE,,,,,,,,,,,",
      ",,,,,,,,,,,,,",
      "PanelizedPCB,UnitLength,0,UnitWidth,0,Rows,1,Columns,1,",
      ",,,,,,,,,,,,,",
      "Fiducial,1-X,0,1-Y,0,OverallOffsetX,0,OverallOffsetY,0,",
      ",,,,,,,,,,,,,",
      "NozzleChange,OFF,BeforeComponent,2,Head1,Drop,Station1,PickUp,Station3,",
      "NozzleChange,OFF,BeforeComponent,3,Head1,Drop,Station3,PickUp,Station1,",
      "NozzleChange,OFF,BeforeComponent,1,Head1,Drop,Station1,PickUp,Station1,",
      "NozzleChange,OFF,BeforeComponent,1,Head1,Drop,Station1,PickUp,Station1,",
      ",,,,,,,,,,,,,",
      "Designator,Comment,Footprint,Mid X(mm),Mid Y(mm) ,Rotation,Head ,FeederNo,Mount Speed(%),Pick Height(mm),Place Height(mm),Mode,Skip",
    ];

    setLoading(true);
    const asciiComponents = await ensureAsciiComponents();
    const exportComponents = asciiComponents.filter((c) => {
      if (sideFilter === "all") return true;
      return c.side.toLowerCase() === sideFilter;
    });
    setLoading(false);

    const shiftX = pcbOriginX ?? 0;
    const shiftY = pcbOriginY ?? 0;
    let negativeCount = 0;

    const rows = exportComponents.map((c) => {
      const s = getSettings(c.designator);
      const ex = c.x - shiftX;
      const ey = c.y - shiftY;
      if (ex < 0 || ey < 0) negativeCount++;
      return [
        c.designator,
        c.value ?? "",
        c.package ?? "",
        ex.toFixed(2),
        ey.toFixed(2),
        c.rotation.toFixed(2),
        s.head,
        s.feederNo,
        s.mountSpeed,
        "0.0", // Pick Height
        "0.0", // Place Height
        1, // Mode
        s.skip ? 1 : 0,
      ].join(",");
    });

    if (hasPcbOrigin && negativeCount > 0) {
      toast.error(`${negativeCount} components have negative coordinates after PCB-origin shift. Verify the origin or calibration.`);
    }

    const csv = [...header, ...rows].join("\r\n") + "\r\n";
    const blob = new Blob([csv], { type: "text/csv;charset=us-ascii;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pnp_yy1_${file?.name?.replace(/\.[^.]+$/, "") || "output"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (hasPcbOrigin) {
      toast.success(`YY1 CSV downloaded (coords shifted by PCB origin ${shiftX.toFixed(2)}, ${shiftY.toFixed(2)})`);
    } else {
      toast.success("YY1 CSV downloaded — no PCB origin shift applied. Select a machine with PCB origin set to shift coords.");
    }
  }

  // ---- reset ----
  function handleReset() {
    setStep(1);
    setFile(null);
    setParseResult(null);
    setComponents([]);
    setCalibrationPoints([emptyPoint(), emptyPoint()]);
    setCalibrated(false);
    setTransformInfo(null);
    setSideFilter("all");
    setComponentSettings({});
    setLoadedSessionId(null);
    setLoadedSessionName(null);
    setLoading(false);
  }

  // ---- calibration point helpers ----
  function selectReferenceComponent(index: number, designator: string) {
    const comp = components.find((c) => c.designator === designator);
    setCalibrationPoints((prev) =>
      prev.map((p, i) =>
        i === index
          ? {
              ...p,
              designator,
              fileX: comp ? comp.x.toFixed(4) : "",
              fileY: comp ? comp.y.toFixed(4) : "",
              fileRotation: comp ? comp.rotation.toFixed(2) : "",
            }
          : p
      )
    );
  }

  function updateCalibrationPoint(index: number, field: keyof CalibrationPoint, value: string) {
    setCalibrationPoints((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  function addCalibrationPoint() {
    setCalibrationPoints((prev) => [...prev, emptyPoint()]);
  }

  function quickCalibrateCorners() {
    // Auto-pick 4 corner components: top-left, top-right, bottom-left, bottom-right
    if (components.length < 4) {
      toast.error("Need at least 4 components for quick calibration");
      return;
    }

    const xs = components.map((c) => c.x);
    const ys = components.map((c) => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    // Score each component by how close it is to each corner
    function cornerDist(c: PnPComponent, cornerX: number, cornerY: number) {
      return Math.sqrt((c.x - cornerX) ** 2 + (c.y - cornerY) ** 2);
    }

    const corners = [
      { label: "Top-Left", x: minX, y: maxY },
      { label: "Top-Right", x: maxX, y: maxY },
      { label: "Bottom-Left", x: minX, y: minY },
      { label: "Bottom-Right", x: maxX, y: minY },
    ];

    const used = new Set<string>();
    const points: CalibrationPoint[] = [];

    for (const corner of corners) {
      // Find closest component to this corner that hasn't been used
      const sorted = [...components]
        .filter((c) => !used.has(c.designator))
        .sort((a, b) => cornerDist(a, corner.x, corner.y) - cornerDist(b, corner.x, corner.y));

      if (sorted.length > 0) {
        const comp = sorted[0];
        used.add(comp.designator);
        points.push({
          designator: comp.designator,
          fileX: comp.x.toFixed(4),
          fileY: comp.y.toFixed(4),
          fileRotation: comp.rotation.toFixed(2),
          machineX: "",
          machineY: "",
          machineRotation: "",
        });
      }
    }

    setCalibrationPoints(points);
    setCsvCalibrationPoints([]);
    toast.success(
      `Selected 4 corner components: ${points.map((p) => p.designator).join(", ")}. Enter machine coordinates for each.`
    );
  }

  function handleCalibrationCsvUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        return;
      }

      // Parse header - detect delimiter
      const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
      const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

      // Find column indices (flexible matching)
      const desigIdx = headers.findIndex((h) => /^(designator|ref|part|component)/.test(h));
      const xIdx = headers.findIndex((h) => /^(x|mid.?x|pos.?x|center.?x|machine.?x)/.test(h));
      const yIdx = headers.findIndex((h) => /^(y|mid.?y|pos.?y|center.?y|machine.?y)/.test(h));
      const rotIdx = headers.findIndex((h) => /^(rot|angle|machine.?rot)/.test(h));

      if (desigIdx === -1 || xIdx === -1 || yIdx === -1) {
        toast.error("CSV must have Designator, X, and Y columns");
        return;
      }

      // Parse machine coordinate rows
      const machineCoords: Record<string, { x: number; y: number; rotation: number }> = {};
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/['"]/g, ""));
        const desig = cols[desigIdx];
        const x = parseFloat(cols[xIdx]);
        const y = parseFloat(cols[yIdx]);
        const rot = rotIdx !== -1 ? parseFloat(cols[rotIdx]) : 0;
        if (desig && !isNaN(x) && !isNaN(y)) {
          machineCoords[desig] = { x, y, rotation: isNaN(rot) ? 0 : rot };
        }
      }

      // Match against our PnP components
      const matched: CalibrationPoint[] = [];
      for (const comp of components) {
        const mc = machineCoords[comp.designator];
        if (mc) {
          matched.push({
            designator: comp.designator,
            fileX: comp.x.toFixed(4),
            fileY: comp.y.toFixed(4),
            fileRotation: comp.rotation.toFixed(2),
            machineX: mc.x.toFixed(4),
            machineY: mc.y.toFixed(4),
            machineRotation: mc.rotation.toFixed(2),
          });
        }
      }

      if (matched.length < 2) {
        toast.error(`Only ${matched.length} designator(s) matched. Need at least 2.`);
        return;
      }

      // Store all matched points with selection state - select all by default
      setCsvCalibrationPoints(matched.map((m) => ({ ...m, selected: true })));
      toast.success(`Found ${matched.length} matching points from CSV. Select which to use.`);
    };
    reader.readAsText(file);
  }

  function removeCalibrationPoint(index: number) {
    if (calibrationPoints.length <= 2) return;
    setCalibrationPoints((prev) => prev.filter((_, i) => i !== index));
  }

  // ---- preview table columns ----
  const previewColumns: Column<PnPComponent>[] = [
    { key: "designator", header: "Designator" },
    {
      key: "value",
      header: "Value",
      render: (c) => c.value ?? "-",
    },
    {
      key: "package",
      header: "Package",
      render: (c) => c.package ?? "-",
    },
    {
      key: "x",
      header: "X (mm)",
      render: (c) => c.x.toFixed(2),
    },
    {
      key: "y",
      header: "Y (mm)",
      render: (c) => c.y.toFixed(2),
    },
    {
      key: "rotation",
      header: "Rotation",
      render: (c) => `${c.rotation.toFixed(2)}`,
    },
    {
      key: "side",
      header: "Side",
      render: (c) => (
        <Badge variant={c.side.toLowerCase() === "top" ? "green" : "blue"}>
          {c.side}
        </Badge>
      ),
    },
  ];

  // ---- export table columns (final machine coordinates + YY1 settings) ----
  const exportColumns: Column<PnPComponent>[] = [
    {
      key: "skip",
      header: "Skip",
      className: "w-12",
      render: (c) => (
        <input
          type="checkbox"
          checked={getSettings(c.designator).skip}
          onChange={(e) => updateSettings(c.designator, { skip: e.target.checked })}
          className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
        />
      ),
    },
    {
      key: "designator",
      header: "Designator",
      render: (c) => (
        <span className={`font-medium ${getSettings(c.designator).skip ? "line-through text-muted-foreground" : ""}`}>
          {c.designator}
        </span>
      ),
    },
    {
      key: "value",
      header: "Comment",
      render: (c) => <span className={getSettings(c.designator).skip ? "text-muted-foreground" : ""}>{c.value ?? "-"}</span>,
    },
    {
      key: "package",
      header: "Footprint",
      render: (c) => <span className={getSettings(c.designator).skip ? "text-muted-foreground" : ""}>{c.package ?? "-"}</span>,
    },
    {
      key: "x",
      header: "Mid X(mm)",
      render: (c) => <span className="font-mono text-xs">{c.x.toFixed(2)}</span>,
    },
    {
      key: "y",
      header: "Mid Y(mm)",
      render: (c) => <span className="font-mono text-xs">{c.y.toFixed(2)}</span>,
    },
    {
      key: "rotation",
      header: "Rotation",
      render: (c) => <span className="font-mono text-xs">{c.rotation.toFixed(2)}</span>,
    },
    {
      key: "feederNo",
      header: "Feeder",
      className: "w-28",
      render: (c) => {
        const matchingFeeders = feeders.filter(
          (f) =>
            (f.component_value && c.value && f.component_value === c.value) ||
            (f.component_package && c.package && f.component_package === c.package)
        );
        return (
          <div className="flex items-center gap-1">
            {feeders.length > 0 ? (
              <select
                value={getSettings(c.designator).feederNo}
                onChange={(e) => {
                  const feederNo = parseInt(e.target.value) || 1;
                  const feeder = feeders.find((f) => f.slot_number === feederNo);
                  updateSettings(c.designator, {
                    feederNo,
                    ...(feeder ? { head: feeder.head, mountSpeed: feeder.mount_speed } : {}),
                  });
                }}
                className={`w-24 h-7 rounded-md border border-input bg-background px-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  matchingFeeders.length > 0 ? "border-emerald-500/50" : ""
                }`}
              >
                <option value={getSettings(c.designator).feederNo}>
                  #{getSettings(c.designator).feederNo} (manual)
                </option>
                {feeders.map((f) => (
                  <option key={f.id} value={f.slot_number}>
                    #{f.slot_number} {f.component_value || f.component_package || ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                min={1}
                max={99}
                value={getSettings(c.designator).feederNo}
                onChange={(e) => updateSettings(c.designator, { feederNo: parseInt(e.target.value) || 1 })}
                className="w-16 h-7 rounded-md border border-input bg-background px-2 text-xs font-mono text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            )}
          </div>
        );
      },
    },
    {
      key: "side",
      header: "Side",
      render: (c) => (
        <Badge variant={c.side.toLowerCase() === "top" ? "green" : "blue"}>
          {c.side}
        </Badge>
      ),
    },
  ];

  // (CSV export is handled by the backend /pnp/export endpoint)

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <div className="space-y-6">
      {/* Save/Load bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSavedSessions(!showSavedSessions)}
        >
          <FolderOpenIcon className="h-4 w-4 mr-1.5" />
          Saved Sessions
          {savedSessions && savedSessions.total > 0 && (
            <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
              {savedSessions.total}
            </span>
          )}
        </Button>
        {parseResult && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSession}
              disabled={saveMutation.isPending || replaceMutation.isPending}
            >
              <BookmarkIcon className="h-4 w-4 mr-1.5" />
              {replaceMutation.isPending || saveMutation.isPending
                ? "Saving..."
                : loadedSessionId !== null
                ? `Save "${loadedSessionName}"`
                : "Save Session"}
            </Button>
            {loadedSessionId !== null && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAsNewSession}
                disabled={saveMutation.isPending || replaceMutation.isPending}
              >
                Save As New
              </Button>
            )}
          </>
        )}
      </div>

      {/* Saved sessions panel */}
      {showSavedSessions && (
        <Card>
          <CardHeader>
            <CardTitle>Saved P&amp;P Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSessions ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !savedSessions?.items.length ? (
              <p className="text-sm text-muted-foreground">
                No saved sessions yet. Upload and configure a P&amp;P file, then click "Save Session".
              </p>
            ) : (
              <div className="divide-y rounded-lg border">
                {savedSessions.items.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-accent/50 transition-colors">
                    <button
                      onClick={() => handleLoadSession(s.id)}
                      className="text-left flex-1 min-w-0"
                    >
                      <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                      {s.notes && (
                        <p className="text-xs text-muted-foreground truncate">{s.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.created_at && format(new Date(s.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteSession(s.id)}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <StepIndicator current={step} />

      {/* ---------------------------------------------------------------- */}
      {/* STEP 1: Upload                                                   */}
      {/* ---------------------------------------------------------------- */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Pick &amp; Place File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FileUpload
              onFileSelect={handleFileSelect}
              accept={{
                "text/csv": [".csv"],
                "text/plain": [".txt", ".pos"],
              }}
              label="Upload P&P file"
              description="Accepts .csv, .txt, .pos files (KiCad, EasyEDA, etc.)"
            />

            {file && (
              <div className="text-sm text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{file.name}</span>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                Parsing file...
              </div>
            )}

            {parseResult && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Detected format:</span>
                    <Badge>{parseResult.format}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-lg border border-border p-3 text-center">
                      <div className="text-2xl font-bold">{parseResult.total_count}</div>
                      <div className="text-xs text-muted-foreground">Total Components</div>
                    </div>
                    <div className="rounded-lg border border-border p-3 text-center">
                      <div className="text-2xl font-bold">{parseResult.top_count}</div>
                      <div className="text-xs text-muted-foreground">Top</div>
                    </div>
                    <div className="rounded-lg border border-border p-3 text-center">
                      <div className="text-2xl font-bold">{parseResult.bottom_count}</div>
                      <div className="text-xs text-muted-foreground">Bottom</div>
                    </div>
                    <div className="rounded-lg border border-border p-3 text-center">
                      <div className="text-2xl font-bold">{uniquePackages.size}</div>
                      <div className="text-xs text-muted-foreground">Unique Packages</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!parseResult}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* STEP 2: Preview & Review                                         */}
      {/* ---------------------------------------------------------------- */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview &amp; Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bounds info */}
            {parseResult && (
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Board width: </span>
                  <span className="font-medium">
                    {(parseResult.bounds.max_x - parseResult.bounds.min_x).toFixed(2)} mm
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Board height: </span>
                  <span className="font-medium">
                    {(parseResult.bounds.max_y - parseResult.bounds.min_y).toFixed(2)} mm
                  </span>
                </div>
              </div>
            )}

            {/* Filter buttons */}
            <div className="flex gap-2">
              {(["all", "top", "bottom"] as const).map((f) => (
                <Button
                  key={f}
                  variant={sideFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSideFilter(f)}
                >
                  {f === "all" ? "All" : f === "top" ? "Top Only" : "Bottom Only"}
                </Button>
              ))}
            </div>

            {/* Table */}
            <DataTable
              columns={previewColumns}
              data={filteredComponents}
              rowKey={(c) => `${c.designator}-${c.side}`}
              emptyMessage="No components match the current filter"
            />

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* STEP 3: Calibration                                              */}
      {/* ---------------------------------------------------------------- */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Calibration (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Pick reference points to map design coordinates to machine coordinates.
            </p>

            {/* Quick calibrate options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className="rounded-lg border border-border p-4 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
                onClick={quickCalibrateCorners}
              >
                <p className="text-sm font-medium">Quick Calibrate (4 corners)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-picks 4 corner components. Jog your machine to each one and enter the X/Y coordinates.
                  Best for fast setup.
                </p>
              </div>
              <label className="rounded-lg border border-dashed border-border p-4 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors">
                <input
                  type="file"
                  accept=".csv,.txt,.tsv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCalibrationCsvUpload(f);
                    e.target.value = "";
                  }}
                />
                <p className="text-sm font-medium">Import from CSV</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a CSV with machine coordinates (Designator, X, Y, Rotation).
                  Best when you already have a calibrated file.
                </p>
              </label>
            </div>

            {/* Board map showing component positions and selected calibration points */}
            {components.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Component positions — highlighted points are selected for calibration.
                    {csvCalibrationPoints.length === 0 && " Click a dot to toggle it as a reference point."}
                  </p>
                </div>

                {/* Board orientation & layer controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground mr-1">Orientation:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setBoardRotation((r) => (r + 90) % 360)}
                  >
                    <ArrowPathIcon className="h-3 w-3 mr-1" />
                    Rotate {boardRotation}°
                  </Button>
                  <Button
                    variant={boardMirrorX ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setBoardMirrorX((m) => !m)}
                  >
                    Mirror X
                  </Button>
                  <Button
                    variant={boardMirrorY ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setBoardMirrorY((m) => !m)}
                  >
                    Mirror Y
                  </Button>
                  {(boardRotation !== 0 || boardMirrorX || boardMirrorY) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => { setBoardRotation(0); setBoardMirrorX(false); setBoardMirrorY(false); }}
                    >
                      Reset
                    </Button>
                  )}

                  <Separator orientation="vertical" className="h-5 mx-1" />

                  <span className="text-xs text-muted-foreground mr-1">Layer:</span>
                  {(["all", "top", "bottom"] as const).map((layer) => (
                    <Button
                      key={layer}
                      variant={boardLayerFilter === layer ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-2 text-xs capitalize"
                      onClick={() => setBoardLayerFilter(layer)}
                    >
                      {layer === "all" ? "Both" : layer}
                    </Button>
                  ))}
                </div>

                <BoardMap
                  components={components}
                  highlightedDesignators={new Set(calibrationPoints.map((p) => p.designator).filter(Boolean))}
                  calibrationDesignators={new Set(calibrationPoints.filter((p) => p.designator && p.machineX && p.machineY).map((p) => p.designator))}
                  rotation={boardRotation}
                  mirrorX={boardMirrorX}
                  mirrorY={boardMirrorY}
                  layerFilter={boardLayerFilter}
                  onClickComponent={csvCalibrationPoints.length === 0 ? (designator) => {
                    const exists = calibrationPoints.find((p) => p.designator === designator);
                    if (exists) {
                      // Remove if already selected (keep min 2)
                      if (calibrationPoints.length > 2) {
                        setCalibrationPoints((prev) => prev.filter((p) => p.designator !== designator));
                      }
                    } else {
                      // Add this component as a calibration point
                      const comp = components.find((c) => c.designator === designator);
                      if (comp) {
                        setCalibrationPoints((prev) => [
                          ...prev.filter((p) => p.designator), // remove empty points
                          {
                            designator: comp.designator,
                            fileX: comp.x.toFixed(4),
                            fileY: comp.y.toFixed(4),
                            fileRotation: comp.rotation.toFixed(2),
                            machineX: "",
                            machineY: "",
                            machineRotation: "",
                          },
                        ]);
                      }
                    }
                  } : undefined}
                  width={500}
                  height={350}
                />

                {/* Machine setup reminder */}
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1">
                  <p className="font-semibold text-amber-400">⚠ Before calibrating: confirm machine setup</p>
                  <p className="text-muted-foreground">
                    Make sure you have entered the PCB origin and nozzle height for this machine. On the NeoDen YY1:
                  </p>
                  <ol className="list-decimal list-inside text-muted-foreground space-y-0.5 ml-1">
                    <li>On the machine screen, tap <strong>Parameters</strong></li>
                    <li>Enter the machine's manufacturing year as the password (e.g. <code className="font-mono">2022</code>)</li>
                    <li>Enter the <strong>PCB Origin</strong> and <strong>Nozzle Height Datum</strong> — use the same values as on the <em>Machine page &rarr; PCB Setup</em> in this app</li>
                  </ol>
                </div>

                {/* Calibration step-by-step */}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
                  <p className="font-semibold text-primary">How to calibrate</p>
                  <ol className="list-decimal list-inside text-muted-foreground space-y-0.5 ml-1">
                    <li>Place the PCB on the machine.</li>
                    <li>Check the preview above matches the physical board — each component should be in the expected location. Use <em>Rotate</em> / <em>Mirror</em> if not.</li>
                    <li>On the machine, open <strong>Manual Test</strong>.</li>
                    <li>Move the nozzle on top of each component you will use for calibration. We recommend <strong>at least 2 and ideally 4</strong> components spread across the board (top, bottom, left, right corners).</li>
                    <li>Enter the logical coordinates shown on the machine into the fields below for each reference component.</li>
                    <li>Click <strong>Apply Calibration</strong>, then save your file.</li>
                  </ol>
                </div>
              </div>
            )}

            {/* CSV point picker */}
            {csvCalibrationPoints.length > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {csvCalibrationPoints.filter((p) => p.selected).length} of {csvCalibrationPoints.length} points selected
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select which points to use for calibration. More points = higher accuracy.
                      Use "Apply Direct" if you have coordinates for all components.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCsvCalibrationPoints((prev) => prev.map((p) => ({ ...p, selected: true })))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCsvCalibrationPoints((prev) => prev.map((p) => ({ ...p, selected: false })))}
                    >
                      Deselect All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCsvCalibrationPoints([])}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto rounded border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card">
                      <tr className="text-muted-foreground border-b">
                        <th className="text-left py-1.5 px-2 w-8"></th>
                        <th className="text-left py-1.5 px-2">Designator</th>
                        <th className="text-left py-1.5 px-2">File X</th>
                        <th className="text-left py-1.5 px-2">File Y</th>
                        <th className="text-left py-1.5 px-2">Machine X</th>
                        <th className="text-left py-1.5 px-2">Machine Y</th>
                        <th className="text-left py-1.5 px-2">Rot</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {csvCalibrationPoints.map((pt, idx) => (
                        <tr
                          key={idx}
                          className={`border-t border-border/30 cursor-pointer hover:bg-accent/50 transition-colors ${pt.selected ? "" : "opacity-40"}`}
                          onClick={() =>
                            setCsvCalibrationPoints((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, selected: !p.selected } : p))
                            )
                          }
                        >
                          <td className="py-1 px-2">
                            <input
                              type="checkbox"
                              checked={pt.selected}
                              readOnly
                              className="rounded border-input"
                            />
                          </td>
                          <td className="py-1 px-2 font-semibold">{pt.designator}</td>
                          <td className="py-1 px-2">{pt.fileX}</td>
                          <td className="py-1 px-2">{pt.fileY}</td>
                          <td className="py-1 px-2">{pt.machineX}</td>
                          <td className="py-1 px-2">{pt.machineY}</td>
                          <td className="py-1 px-2">{pt.machineRotation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const selected = csvCalibrationPoints.filter((p) => p.selected);
                        if (selected.length === 0) {
                          toast.error("Select at least some points");
                          return;
                        }
                        // Directly replace coordinates for selected components
                        const coordMap = new Map(selected.map((m) => [
                          m.designator,
                          { x: parseFloat(m.machineX), y: parseFloat(m.machineY), rotation: parseFloat(m.machineRotation) },
                        ]));
                        const applied = components.map((c) => {
                          const mc = coordMap.get(c.designator);
                          return mc ? { ...c, x: mc.x, y: mc.y, rotation: mc.rotation } : c;
                        });
                        setComponents(applied);
                        setCalibrated(true);
                        setTransformInfo(null);
                        const notCovered = components.length - selected.length;
                        toast.success(
                          `Machine coordinates applied for ${selected.length} components` +
                          (notCovered > 0 ? `. ${notCovered} components without machine coords keep design positions.` : "")
                        );
                        setStep(4);
                      }}
                    >
                      Apply Machine Coordinates ({csvCalibrationPoints.filter((p) => p.selected).length} selected)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={csvCalibrationPoints.filter((p) => p.selected).length < 2}
                      onClick={() => {
                        const selected = csvCalibrationPoints.filter((p) => p.selected);
                        setCalibrationPoints(selected);
                        setCsvCalibrationPoints([]);
                        toast.success(`${selected.length} reference points set. Click "Apply Calibration" below.`);
                      }}
                    >
                      Use as Reference Points for Transform
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong>Apply Machine Coordinates</strong>: directly uses the X/Y/Rotation from the CSV for each component (recommended when CSV has all components).
                    <br />
                    <strong>Use as Reference Points</strong>: computes a mathematical transform from the selected points to map all components (use when CSV has only a few reference points).
                  </p>
                </div>
              </div>
            )}

            {/* Individual point editors (manual entry) */}
            {csvCalibrationPoints.length === 0 && (
            <div className="space-y-6">
              {calibrationPoints.map((pt, idx) => (
                <div key={idx} className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Reference Point {idx + 1}</span>
                    {calibrationPoints.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-7 px-2"
                        onClick={() => removeCalibrationPoint(idx)}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Component selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Reference Component</Label>
                    <select
                      value={pt.designator}
                      onChange={(e) => selectReferenceComponent(idx, e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select a component...</option>
                      {components.map((c) => (
                        <option key={c.designator} value={c.designator}>
                          {c.designator} — {c.value || c.package || "?"} ({c.x.toFixed(2)}, {c.y.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {pt.designator && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* File coordinates (read-only, auto-filled) */}
                      <div className="space-y-3 rounded-lg bg-muted/50 p-3">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">From File (auto-filled)</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">X (mm)</Label>
                            <Input
                              type="text"
                              value={pt.fileX}
                              readOnly
                              className="bg-muted text-muted-foreground font-mono text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Y (mm)</Label>
                            <Input
                              type="text"
                              value={pt.fileY}
                              readOnly
                              className="bg-muted text-muted-foreground font-mono text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Rot (&deg;)</Label>
                            <Input
                              type="text"
                              value={pt.fileRotation}
                              readOnly
                              className="bg-muted text-muted-foreground font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Machine coordinates (user input) */}
                      <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <span className="text-xs font-medium uppercase tracking-wider">Enter Logical Coordinates</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">X (mm)</Label>
                            <Input
                              type="number"
                              step="any"
                              placeholder="0.000"
                              value={pt.machineX}
                              onChange={(e) => updateCalibrationPoint(idx, "machineX", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Y (mm)</Label>
                            <Input
                              type="number"
                              step="any"
                              placeholder="0.000"
                              value={pt.machineY}
                              onChange={(e) => updateCalibrationPoint(idx, "machineY", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Rot (&deg;)</Label>
                            <Input
                              type="number"
                              step="any"
                              placeholder="0.00"
                              value={pt.machineRotation}
                              onChange={(e) => updateCalibrationPoint(idx, "machineRotation", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}

            <Button variant="outline" size="sm" onClick={addCalibrationPoint}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Reference Point
            </Button>

            {transformInfo && (
              <>
                <Separator />
                <div className="space-y-4">
                  {/* Warnings */}
                  {transformInfo.warnings && transformInfo.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                      {transformInfo.warnings.map((w, i) => (
                        <p key={i} className="text-sm text-amber-400">⚠ {w}</p>
                      ))}
                    </div>
                  )}

                  {/* Transform parameters */}
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                    <div className="font-medium text-sm">Transform Parameters</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div>
                        <span className="text-xs text-muted-foreground">Rotation</span>
                        <div className="font-mono text-sm">{transformInfo.rotation_deg.toFixed(3)}&deg;</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Scale X</span>
                        <div className="font-mono text-sm">{transformInfo.scale_x.toFixed(6)}</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Scale Y</span>
                        <div className="font-mono text-sm">{transformInfo.scale_y.toFixed(6)}</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Offset X</span>
                        <div className="font-mono text-sm">{transformInfo.offset_x.toFixed(3)} mm</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Offset Y</span>
                        <div className="font-mono text-sm">{transformInfo.offset_y.toFixed(3)} mm</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">RMS Error</span>
                        <div className={`font-mono text-sm ${transformInfo.rms_error > 0.05 ? "text-amber-400" : "text-emerald-400"}`}>
                          {transformInfo.rms_error.toFixed(4)} mm
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Per-point residuals */}
                  {transformInfo.residuals && transformInfo.residuals.length > 0 && (
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                      <div className="font-medium text-sm">Per-Point Accuracy</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-mono">
                          <thead>
                            <tr className="text-muted-foreground">
                              <th className="text-left py-1 pr-3">#</th>
                              <th className="text-left py-1 pr-3">Machine (actual)</th>
                              <th className="text-left py-1 pr-3">Predicted</th>
                              <th className="text-left py-1">Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transformInfo.residuals.map((r, i) => (
                              <tr key={i} className="border-t border-border/50">
                                <td className="py-1.5 pr-3 text-muted-foreground">{i + 1}</td>
                                <td className="py-1.5 pr-3">({r.machine_x.toFixed(3)}, {r.machine_y.toFixed(3)})</td>
                                <td className="py-1.5 pr-3">({r.predicted_x.toFixed(3)}, {r.predicted_y.toFixed(3)})</td>
                                <td className={`py-1.5 font-semibold ${r.error_mm > 0.2 ? "text-red-400" : r.error_mm > 0.05 ? "text-amber-400" : "text-emerald-400"}`}>
                                  {r.error_mm.toFixed(4)} mm
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                onClick={() => {
                  setCalibrated(false);
                  setTransformInfo(null);
                  setStep(4);
                }}
              >
                Skip Calibration
              </Button>
              <Button onClick={handleCalibrate} disabled={loading || calibrationPoints.some((p) => !p.designator)}>
                {loading ? "Applying..." : "Apply Calibration"}
              </Button>
            </div>

            {calibrated && (
              <div className="flex justify-end">
                <Button onClick={() => setStep(4)}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* STEP 4: Export                                                    */}
      {/* ---------------------------------------------------------------- */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Format detected: </span>
                <Badge>{parseResult?.format}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Total components: </span>
                <span className="font-medium">{components.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Calibration applied: </span>
                <Badge variant={calibrated ? "green" : "gray"}>
                  {calibrated ? "Yes" : "No"}
                </Badge>
              </div>
              {calibrated && transformInfo && (
                <div className="mt-2 pl-2 border-l-2 border-primary/30 space-y-1 text-xs text-muted-foreground">
                  <div>Rotation: {transformInfo.rotation_deg.toFixed(3)}&deg;</div>
                  <div>Scale: X={transformInfo.scale_x.toFixed(6)}, Y={transformInfo.scale_y.toFixed(6)}</div>
                  <div>Offset: ({transformInfo.offset_x.toFixed(3)}, {transformInfo.offset_y.toFixed(3)}) mm</div>
                  <div>RMS Error: {transformInfo.rms_error.toFixed(4)} mm</div>
                </div>
              )}
            </div>

            {/* Machine feeder config selector */}
            {pnpMachines.length > 0 && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="text-sm font-medium">Feeder Configuration</div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">P&amp;P Machine</Label>
                    <select
                      value={selectedMachineId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : null;
                        setSelectedMachineId(id);
                        // Apply machine's default mount speed to any components without an override
                        const m = pnpMachines.find((mm) => mm.id === id);
                        const defaultSpeed = m?.default_mount_speed;
                        if (defaultSpeed && defaultSpeed > 0) {
                          setComponentSettings((prev) => {
                            const next = { ...prev };
                            for (const c of components) {
                              const existing = next[c.designator];
                              if (!existing) {
                                next[c.designator] = { feederNo: 1, skip: false, head: 0, mountSpeed: defaultSpeed };
                              }
                            }
                            return next;
                          });
                        }
                      }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[200px]"
                    >
                      <option value="">None (manual entry)</option>
                      {pnpMachines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}{m.model ? ` (${m.model})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedMachine && (
                    <div className="flex flex-col gap-1 text-xs">
                      {hasPcbOrigin ? (
                        <Badge color="green">
                          PCB origin: ({pcbOriginX!.toFixed(2)}, {pcbOriginY!.toFixed(2)}) mm — coordinates will be shifted on export
                        </Badge>
                      ) : (
                        <Badge color="yellow">
                          No PCB origin set — coordinates exported as-is. Set on the machine page for automatic shift.
                        </Badge>
                      )}
                    </div>
                  )}
                  {feeders.length > 0 && (
                    <>
                      <Badge color="green">{feeders.length} feeders loaded</Badge>
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={loading}
                        onClick={async () => {
                          if (!selectedMachineId) return;

                          // Phase 1: exact match
                          let exactMatched = 0;
                          const updated = { ...componentSettings };
                          const unmatched: typeof components = [];
                          components.forEach((c) => {
                            const feeder = feeders.find(
                              (f) =>
                                (f.component_value && c.value && f.component_value === c.value) ||
                                (f.component_package && c.package && f.component_package === c.package)
                            );
                            if (feeder) {
                              updated[c.designator] = {
                                ...getSettings(c.designator),
                                feederNo: feeder.slot_number,
                                head: feeder.head,
                                mountSpeed: feeder.mount_speed,
                              };
                              exactMatched++;
                            } else {
                              unmatched.push(c);
                            }
                          });
                          setComponentSettings(updated);

                          // Phase 2: AI match for unmatched
                          if (unmatched.length > 0) {
                            setLoading(true);
                            try {
                              const { data } = await apiClient.post<{
                                matches: Array<{
                                  designator: string;
                                  feeder_slot: number | null;
                                  head: number;
                                  mount_speed: number;
                                  confidence: string;
                                  reason: string | null;
                                }>;
                                matched_count: number;
                                total_count: number;
                              }>("/pnp/ai-feeder-match", {
                                machine_id: selectedMachineId,
                                components: unmatched.map((c) => ({
                                  designator: c.designator,
                                  value: c.value,
                                  package: c.package,
                                })),
                              });
                              const aiUpdated = { ...updated };
                              for (const m of data.matches) {
                                if (m.feeder_slot != null) {
                                  aiUpdated[m.designator] = {
                                    ...getSettings(m.designator),
                                    feederNo: m.feeder_slot,
                                    head: m.head,
                                    mountSpeed: m.mount_speed,
                                  };
                                }
                              }
                              setComponentSettings(aiUpdated);
                              toast.success(
                                `Assigned feeders: ${exactMatched} exact + ${data.matched_count} AI matched out of ${components.length}`
                              );
                            } catch {
                              toast.success(`Exact match: ${exactMatched}/${components.length}. AI matching failed for remaining.`);
                            } finally {
                              setLoading(false);
                            }
                          } else {
                            toast.success(`All ${exactMatched}/${components.length} components matched exactly`);
                          }
                        }}
                      >
                        {loading ? (
                          <>
                            <ArrowPathIcon className="h-3.5 w-3.5 mr-1 animate-spin" />
                            Matching...
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="h-3.5 w-3.5 mr-1" />
                            AI Match Feeders
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
                {selectedMachineId && feeders.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No feeders configured for this machine. <a href="/machines/feeders" className="text-primary underline">Configure feeders</a>
                  </p>
                )}
              </div>
            )}

            {/* Side filter + quick actions */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2">
                <Label>Side filter</Label>
                <div className="flex gap-2">
                  {(["all", "top", "bottom"] as const).map((f) => (
                    <Button
                      key={f}
                      variant={sideFilter === f ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSideFilter(f)}
                    >
                      {f === "all"
                        ? `All (${components.length})`
                        : f === "top"
                        ? `Top (${components.filter((c) => c.side.toLowerCase() === "top").length})`
                        : `Bottom (${components.filter((c) => c.side.toLowerCase() === "bottom").length})`}
                    </Button>
                  ))}
                </div>
              </div>
              {/* Bulk feeder assign by value */}
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Assign feeder by value</Label>
                  <div className="flex gap-1.5">
                    <select
                      id="bulk-value"
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[140px]"
                    >
                      <option value="">Select value...</option>
                      {Array.from(new Set(components.map((c) => c.value).filter(Boolean)))
                        .sort()
                        .map((v) => (
                          <option key={v} value={v!}>
                            {v} ({components.filter((c) => c.value === v).length})
                          </option>
                        ))}
                    </select>
                    <input
                      id="bulk-feeder"
                      type="number"
                      min={1}
                      max={99}
                      defaultValue={1}
                      className="w-14 h-8 rounded-md border border-input bg-background px-2 text-xs font-mono text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        const val = (document.getElementById("bulk-value") as HTMLSelectElement)?.value;
                        const feeder = parseInt((document.getElementById("bulk-feeder") as HTMLInputElement)?.value) || 1;
                        if (!val) { toast.error("Select a value first"); return; }
                        const updated = { ...componentSettings };
                        components.filter((c) => c.value === val).forEach((c) => {
                          updated[c.designator] = { ...getSettings(c.designator), feederNo: feeder };
                        });
                        setComponentSettings(updated);
                        toast.success(`Feeder ${feeder} → all "${val}" (${components.filter((c) => c.value === val).length} components)`);
                      }}
                    >
                      Assign
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{filteredComponents.length} components</span>
              <span>{filteredComponents.filter((c) => getSettings(c.designator).skip).length} skipped</span>
              <span>{filteredComponents.filter((c) => !getSettings(c.designator).skip).length} will be placed</span>
              <span>{new Set(filteredComponents.map((c) => getSettings(c.designator).feederNo)).size} feeders used</span>
            </div>

            {/* Full component table with final coordinates + feeder/skip */}
            <DataTable
              columns={exportColumns}
              data={filteredComponents}
              rowKey={(c) => `${c.designator}-${c.side}`}
              emptyMessage="No components match the current filter"
            />

            {/* PCB origin shift status */}
            {hasPcbOrigin ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
                <p className="text-emerald-400">
                  ✓ Export will shift coordinates by PCB origin (<span className="font-mono">{pcbOriginX!.toFixed(2)}, {pcbOriginY!.toFixed(2)}</span>) mm — the lower-left corner becomes (0, 0) for the machine.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1">
                <p className="font-semibold text-amber-400">⚠ No PCB origin shift will be applied</p>
                <p className="text-muted-foreground">
                  {selectedMachineId
                    ? "The selected machine has no PCB origin set. Go to the machine page and fill in PCB Origin X/Y under PCB Setup."
                    : "No machine is selected. Pick a P&P machine above so its PCB origin can be applied. Otherwise coordinates are exported as-is and may be negative."}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleReset}>
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Start Over
              </Button>
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                onClick={handleSaveSession}
                disabled={saveMutation.isPending || replaceMutation.isPending}
              >
                <BookmarkIcon className="h-4 w-4 mr-1.5" />
                {replaceMutation.isPending || saveMutation.isPending
                  ? "Saving..."
                  : loadedSessionId !== null
                  ? `Save "${loadedSessionName}"`
                  : "Save Session"}
              </Button>
              {loadedSessionId !== null && (
                <Button variant="outline" onClick={handleSaveAsNewSession} disabled={saveMutation.isPending || replaceMutation.isPending}>
                  Save As New
                </Button>
              )}
              <Button variant="outline" onClick={handlePrintFeederConfig}>
                <PrinterIcon className="h-4 w-4 mr-1.5" />
                Print Feeder Config
              </Button>
              <Button size="lg" onClick={handleExport}>
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Download YY1 CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
