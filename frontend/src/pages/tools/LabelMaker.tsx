import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import {
  PlusIcon,
  TrashIcon,
  PrinterIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  BookmarkIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import Select from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { useSearchComponents } from "../../api/components";
import {
  useSavedLabels,
  useCreateSavedLabel,
  useUpdateSavedLabel,
  useDeleteSavedLabel,
} from "../../api/savedLabels";
import { useMaterials } from "../../api/materials";
import type { Component } from "../../types/component";
import type { Material } from "../../types/tool";

// ── Label Templates ────────────────────────────────────────────────────

interface LabelTemplate {
  name: string;
  cols: number;
  rows: number;
  labelWidth: number; // mm
  labelHeight: number; // mm
  gapX: number; // mm
  gapY: number; // mm
  marginTop: number; // mm
  marginLeft: number; // mm
}

const PAPER_SIZES = [
  { value: "a4", label: "A4 (210 x 297 mm)", width: 210, height: 297 },
  { value: "letter", label: "Letter (216 x 279 mm)", width: 216, height: 279 },
] as const;

const TEMPLATES: Record<string, LabelTemplate[]> = {
  a4: [
    { name: "1 per sheet", cols: 1, rows: 1, labelWidth: 190, labelHeight: 277, gapX: 0, gapY: 0, marginTop: 10, marginLeft: 10 },
    { name: "2 per sheet", cols: 1, rows: 2, labelWidth: 190, labelHeight: 134, gapX: 0, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "4 per sheet", cols: 2, rows: 2, labelWidth: 92, labelHeight: 134, gapX: 6, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "6 per sheet", cols: 2, rows: 3, labelWidth: 92, labelHeight: 88, gapX: 6, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "8 per sheet", cols: 2, rows: 4, labelWidth: 92, labelHeight: 65, gapX: 6, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "10 per sheet", cols: 2, rows: 5, labelWidth: 92, labelHeight: 51, gapX: 6, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "12 per sheet", cols: 3, rows: 4, labelWidth: 60, labelHeight: 65, gapX: 5, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "14 per sheet", cols: 2, rows: 7, labelWidth: 92, labelHeight: 35, gapX: 6, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "16 per sheet", cols: 4, rows: 4, labelWidth: 44, labelHeight: 65, gapX: 5, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "18 per sheet", cols: 3, rows: 6, labelWidth: 60, labelHeight: 42, gapX: 5, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "21 per sheet", cols: 3, rows: 7, labelWidth: 60, labelHeight: 35, gapX: 5, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "24 per sheet", cols: 3, rows: 8, labelWidth: 60, labelHeight: 30, gapX: 5, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "36 per sheet", cols: 3, rows: 12, labelWidth: 60, labelHeight: 19, gapX: 5, gapY: 3, marginTop: 10, marginLeft: 10 },
    { name: "65 per sheet", cols: 5, rows: 13, labelWidth: 35, labelHeight: 18, gapX: 3, gapY: 3, marginTop: 10, marginLeft: 10 },
  ],
  letter: [
    { name: "1 per sheet", cols: 1, rows: 1, labelWidth: 196, labelHeight: 259, gapX: 0, gapY: 0, marginTop: 10, marginLeft: 10 },
    { name: "2 per sheet", cols: 1, rows: 2, labelWidth: 196, labelHeight: 125, gapX: 0, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "4 per sheet", cols: 2, rows: 2, labelWidth: 95, labelHeight: 125, gapX: 6, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "6 per sheet", cols: 2, rows: 3, labelWidth: 95, labelHeight: 81, gapX: 6, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "10 per sheet", cols: 2, rows: 5, labelWidth: 95, labelHeight: 47, gapX: 6, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "14 per sheet", cols: 2, rows: 7, labelWidth: 95, labelHeight: 32, gapX: 6, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "21 per sheet", cols: 3, rows: 7, labelWidth: 60, labelHeight: 32, gapX: 5, gapY: 5, marginTop: 10, marginLeft: 10 },
    { name: "30 per sheet", cols: 3, rows: 10, labelWidth: 60, labelHeight: 22, gapX: 5, gapY: 3, marginTop: 10, marginLeft: 10 },
  ],
};

// ── Label Data ─────────────────────────────────────────────────────────

interface LabelData {
  id: string;
  lines: string[];
}

function newLabel(): LabelData {
  return { id: crypto.randomUUID(), lines: [""] };
}

function labelFromComponent(c: Component): LabelData {
  const lines = [c.name];
  if (c.package_type) lines.push(c.package_type);
  if (c.mpn || c.manufacturer_part_number) lines.push(c.mpn || c.manufacturer_part_number || "");
  if (c.supplier_part_number) lines.push(`SPN: ${c.supplier_part_number}`);
  if (c.location) lines.push(c.location);
  return { id: crypto.randomUUID(), lines };
}

function labelFromMaterial(m: Material): LabelData {
  const lines = [m.name];
  if (m.category) lines.push(m.category);
  if (m.location) lines.push(m.location);
  if (m.supplier) lines.push(m.supplier);
  return { id: crypto.randomUUID(), lines };
}

// ── Source Picker (Component / Material search) ────────────────────────

function SourcePicker({
  onAddComponent,
  onAddMaterial,
}: {
  onAddComponent: (c: Component) => void;
  onAddMaterial: (m: Material) => void;
}) {
  const [source, setSource] = useState<"component" | "material">("component");
  const [search, setSearch] = useState("");
  const compSearch = source === "component" ? search : "";
  const { data: compResults } = useSearchComponents(compSearch);
  const matSearch = source === "material" ? search : "";
  const { data: matData } = useMaterials(
    { search: matSearch || undefined, page_size: 20 }
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${source === "component" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-input hover:bg-accent"}`}
          onClick={() => { setSource("component"); setSearch(""); }}
        >
          Components
        </button>
        <button
          type="button"
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${source === "material" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-input hover:bg-accent"}`}
          onClick={() => { setSource("material"); setSearch(""); }}
        >
          Materials
        </button>
      </div>
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
        <input
          className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder={`Search ${source}s...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {search.length >= 2 && (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border">
          {source === "component" ? (
            (compResults || []).length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">No components found</p>
            ) : (
              (compResults || []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                  onClick={() => { onAddComponent(c); setSearch(""); }}
                >
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[c.package_type, c.mpn || c.manufacturer_part_number, c.location].filter(Boolean).join(" · ")}
                  </p>
                </button>
              ))
            )
          ) : (
            (matData?.items || []).length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">No materials found</p>
            ) : (
              (matData?.items || []).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                  onClick={() => { onAddMaterial(m); setSearch(""); }}
                >
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[m.category, m.location].filter(Boolean).join(" · ")}
                  </p>
                </button>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function LabelMaker() {
  const [paperSize, setPaperSize] = useState<"a4" | "letter">("a4");
  const [templateIdx, setTemplateIdx] = useState(5); // default: 10 per sheet
  const [labels, setLabels] = useState<LabelData[]>([newLabel()]);
  const [fontSize, setFontSize] = useState(10);
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("normal");
  const [showBorder, setShowBorder] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [saveName, setSaveName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: savedList } = useSavedLabels();
  const createSaved = useCreateSavedLabel();
  const updateSaved = useUpdateSavedLabel();
  const deleteSaved = useDeleteSavedLabel();

  const paper = PAPER_SIZES.find((p) => p.value === paperSize)!;
  const templates = TEMPLATES[paperSize];
  const tpl = templates[templateIdx] ?? templates[0];
  const labelsPerPage = tpl.cols * tpl.rows;

  const templateOptions = templates.map((t, i) => ({
    value: String(i),
    label: t.name,
  }));

  const paperOptions = PAPER_SIZES.map((p) => ({
    value: p.value,
    label: p.label,
  }));

  const fontSizeOptions = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20].map((s) => ({
    value: String(s),
    label: `${s}pt`,
  }));

  // ── Label CRUD ──

  const addBlankLabel = useCallback(() => {
    setLabels((prev) => [...prev, newLabel()]);
  }, []);

  const addComponentLabel = useCallback((c: Component) => {
    setLabels((prev) => [...prev, labelFromComponent(c)]);
  }, []);

  const addMaterialLabel = useCallback((m: Material) => {
    setLabels((prev) => [...prev, labelFromMaterial(m)]);
  }, []);

  const duplicateLabel = useCallback((idx: number) => {
    setLabels((prev) => {
      const copy = { ...prev[idx], id: crypto.randomUUID(), lines: [...prev[idx].lines] };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  const removeLabel = useCallback((idx: number) => {
    setLabels((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateLine = useCallback((labelIdx: number, lineIdx: number, value: string) => {
    setLabels((prev) => {
      const next = [...prev];
      const lines = [...next[labelIdx].lines];
      lines[lineIdx] = value;
      next[labelIdx] = { ...next[labelIdx], lines };
      return next;
    });
  }, []);

  const addLine = useCallback((labelIdx: number) => {
    setLabels((prev) => {
      const next = [...prev];
      next[labelIdx] = { ...next[labelIdx], lines: [...next[labelIdx].lines, ""] };
      return next;
    });
  }, []);

  const removeLine = useCallback((labelIdx: number, lineIdx: number) => {
    setLabels((prev) => {
      const next = [...prev];
      const lines = next[labelIdx].lines.filter((_, i) => i !== lineIdx);
      next[labelIdx] = { ...next[labelIdx], lines: lines.length ? lines : [""] };
      return next;
    });
  }, []);

  // ── Save / Load ──

  function buildPayload() {
    return {
      paper_size: paperSize,
      template_index: templateIdx,
      font_size: fontSize,
      font_weight: fontWeight,
      show_border: showBorder,
      labels_json: JSON.stringify(labels),
    };
  }

  function handleSaveNew() {
    const name = saveName.trim();
    if (!name) { toast.error("Enter a name"); return; }
    createSaved.mutate(
      { name, ...buildPayload() },
      {
        onSuccess: (saved) => {
          toast.success(`Saved "${name}"`);
          setActiveId(saved.id);
          setSaveName("");
          setShowSaveDialog(false);
        },
      }
    );
  }

  function handleOverwrite() {
    if (!activeId) return;
    updateSaved.mutate(
      { id: activeId, payload: buildPayload() },
      { onSuccess: () => toast.success("Updated") }
    );
  }

  function handleLoad(saved: { id: number; name: string; paper_size: string; template_index: number; font_size: number; font_weight: string; show_border: boolean; labels_json: string }) {
    setPaperSize(saved.paper_size as "a4" | "letter");
    setTemplateIdx(saved.template_index);
    setFontSize(saved.font_size);
    setFontWeight(saved.font_weight as "normal" | "bold");
    setShowBorder(saved.show_border);
    try {
      setLabels(JSON.parse(saved.labels_json));
    } catch {
      setLabels([newLabel()]);
    }
    setActiveId(saved.id);
    setSaveName(saved.name);
    setShowLoadDialog(false);
    toast.success(`Loaded "${saved.name}"`);
  }

  function handleDeleteSaved(id: number, name: string) {
    if (!confirm(`Delete saved label "${name}"?`)) return;
    deleteSaved.mutate(id, {
      onSuccess: () => {
        toast.success("Deleted");
        if (activeId === id) setActiveId(null);
      },
    });
  }

  // ── Print ──

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Labels</title>
<style>
  @page { size: ${paper.width}mm ${paper.height}mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; }
  .page {
    width: ${paper.width}mm;
    height: ${paper.height}mm;
    padding-top: ${tpl.marginTop}mm;
    padding-left: ${tpl.marginLeft}mm;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  .label {
    width: ${tpl.labelWidth}mm;
    height: ${tpl.labelHeight}mm;
    margin-right: ${tpl.gapX}mm;
    margin-bottom: ${tpl.gapY}mm;
    ${showBorder ? "border: 0.3pt solid #999;" : ""}
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 1mm;
    font-size: ${fontSize}pt;
    font-weight: ${fontWeight};
    line-height: 1.3;
  }
  .label span { display: block; }
</style></head><body>${el.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // ── Build Pages ──

  const pages: LabelData[][] = [];
  for (let i = 0; i < labels.length; i += labelsPerPage) {
    pages.push(labels.slice(i, i + labelsPerPage));
  }
  // ensure at least one page
  if (pages.length === 0) pages.push([]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Label Maker
            {activeId && saveName && (
              <span className="text-base font-normal text-muted-foreground ml-2">
                — {saveName}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and print labels for components, materials, and more
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowLoadDialog(true)}>
            <FolderOpenIcon className="h-4 w-4 mr-1" />
            Load
          </Button>
          {activeId ? (
            <Button variant="outline" onClick={handleOverwrite}>
              <BookmarkIcon className="h-4 w-4 mr-1" />
              Save
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => { setSaveName(""); setShowSaveDialog(true); }}>
            <BookmarkIcon className="h-4 w-4 mr-1" />
            Save As
          </Button>
          <Button onClick={handlePrint}>
            <PrinterIcon className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="text-base">Save Label Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Enter a name..."
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveNew()}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveNew} disabled={createSaved.isPending}>
                  {createSaved.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Load dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-[480px] max-h-[70vh] flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Load Saved Labels</CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto space-y-1">
              {!savedList || savedList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No saved labels yet.
                </p>
              ) : (
                savedList.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-accent/50 transition-colors"
                  >
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => handleLoad(s)}
                    >
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.paper_size.toUpperCase()} &middot; {TEMPLATES[s.paper_size]?.[s.template_index]?.name || "Custom"}
                        {s.updated_at && ` · ${new Date(s.updated_at).toLocaleDateString()}`}
                      </p>
                    </button>
                    <button
                      type="button"
                      className="h-7 w-7 inline-flex items-center justify-center rounded text-destructive hover:bg-destructive/10 shrink-0 ml-2"
                      onClick={() => handleDeleteSaved(s.id, s.name)}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
              <div className="pt-2 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowLoadDialog(false)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
        {/* Left Panel — Settings & Labels */}
        <div className="space-y-4">
          {/* Paper & Template */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Page Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                label="Paper Size"
                options={paperOptions}
                value={paperSize}
                onChange={(e) => {
                  const v = e.target.value as "a4" | "letter";
                  setPaperSize(v);
                  setTemplateIdx(0);
                }}
              />
              <Select
                label="Labels per Sheet"
                options={templateOptions}
                value={String(templateIdx)}
                onChange={(e) => setTemplateIdx(Number(e.target.value))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Font Size"
                  options={fontSizeOptions}
                  value={String(fontSize)}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                />
                <Select
                  label="Font Weight"
                  options={[
                    { value: "normal", label: "Normal" },
                    { value: "bold", label: "Bold" },
                  ]}
                  value={fontWeight}
                  onChange={(e) => setFontWeight(e.target.value as "normal" | "bold")}
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBorder}
                  onChange={(e) => setShowBorder(e.target.checked)}
                  className="rounded border-input"
                />
                Show label borders
              </label>
            </CardContent>
          </Card>

          {/* Add from Database */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Add from Database</CardTitle>
            </CardHeader>
            <CardContent>
              <SourcePicker
                onAddComponent={addComponentLabel}
                onAddMaterial={addMaterialLabel}
              />
            </CardContent>
          </Card>

          {/* Label List */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">
                Labels <Badge className="ml-1.5">{labels.length}</Badge>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={addBlankLabel}>
                <PlusIcon className="h-3.5 w-3.5 mr-1" />
                Blank
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[50vh] overflow-y-auto">
              {labels.map((label, li) => (
                <div
                  key={label.id}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Label {li + 1}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                        title="Duplicate"
                        onClick={() => duplicateLabel(li)}
                      >
                        <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="h-6 w-6 inline-flex items-center justify-center rounded text-destructive hover:bg-destructive/10"
                        title="Remove"
                        onClick={() => removeLabel(li)}
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {label.lines.map((line, lineIdx) => (
                    <div key={lineIdx} className="flex gap-1">
                      <input
                        className="h-7 flex-1 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={line}
                        placeholder={`Line ${lineIdx + 1}`}
                        onChange={(e) => updateLine(li, lineIdx, e.target.value)}
                      />
                      {label.lines.length > 1 && (
                        <button
                          type="button"
                          className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-accent text-xs"
                          onClick={() => removeLine(li, lineIdx)}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => addLine(li)}
                  >
                    + Add line
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel — Preview */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">
              Preview{" "}
              <span className="text-muted-foreground font-normal">
                ({labels.length} label{labels.length !== 1 ? "s" : ""} &middot;{" "}
                {pages.length} page{pages.length !== 1 ? "s" : ""})
              </span>
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              {tpl.labelWidth} &times; {tpl.labelHeight} mm
            </div>
          </CardHeader>
          <CardContent className="overflow-auto">
            <div className="space-y-6 flex flex-col items-center">
              {pages.map((pageLabels, pi) => {
                // 1mm ≈ 3.78px, use that for the "real size" layout, then scale down
                const mmToPx = 3.78;
                const pageWidthPx = paper.width * mmToPx;
                const pageHeightPx = paper.height * mmToPx;
                // scale to fit ~580px wide (typical card content area)
                const scale = Math.min(580 / pageWidthPx, 1);
                return (
                  <div key={pi}>
                    <p className="text-xs text-muted-foreground mb-2">
                      Page {pi + 1}
                    </p>
                    <div
                      style={{
                        width: pageWidthPx * scale,
                        height: pageHeightPx * scale,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        className="bg-white border border-border rounded shadow-sm"
                        style={{
                          width: pageWidthPx,
                          height: pageHeightPx,
                          paddingTop: tpl.marginTop * mmToPx,
                          paddingLeft: tpl.marginLeft * mmToPx,
                          display: "flex",
                          flexWrap: "wrap",
                          alignContent: "flex-start",
                          transform: `scale(${scale})`,
                          transformOrigin: "top left",
                        }}
                      >
                        {Array.from({ length: labelsPerPage }).map((_, idx) => {
                          const label = pageLabels[idx];
                          return (
                            <div
                              key={idx}
                              className="overflow-hidden flex flex-col items-center justify-center text-center"
                              style={{
                                width: tpl.labelWidth * mmToPx,
                                height: tpl.labelHeight * mmToPx,
                                marginRight: tpl.gapX * mmToPx,
                                marginBottom: tpl.gapY * mmToPx,
                                border: showBorder
                                  ? "1px solid #bbb"
                                  : "1px dashed #e0e0e0",
                                padding: 2,
                                fontSize: `${fontSize}pt`,
                                fontWeight,
                                lineHeight: 1.35,
                                fontFamily: "Arial, Helvetica, sans-serif",
                                color: label ? "#111" : "#ddd",
                              }}
                            >
                              {label ? (
                                label.lines.map((l, i) => (
                                  <span
                                    key={i}
                                    className="block truncate w-full"
                                  >
                                    {l || "\u00A0"}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: "8pt", color: "#ccc" }}>
                                  &mdash;
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hidden print content */}
            <div ref={printRef} className="hidden">
              {pages.map((pageLabels, pi) => (
                <div key={pi} className="page">
                  {Array.from({ length: labelsPerPage }).map((_, idx) => {
                    const label = pageLabels[idx];
                    return (
                      <div key={idx} className="label">
                        {label
                          ? label.lines.map((l, i) => (
                              <span key={i}>{l || "\u00A0"}</span>
                            ))
                          : <span>&nbsp;</span>
                        }
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
