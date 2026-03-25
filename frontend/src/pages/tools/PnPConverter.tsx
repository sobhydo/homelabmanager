import { useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  CheckIcon,
  TrashIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BookmarkIcon,
  FolderOpenIcon,
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

  // Feeder configuration
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);
  const { data: machinesData } = useMachines({ page_size: 200 });
  const pnpMachines = (machinesData?.items || []).filter((m) => m.machine_type === "Pick & Place");
  const { data: feedersData } = useFeeders(selectedMachineId ?? undefined);
  const feeders: Feeder[] = feedersData?.items || [];

  // Saved sessions
  const PNP_CATEGORY = "pnp_session";
  const { data: savedSessions, isLoading: loadingSessions } = useSavedFiles(PNP_CATEGORY);
  const saveMutation = useUploadSavedFile();
  const deleteMutation = useDeleteSavedFile();

  // ---- helpers ----
  const filteredComponents = components.filter((c) => {
    if (sideFilter === "all") return true;
    return c.side.toLowerCase() === sideFilter;
  });

  const uniquePackages = new Set(components.map((c) => c.package).filter(Boolean));

  function getSettings(designator: string) {
    return componentSettings[designator] || { feederNo: 1, skip: false, head: 0, mountSpeed: 100 };
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
  }

  async function handleSaveSession() {
    const sessionName = prompt("Name for this P&P session:", file?.name?.replace(/\.[^.]+$/, "") || "session");
    if (!sessionName) return;

    const session: PnPSession = {
      step,
      fileName: file?.name || "unknown",
      parseResult,
      components,
      calibrationPoints,
      calibrated,
      transformInfo,
      sideFilter,
      componentSettings,
    };

    const blob = new Blob([JSON.stringify(session)], { type: "application/json" });
    const sessionFile = new File([blob], `${sessionName}.json`, { type: "application/json" });

    try {
      await saveMutation.mutateAsync({
        file: sessionFile,
        name: sessionName,
        category: PNP_CATEGORY,
        notes: `${components.length} components · ${parseResult?.format || "?"} · ${calibrated ? "calibrated" : "uncalibrated"}`,
      });
      toast.success("Session saved.");
    } catch {
      // handled by interceptor
    }
  }

  async function handleLoadSession(id: number) {
    try {
      const { data } = await apiClient.get<PnPSession>(`/saved-files/${id}/download`);
      setStep(data.step);
      setFile(null); // original File not available, but state is restored
      setParseResult(data.parseResult);
      setComponents(data.components);
      setCalibrationPoints(data.calibrationPoints);
      setCalibrated(data.calibrated);
      setTransformInfo(data.transformInfo);
      setSideFilter(data.sideFilter);
      setComponentSettings(data.componentSettings);
      setShowSavedSessions(false);
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

  // ---- step 4: export (client-side YY1 CSV generation) ----
  function handleExport() {
    // YY1 template header (11 rows)
    const header = [
      "NEODEN,YY1,P&P FILE,,,,,,,,,,",
      ",,,,,,,,,,,,",
      "PanelizedPCB,UnitLength,0,UnitWidth,0,Rows,1,Columns,1,,,,",
      ",,,,,,,,,,,,",
      "Fiducial,1-X,0,1-Y,0,OverallOffsetX,0,OverallOffsetY,0,,,,",
      ",,,,,,,,,,,,",
      "NozzleChange,OFF,BeforeComponent,2,Head1,Drop,Station1,PickUp,Station3,,,,",
      "NozzleChange,OFF,BeforeComponent,3,Head1,Drop,Station3,PickUp,Station1,,,,",
      "NozzleChange,OFF,BeforeComponent,1,Head1,Drop,Station1,PickUp,Station1,,,,",
      "NozzleChange,OFF,BeforeComponent,1,Head1,Drop,Station1,PickUp,Station1,,,,",
      ",,,,,,,,,,,,",
      "Designator,Comment,Footprint,Mid X(mm),Mid Y(mm),Rotation,Head,FeederNo,Mount Speed(%),Pick Height(mm),Place Height(mm),Mode,Skip",
    ];

    const rows = filteredComponents.map((c) => {
      const s = getSettings(c.designator);
      return [
        c.designator,
        c.value ?? "",
        c.package ?? "",
        c.x.toFixed(4),
        c.y.toFixed(4),
        c.rotation.toFixed(2),
        s.head,
        s.feederNo,
        s.mountSpeed,
        0, // Pick Height
        0, // Place Height
        1, // Mode
        s.skip ? 1 : 0,
      ].join(",");
    });

    const csv = [...header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pnp_yy1_${file?.name?.replace(/\.[^.]+$/, "") || "output"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("YY1 CSV downloaded");
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
    if (calibrationPoints.length >= 4) return;
    setCalibrationPoints((prev) => [...prev, emptyPoint()]);
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
      render: (c) => <span className="font-mono text-xs">{c.x.toFixed(4)}</span>,
    },
    {
      key: "y",
      header: "Mid Y(mm)",
      render: (c) => <span className="font-mono text-xs">{c.y.toFixed(4)}</span>,
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveSession}
            disabled={saveMutation.isPending}
          >
            <BookmarkIcon className="h-4 w-4 mr-1.5" />
            {saveMutation.isPending ? "Saving..." : "Save Session"}
          </Button>
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
              Select 2-4 reference components from your design. The file coordinates will be
              filled automatically — then enter the actual machine coordinates and rotation for
              each point.
            </p>

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
                        <span className="text-xs font-medium uppercase tracking-wider">Machine (enter actual)</span>
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

            {calibrationPoints.length < 4 && (
              <Button variant="outline" size="sm" onClick={addCalibrationPoint}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Reference Point
              </Button>
            )}

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
                      onChange={(e) => setSelectedMachineId(e.target.value ? Number(e.target.value) : null)}
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
                  {feeders.length > 0 && (
                    <>
                      <Badge variant="outline">{feeders.length} feeders loaded</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          let matched = 0;
                          const updated = { ...componentSettings };
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
                              matched++;
                            }
                          });
                          setComponentSettings(updated);
                          toast.success(`Auto-assigned ${matched}/${components.length} components to feeders`);
                        }}
                      >
                        Auto-Assign Feeders
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
                disabled={saveMutation.isPending}
              >
                <BookmarkIcon className="h-4 w-4 mr-1.5" />
                {saveMutation.isPending ? "Saving..." : "Save Session"}
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
