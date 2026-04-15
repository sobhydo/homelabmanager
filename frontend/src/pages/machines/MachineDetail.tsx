import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  PencilSquareIcon,
  TrashIcon,
  ArrowLeftIcon,
  WrenchIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import { useMachine, useDeleteMachine, useMaintenanceTasks, useUpdateMachine } from "../../api/machines";
import {
  useFeeders,
  useCreateFeeder,
  useUpdateFeeder,
  useDeleteFeeder,
} from "../../api/feeders";
import type { Feeder, FeederCreate } from "../../types/feeder";
import type { Component } from "../../types/component";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import StatusBadge from "../../components/shared/StatusBadge";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import ComponentPicker from "../../components/ui/ComponentPicker";
import toast from "react-hot-toast";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MachineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const numericId = Number(id);
  const [showDelete, setShowDelete] = useState(false);

  const { data: machine, isLoading } = useMachine(numericId);
  const { data: maintenance } = useMaintenanceTasks(numericId);
  const deleteMutation = useDeleteMachine();
  const updateMachine = useUpdateMachine(numericId);

  // PCB setup form (Pick & Place machines only)
  const [pcbSetup, setPcbSetup] = useState<{
    pcb_origin_x: string;
    pcb_origin_y: string;
    nozzle_height_datum: string;
    default_mount_speed: string;
  }>({ pcb_origin_x: "", pcb_origin_y: "", nozzle_height_datum: "", default_mount_speed: "" });
  const [pcbSetupDirty, setPcbSetupDirty] = useState(false);

  // Feeder state (only used for Pick & Place machines)
  const { data: feedersData, isLoading: feedersLoading } = useFeeders(numericId);
  const feeders: Feeder[] = feedersData?.items || [];
  const createFeeder = useCreateFeeder();
  const updateFeeder = useUpdateFeeder();
  const deleteFeeder = useDeleteFeeder();
  const [showAddFeeder, setShowAddFeeder] = useState(false);
  const [editingFeederId, setEditingFeederId] = useState<number | null>(null);
  const [editFeederForm, setEditFeederForm] = useState<Partial<Feeder>>({});
  const [addFeederForm, setAddFeederForm] = useState<Partial<FeederCreate>>({
    slot_number: 1, nozzle: 1, mount_speed: 100, head: 0, pick_height: 0, place_height: 0,
  });
  const [addSelectedComponent, setAddSelectedComponent] = useState<Component | null>(null);
  const [editSelectedComponent, setEditSelectedComponent] = useState<Component | null>(null);
  const [feederTypeFilter, setFeederTypeFilter] = useState<"all" | "tape" | "flexible" | "bulk">("all");

  function handleAddComponentSelect(comp: Component | null) {
    setAddSelectedComponent(comp);
    if (comp) {
      setAddFeederForm((prev) => ({
        ...prev,
        component_value: comp.name,
        component_package: comp.package_type || prev.component_package,
        part_number: comp.mpn || comp.manufacturer_part_number || prev.part_number,
        supplier_part_number: comp.supplier_part_number || prev.supplier_part_number,
      }));
    }
  }

  function handleEditComponentSelect(comp: Component | null) {
    setEditSelectedComponent(comp);
    if (comp) {
      setEditFeederForm((prev) => ({
        ...prev,
        component_value: comp.name,
        component_package: comp.package_type || prev.component_package,
        part_number: comp.mpn || comp.manufacturer_part_number || prev.part_number,
        supplier_part_number: comp.supplier_part_number || prev.supplier_part_number,
      }));
    }
  }

  useEffect(() => {
    if (machine) {
      setPcbSetup({
        pcb_origin_x: machine.pcb_origin_x?.toString() ?? "",
        pcb_origin_y: machine.pcb_origin_y?.toString() ?? "",
        nozzle_height_datum: machine.nozzle_height_datum?.toString() ?? "",
        default_mount_speed: machine.default_mount_speed?.toString() ?? "",
      });
      setPcbSetupDirty(false);
    }
  }, [machine]);

  function updatePcbField(key: keyof typeof pcbSetup, value: string) {
    setPcbSetup((prev) => ({ ...prev, [key]: value }));
    setPcbSetupDirty(true);
  }

  function parseNum(s: string): number | null {
    if (s.trim() === "") return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  async function handleSavePcbSetup() {
    try {
      await updateMachine.mutateAsync({
        pcb_origin_x: parseNum(pcbSetup.pcb_origin_x),
        pcb_origin_y: parseNum(pcbSetup.pcb_origin_y),
        nozzle_height_datum: parseNum(pcbSetup.nozzle_height_datum),
        default_mount_speed: parseNum(pcbSetup.default_mount_speed),
      });
      toast.success("PCB setup saved");
      setPcbSetupDirty(false);
    } catch {
      // handled
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(numericId);
      toast.success("Machine deleted.");
      navigate("/machines");
    } catch {
      // handled
    }
  };

  // YY1 slot-range convention: 1-52 tape, 53-80 flexible, 81-99 bulk
  function feederType(slot: number): "tape" | "flexible" | "bulk" {
    if (slot <= 52) return "tape";
    if (slot <= 80) return "flexible";
    return "bulk";
  }

  const feederTypeBadge: Record<"tape" | "flexible" | "bulk", { label: string; variant: "blue" | "purple" | "orange" }> = {
    tape: { label: "Tape", variant: "blue" },
    flexible: { label: "Flexible", variant: "purple" },
    bulk: { label: "Bulk", variant: "orange" },
  };

  const filteredFeeders = feederTypeFilter === "all"
    ? feeders
    : feeders.filter((f) => feederType(f.slot_number) === feederTypeFilter);

  const feederTypeCounts = {
    tape: feeders.filter((f) => feederType(f.slot_number) === "tape").length,
    flexible: feeders.filter((f) => feederType(f.slot_number) === "flexible").length,
    bulk: feeders.filter((f) => feederType(f.slot_number) === "bulk").length,
  };

  function handlePrintFeederConfig() {
    if (feeders.length === 0) {
      toast.error("No feeders to print");
      return;
    }

    const sorted = [...feeders].sort((a, b) => a.slot_number - b.slot_number);
    const html = `<!DOCTYPE html>
<html><head><title>Feeder Configuration — ${machine?.name || "Machine"}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; color: #111; padding: 16px; }
  h1 { font-size: 16px; margin-bottom: 2px; }
  .meta { color: #666; font-size: 10px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; font-size: 10px; text-transform: uppercase; }
  .mono { font-family: "SF Mono", "Consolas", monospace; font-size: 10px; }
  .empty { color: #999; }
  .summary { margin-bottom: 12px; font-size: 11px; }
  @media print { body { padding: 8px; } }
</style>
</head><body>
<h1>Feeder Configuration</h1>
<div class="meta">
  Machine: ${machine?.name || "—"}
  ${machine?.manufacturer ? ` &nbsp;|&nbsp; ${machine.manufacturer} ${machine.model || ""}` : ""}
  &nbsp;|&nbsp; ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
</div>
<div class="summary"><strong>${sorted.length}</strong> feeders configured</div>
<table>
  <thead>
    <tr>
      <th>Slot</th>
      <th>Value</th>
      <th>Package</th>
      <th>Part #</th>
      <th>Supplier Part #</th>
      <th>Nozzle</th>
      <th>Speed</th>
      <th>Head</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    ${sorted.map((f) => `
    <tr>
      <td class="mono" style="font-weight:600">${f.slot_number}</td>
      <td>${f.component_value || '<span class="empty">—</span>'}</td>
      <td>${f.component_package || '<span class="empty">—</span>'}</td>
      <td class="mono">${f.part_number || '<span class="empty">—</span>'}</td>
      <td class="mono">${f.supplier_part_number || '<span class="empty">—</span>'}</td>
      <td>${f.nozzle}</td>
      <td>${f.mount_speed}%</td>
      <td>${f.head}</td>
      <td>${f.notes || '<span class="empty">—</span>'}</td>
    </tr>`).join("")}
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!machine) {
    return <p className="text-muted-foreground text-center py-16">Machine not found.</p>;
  }

  const isBambu = machine.manufacturer?.toLowerCase().includes("bambu");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/machines")}>
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1" />
        <Button variant="secondary" onClick={() => navigate(`/machines/${id}/maintenance`)}>
          <WrenchIcon className="h-4 w-4" />
          Maintenance
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/machines/${id}/edit`)}>
          <PencilSquareIcon className="h-4 w-4" />
          Edit
        </Button>
        <Button variant="danger" onClick={() => setShowDelete(true)}>
          <TrashIcon className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine Info */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-foreground mb-1">{machine.name}</h1>
                {machine.description && (
                  <p className="text-sm text-muted-foreground">{machine.description}</p>
                )}
              </div>
              <StatusBadge status={machine.status} />
            </div>

            <Separator className="my-0" />
            <div className="pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Type</p>
                  <Badge color="blue">{machine.machine_type}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Manufacturer / Model</p>
                  <p className="text-sm text-foreground">{[machine.manufacturer, machine.model].filter(Boolean).join(" ") || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Serial Number</p>
                  <p className="text-sm text-foreground font-mono">{machine.serial_number || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">IP Address</p>
                  <p className="text-sm text-foreground font-mono">{machine.ip_address || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Location</p>
                  <p className="text-sm text-foreground">{machine.location || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Purchase Price</p>
                  <p className="text-sm text-foreground">
                    {machine.purchase_price ? `${machine.purchase_price}` : "-"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Status Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Live Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`h-3 w-3 rounded-full ${machine.status === "online" ? "bg-primary" : "bg-muted-foreground/60"}`} />
                  {machine.status === "online" && (
                    <div className="absolute inset-0 h-3 w-3 rounded-full bg-primary animate-ping opacity-50" />
                  )}
                </div>
                <span className="text-sm text-foreground">{machine.status === "online" ? "Connected" : "Disconnected"}</span>
              </div>
              {isBambu && machine.status === "online" && (
                <div className="space-y-3 p-4 rounded-lg bg-background border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Bambu Lab Printer</p>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Nozzle Temp</span>
                      <span className="text-foreground">-- / -- C</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full w-0 transition-all" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Bed Temp</span>
                      <span className="text-foreground">-- / -- C</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full w-0 transition-all" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Print Progress</span>
                      <span className="text-foreground">Idle</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full w-0 transition-all" />
                    </div>
                  </div>
                </div>
              )}
              {!isBambu && (
                <p className="text-xs text-muted-foreground">
                  Live status monitoring available for supported machines.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          {maintenance && maintenance.length > 0 ? (
            <div className="space-y-0">
              {maintenance.slice(0, 5).map((task, idx) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between py-3 ${
                    idx < Math.min(maintenance.length, 5) - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm text-foreground font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {task.priority} &middot; {task.scheduled_date ? format(new Date(task.scheduled_date), "MMM d, yyyy") : "No date"}
                    </p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8 text-sm">No maintenance tasks recorded.</p>
          )}
        </CardContent>
      </Card>

      {/* PCB Setup — only for Pick & Place machines */}
      {machine.machine_type === "Pick & Place" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>PCB Setup</CardTitle>
            {pcbSetupDirty && (
              <Button size="sm" onClick={handleSavePcbSetup} disabled={updateMachine.isPending}>
                <CheckIcon className="h-4 w-4 mr-1" />
                {updateMachine.isPending ? "Saving..." : "Save"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Per-machine defaults used by the P&amp;P Converter. PCB origin is the lower-left corner of the board in the machine's logical coordinate space — exported coordinates are shifted so this point becomes (0, 0).
            </p>

            {/* Machine-side setup reminder */}
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1">
              <p className="font-semibold text-amber-400">⚠ Enter the same values on the machine</p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-0.5 ml-1">
                <li>On the machine screen, tap <strong>Parameters</strong>.</li>
                <li>Enter the machine's manufacturing year as the password (e.g. <code className="font-mono">2022</code>).</li>
                <li>Enter the <strong>PCB Origin</strong> and <strong>Nozzle Height Datum</strong> — use the same values as below so the machine and this app stay in sync.</li>
              </ol>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">PCB Origin X (mm)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 71.17"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={pcbSetup.pcb_origin_x}
                  onChange={(e) => updatePcbField("pcb_origin_x", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">PCB Origin Y (mm)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 76.84"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={pcbSetup.pcb_origin_y}
                  onChange={(e) => updatePcbField("pcb_origin_y", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nozzle Height Datum (mm)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 20.0"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={pcbSetup.nozzle_height_datum}
                  onChange={(e) => updatePcbField("nozzle_height_datum", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Default Mount Speed (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="e.g. 70"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={pcbSetup.default_mount_speed}
                  onChange={(e) => updatePcbField("default_mount_speed", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feeder Configuration — only for Pick & Place machines */}
      {machine.machine_type === "Pick & Place" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Feeder Configuration</CardTitle>
            <div className="flex gap-2">
              {feeders.length > 0 && (
                <Button variant="outline" size="sm" onClick={handlePrintFeederConfig}>
                  <PrinterIcon className="h-4 w-4 mr-1" />
                  Print
                </Button>
              )}
              <Button size="sm" onClick={() => setShowAddFeeder(!showAddFeeder)}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Feeder
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Add feeder form */}
            {showAddFeeder && (
              <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="text-sm font-medium">New Feeder Slot</div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Slot #</label>
                    <input type="number" min={1} max={99} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={addFeederForm.slot_number ?? ""} onChange={(e) => setAddFeederForm((prev) => ({ ...prev, slot_number: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs text-muted-foreground">Component</label>
                    <ComponentPicker value={addSelectedComponent} onChange={handleAddComponentSelect} placeholder="Search components..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Package</label>
                    <input className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Package" value={addFeederForm.component_package ?? ""} onChange={(e) => setAddFeederForm((prev) => ({ ...prev, component_package: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Part #</label>
                    <input className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="MPN" value={addFeederForm.part_number ?? ""} onChange={(e) => setAddFeederForm((prev) => ({ ...prev, part_number: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Supplier Part #</label>
                    <input className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="SPN" value={addFeederForm.supplier_part_number ?? ""} onChange={(e) => setAddFeederForm((prev) => ({ ...prev, supplier_part_number: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Nozzle</label>
                    <input type="number" min={1} max={10} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={addFeederForm.nozzle ?? 1} onChange={(e) => setAddFeederForm((prev) => ({ ...prev, nozzle: parseInt(e.target.value) || 1 }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Speed %</label>
                    <input type="number" min={1} max={100} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={addFeederForm.mount_speed ?? 100} onChange={(e) => setAddFeederForm((prev) => ({ ...prev, mount_speed: parseInt(e.target.value) || 100 }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Head</label>
                    <input type="number" min={0} max={4} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={addFeederForm.head ?? 0} onChange={(e) => setAddFeederForm((prev) => ({ ...prev, head: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Notes</label>
                  <input
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Optional notes..."
                    value={addFeederForm.notes || ""}
                    onChange={(e) => setAddFeederForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={createFeeder.isPending}
                    onClick={() => {
                      if (!addFeederForm.slot_number) { toast.error("Slot number is required"); return; }
                      createFeeder.mutate(
                        { ...addFeederForm, machine_id: numericId } as FeederCreate,
                        {
                          onSuccess: () => {
                            toast.success(`Feeder slot ${addFeederForm.slot_number} added`);
                            setShowAddFeeder(false);
                            setAddSelectedComponent(null);
                            setAddFeederForm({
                              slot_number: (addFeederForm.slot_number || 1) + 1,
                              nozzle: 1, mount_speed: 100, head: 0, pick_height: 0, place_height: 0,
                            });
                          },
                        }
                      );
                    }}
                  >
                    {createFeeder.isPending ? "Adding..." : "Add"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAddFeeder(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {feedersLoading ? (
              <p className="text-sm text-muted-foreground">Loading feeders...</p>
            ) : feeders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">
                No feeders configured. Click "Add Feeder" to set up slots.
              </p>
            ) : (
              <>
                {/* Type filter tabs */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Filter:</span>
                  {(["all", "tape", "flexible", "bulk"] as const).map((t) => {
                    const count = t === "all" ? feeders.length : feederTypeCounts[t];
                    const label = t === "all" ? "All" : feederTypeBadge[t].label;
                    return (
                      <Button
                        key={t}
                        variant={feederTypeFilter === t ? "default" : "outline"}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setFeederTypeFilter(t)}
                      >
                        {label} <span className="ml-1 opacity-70">({count})</span>
                      </Button>
                    );
                  })}
                  <span className="text-[10px] text-muted-foreground ml-2">
                    Slots 1–52: Tape · 53–80: Flexible · 81–99: Bulk
                  </span>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase text-muted-foreground tracking-wider">
                      <th className="text-left py-2 pr-3">Slot</th>
                      <th className="text-left py-2 pr-3">Type</th>
                      <th className="text-left py-2 pr-3">Value</th>
                      <th className="text-left py-2 pr-3">Package</th>
                      <th className="text-left py-2 pr-3">Part #</th>
                      <th className="text-left py-2 pr-3">Supplier Part #</th>
                      <th className="text-left py-2 pr-3">Nozzle</th>
                      <th className="text-left py-2 pr-3">Speed</th>
                      <th className="text-left py-2 pr-3">Head</th>
                      <th className="text-left py-2 pr-3">Notes</th>
                      <th className="text-right py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeeders.map((f) => (
                      <tr key={f.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                        {editingFeederId === f.id ? (
                          <>
                            <td className="py-2 pr-3">
                              <input type="number" min={1} className="w-16 h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={editFeederForm.slot_number ?? ""} onChange={(e) => setEditFeederForm((prev) => ({ ...prev, slot_number: parseInt(e.target.value) || 0 }))} />
                            </td>
                            <td className="py-2 pr-3">
                              {(() => {
                                const t = feederType(editFeederForm.slot_number || f.slot_number);
                                return <Badge variant={feederTypeBadge[t].variant}>{feederTypeBadge[t].label}</Badge>;
                              })()}
                            </td>
                            <td className="py-2 pr-3" colSpan={2}>
                              <ComponentPicker value={editSelectedComponent} onChange={handleEditComponentSelect} placeholder={editFeederForm.component_value || "Search..."} inputClassName="w-48" />
                            </td>
                            <td className="py-2 pr-3">
                              <input className="w-24 h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={editFeederForm.part_number ?? ""} onChange={(e) => setEditFeederForm((prev) => ({ ...prev, part_number: e.target.value }))} />
                            </td>
                            <td className="py-2 pr-3">
                              <input className="w-24 h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={editFeederForm.supplier_part_number ?? ""} onChange={(e) => setEditFeederForm((prev) => ({ ...prev, supplier_part_number: e.target.value }))} />
                            </td>
                            <td className="py-2 pr-3">
                              <input type="number" min={1} className="w-14 h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={editFeederForm.nozzle ?? 1} onChange={(e) => setEditFeederForm((prev) => ({ ...prev, nozzle: parseInt(e.target.value) || 1 }))} />
                            </td>
                            <td className="py-2 pr-3">
                              <input type="number" min={1} max={100} className="w-16 h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={editFeederForm.mount_speed ?? 100} onChange={(e) => setEditFeederForm((prev) => ({ ...prev, mount_speed: parseInt(e.target.value) || 100 }))} />
                            </td>
                            <td className="py-2 pr-3">
                              <input type="number" min={0} className="w-14 h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={editFeederForm.head ?? 0} onChange={(e) => setEditFeederForm((prev) => ({ ...prev, head: parseInt(e.target.value) || 0 }))} />
                            </td>
                            <td className="py-2 pr-3">
                              <input className="w-32 h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={editFeederForm.notes ?? ""} onChange={(e) => setEditFeederForm((prev) => ({ ...prev, notes: e.target.value }))} />
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-500"
                                  onClick={() => {
                                    const { id: _id, machine_id: _mid, created_at: _c, updated_at: _u, ...payload } = editFeederForm as Feeder;
                                    updateFeeder.mutate(
                                      { id: editingFeederId, payload },
                                      { onSuccess: () => { toast.success("Feeder updated"); setEditingFeederId(null); } }
                                    );
                                  }}
                                >
                                  <CheckIcon className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingFeederId(null)}>
                                  <XMarkIcon className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 pr-3 font-mono font-semibold">{f.slot_number}</td>
                            <td className="py-2 pr-3">
                              {(() => {
                                const t = feederType(f.slot_number);
                                return <Badge variant={feederTypeBadge[t].variant}>{feederTypeBadge[t].label}</Badge>;
                              })()}
                            </td>
                            <td className="py-2 pr-3">{f.component_value || <span className="text-muted-foreground">—</span>}</td>
                            <td className="py-2 pr-3">
                              {f.component_package ? <Badge variant="outline">{f.component_package}</Badge> : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="py-2 pr-3 font-mono text-xs">{f.part_number || <span className="text-muted-foreground">—</span>}</td>
                            <td className="py-2 pr-3 font-mono text-xs">{f.supplier_part_number || <span className="text-muted-foreground">—</span>}</td>
                            <td className="py-2 pr-3">{f.nozzle}</td>
                            <td className="py-2 pr-3">{f.mount_speed}%</td>
                            <td className="py-2 pr-3">{f.head}</td>
                            <td className="py-2 pr-3 text-xs text-muted-foreground max-w-[200px] truncate">{f.notes || "—"}</td>
                            <td className="py-2 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost" size="sm" className="h-7 w-7 p-0"
                                  onClick={() => { setEditingFeederId(f.id); setEditFeederForm({ ...f }); setEditSelectedComponent(null); }}
                                >
                                  <PencilSquareIcon className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (!confirm(`Delete feeder slot ${f.slot_number}?`)) return;
                                    deleteFeeder.mutate(f.id, { onSuccess: () => toast.success("Feeder deleted") });
                                  }}
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Machine"
        message={`Are you sure you want to delete "${machine.name}"?`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
