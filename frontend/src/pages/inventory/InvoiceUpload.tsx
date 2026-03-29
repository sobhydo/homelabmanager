import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowDownTrayIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { useUploadMultipleInvoices, useProcessInvoice, useImportToInventory } from "../../api/invoices";
import type { Invoice } from "../../types/bom";
import FileUpload from "../../components/ui/FileUpload";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import Table, { type Column } from "../../components/ui/table";
import type { InvoiceItem } from "../../types/bom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvoiceUpload() {
  const navigate = useNavigate();
  const uploadMutation = useUploadMultipleInvoices();
  const processMutation = useProcessInvoice();
  const importMutation = useImportToInventory();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  const activeInvoice = invoices[activeIdx] || null;
  const isProcessed = activeInvoice?.status === "processed";

  const handleFileSelect = async (files: File[]) => {
    if (!files.length) return;

    try {
      const results = await uploadMutation.mutateAsync(files);
      setInvoices(results);
      setActiveIdx(0);

      const processed = results.filter((r) => r.status === "processed");
      const uploaded = results.filter((r) => r.status === "uploaded");

      if (processed.length > 0 && uploaded.length === 0) {
        const totalItems = processed.reduce((sum, r) => sum + (r.items?.length || 0), 0);
        toast.success(`${results.length} file(s) imported: ${totalItems} items total.`);
      } else if (uploaded.length > 0) {
        toast.success(
          `${results.length} file(s) uploaded. ${uploaded.length} PDF(s) need processing.`
        );
      }
    } catch {
      // handled by react-query
    }
  };

  const handleProcess = async () => {
    if (!activeInvoice) return;
    try {
      const result = await processMutation.mutateAsync(activeInvoice.id);
      setInvoices((prev) => prev.map((inv, i) => (i === activeIdx ? result : inv)));
      toast.success(
        `Processed: ${result.items?.length || 0} items extracted.`
      );
    } catch {
      // handled
    }
  };

  const handleProcessAll = async () => {
    const unprocessed = invoices
      .map((inv, i) => ({ inv, i }))
      .filter(({ inv }) => inv.status === "uploaded");

    for (const { inv, i } of unprocessed) {
      try {
        const result = await processMutation.mutateAsync(inv.id);
        setInvoices((prev) => prev.map((existing, idx) => (idx === i ? result : existing)));
      } catch {
        toast.error(`Failed to process file ${i + 1}`);
      }
    }
    toast.success("All files processed.");
  };

  const handleImport = async () => {
    if (!activeInvoice) return;
    try {
      const result = await importMutation.mutateAsync(activeInvoice.id);
      setInvoices((prev) => prev.map((inv, i) => (i === activeIdx ? result : inv)));
      const added = result.items?.filter((i) => i.added_to_stock).length || 0;
      toast.success(`Imported ${added} items to inventory.`);
    } catch {
      // handled
    }
  };

  const allProcessed = invoices.length > 0 && invoices.every((inv) => inv.status === "processed");
  const hasUnprocessed = invoices.some((inv) => inv.status === "uploaded");
  const hasItemsToImport = activeInvoice?.items?.some((i) => !i.added_to_stock) ?? false;
  const allImported = activeInvoice?.items?.length
    ? activeInvoice.items.every((i) => i.added_to_stock)
    : false;

  const itemColumns: Column<InvoiceItem>[] = [
    {
      key: "description",
      header: "Description",
      render: (item) => (
        <div>
          <span className="text-foreground text-sm">{item.description}</span>
          {item.supplier_part_number && (
            <span className="ml-1.5 text-xs text-muted-foreground font-mono">
              [{item.supplier_part_number}]
            </span>
          )}
        </div>
      ),
    },
    {
      key: "part_number",
      header: "MPN",
      render: (item) => (
        <span className="text-muted-foreground font-mono text-xs">
          {item.part_number || "-"}
        </span>
      ),
    },
    {
      key: "suggested_category",
      header: "Category",
      render: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.suggested_category || "-"}
        </span>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      render: (item) => <span className="text-foreground">{item.quantity}</span>,
    },
    {
      key: "unit_price",
      header: "Unit Price",
      render: (item) => (
        <span className="text-foreground">
          {item.unit_price != null ? `$${item.unit_price.toFixed(4)}` : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => {
        if (item.added_to_stock) {
          return <Badge color="green">Added</Badge>;
        }
        if (item.matched) {
          return <Badge color="blue">Exists (+ stock)</Badge>;
        }
        return <Badge color="yellow">New</Badge>;
      },
    },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Upload Invoices</h1>
        <p className="text-sm text-muted-foreground">
          Upload one or more PDF invoices or LCSC CSV files to extract items and match them with your inventory.
        </p>
      </div>

      {/* Tip */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
        <p className="font-medium mb-1">LCSC Orders</p>
        <p>
          LCSC provides 3 files per order: <strong>Packing List</strong> (PDF), <strong>Commercial Invoice</strong> (PDF), and <strong>Order CSV</strong>.
          For best results, upload the <strong>CSV file</strong> — it contains all data (parts, prices, designators).
          You can also upload all 3 files together and the system will automatically merge them into a single invoice.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <FileUpload
            onFileSelect={handleFileSelect}
            accept={{
              "application/pdf": [".pdf"],
              "text/csv": [".csv"],
            }}
            maxFiles={20}
            label="Upload invoices (PDF or LCSC CSV)"
            description="Drag and drop one or more files, or click to browse. Files from the same order are merged automatically."
          />
          {uploadMutation.isPending && (
            <div className="mt-4 flex items-center gap-3 text-muted-foreground">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              <span className="text-sm">Processing {uploadMutation.variables?.length || 0} file(s)... This may take a moment for PDFs.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File tabs when multiple files uploaded */}
      {invoices.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {invoices.map((inv, i) => (
            <button
              key={inv.id}
              type="button"
              className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                i === activeIdx
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-input hover:bg-accent"
              }`}
              onClick={() => setActiveIdx(i)}
            >
              {inv.invoice_number || inv.supplier || `File ${i + 1}`}
              {inv.status === "processed" ? (
                <span className="ml-1.5 text-xs opacity-75">&#10003;</span>
              ) : (
                <span className="ml-1.5 text-xs opacity-75">&#9679;</span>
              )}
            </button>
          ))}
        </div>
      )}

      {activeInvoice && (
        <>
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle>Invoice Details</CardTitle>
                {isProcessed && (
                  <Badge color="green">Processed</Badge>
                )}
                {!isProcessed && (
                  <Badge color="yellow">Needs Processing</Badge>
                )}
                {activeInvoice.parsed_data?.includes("file_count") && (
                  <Badge color="blue">
                    Merged from {activeInvoice.parsed_data.match(/'file_count':\s*(\d+)/)?.[1] || ""} files
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Supplier</p>
                  <p className="text-sm text-foreground">{activeInvoice.supplier || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Invoice #</p>
                  <p className="text-sm text-foreground font-mono">{activeInvoice.invoice_number || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Date</p>
                  <p className="text-sm text-foreground">{activeInvoice.invoice_date || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                  <p className="text-sm text-foreground font-semibold">
                    {activeInvoice.total_amount != null
                      ? `$${activeInvoice.total_amount.toFixed(2)}`
                      : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extracted Items */}
          {isProcessed && activeInvoice.items?.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  Items
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({activeInvoice.items.length} items
                    {(() => {
                      const existing = activeInvoice.items.filter((i) => i.matched && !i.added_to_stock).length;
                      const newItems = activeInvoice.items.filter((i) => !i.matched && !i.added_to_stock).length;
                      const added = activeInvoice.items.filter((i) => i.added_to_stock).length;
                      const parts = [];
                      if (existing > 0) parts.push(`${existing} existing`);
                      if (newItems > 0) parts.push(`${newItems} new`);
                      if (added > 0) parts.push(`${added} added`);
                      return parts.length > 0 ? ` · ${parts.join(", ")}` : "";
                    })()})
                  </span>
                </CardTitle>
                {hasItemsToImport && (
                  <Button
                    size="sm"
                    onClick={handleImport}
                    loading={importMutation.isPending}
                  >
                    {importMutation.isPending
                      ? "Importing..."
                      : "Add All to Inventory"}
                  </Button>
                )}
                {allImported && (
                  <Badge color="green">All imported</Badge>
                )}
              </CardHeader>
              <Table
                columns={itemColumns}
                data={activeInvoice.items}
                rowKey={(item) => item.id}
                emptyMessage="No items extracted from this invoice."
              />
            </Card>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {!isProcessed && (
              <Button onClick={handleProcess} loading={processMutation.isPending}>
                Process This File
              </Button>
            )}
            {hasUnprocessed && invoices.length > 1 && (
              <Button
                variant="secondary"
                onClick={handleProcessAll}
                loading={processMutation.isPending}
              >
                Process All Unprocessed
              </Button>
            )}
            {allProcessed && !hasItemsToImport && (
              <Button onClick={() => navigate("/inventory/invoices")}>
                Done
              </Button>
            )}
            {activeInvoice.file_path && (
              <a
                href={`/api/v1/invoices/${activeInvoice.id}/download`}
                download
                className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download Original
              </a>
            )}
            {isProcessed && (
              <a
                href={`/api/v1/invoices/${activeInvoice.id}/export-csv`}
                download
                className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <DocumentTextIcon className="h-4 w-4" />
                Export Items CSV
              </a>
            )}
            {!allProcessed && invoices.length > 0 && (
              <Button variant="ghost" onClick={() => navigate("/inventory/invoices")}>
                Cancel
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
