import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowDownTrayIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { useUploadInvoice, useProcessInvoice } from "../../api/invoices";
import type { Invoice } from "../../types/bom";
import FileUpload from "../../components/ui/FileUpload";
import Button from "../../components/ui/button";
import Badge from "../../components/ui/badge";
import Table, { type Column } from "../../components/ui/table";
import type { InvoiceItem } from "../../types/bom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvoiceUpload() {
  const navigate = useNavigate();
  const uploadMutation = useUploadInvoice();
  const processMutation = useProcessInvoice();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const handleFileSelect = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      const result = await uploadMutation.mutateAsync(file);
      setInvoice(result);
      toast.success("Invoice uploaded and parsed.");
    } catch {
      // handled
    }
  };

  const handleProcess = async () => {
    if (!invoice) return;
    try {
      await processMutation.mutateAsync(invoice.id);
      toast.success("Invoice processed. Stock updated.");
      navigate("/inventory/invoices");
    } catch {
      // handled
    }
  };

  const itemColumns: Column<InvoiceItem>[] = [
    {
      key: "description",
      header: "Description",
      render: (item) => (
        <span className="text-foreground text-sm">{item.description}</span>
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
          {item.unit_price != null ? `$${item.unit_price.toFixed(2)}` : "-"}
        </span>
      ),
    },
    {
      key: "total_price",
      header: "Total",
      render: (item) => (
        <span className="text-foreground">
          {item.total_price != null ? `$${item.total_price.toFixed(2)}` : "-"}
        </span>
      ),
    },
    {
      key: "matched",
      header: "Match",
      render: (item) =>
        item.matched ? (
          <Badge color="green">Matched</Badge>
        ) : (
          <Badge color="yellow">Unmatched</Badge>
        ),
    },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Upload Invoice</h1>
        <p className="text-sm text-muted-foreground">
          Upload a PDF invoice to automatically extract items and match them with your component inventory.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
        <FileUpload
          onFileSelect={handleFileSelect}
          accept={{ "application/pdf": [".pdf"] }}
          label="Upload PDF invoice"
          description="Drag and drop a PDF, or click to browse"
        />
        {uploadMutation.isPending && (
          <div className="mt-4 flex items-center gap-3 text-muted-foreground">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            <span className="text-sm">Processing invoice with AI...</span>
          </div>
        )}
        </CardContent>
      </Card>

      {invoice && (
        <>
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Supplier</p>
                <p className="text-sm text-foreground">{invoice.supplier || "Unknown"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Invoice #</p>
                <p className="text-sm text-foreground font-mono">{invoice.invoice_number || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Date</p>
                <p className="text-sm text-foreground">{invoice.invoice_date || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                <p className="text-sm text-foreground font-semibold">
                  {invoice.total_amount != null
                    ? `$${invoice.total_amount.toFixed(2)}`
                    : "-"}
                </p>
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Extracted Items */}
          <Card>
            <CardHeader>
              <CardTitle>Extracted Items</CardTitle>
            </CardHeader>
            <Table
              columns={itemColumns}
              data={invoice.items}
              rowKey={(item) => item.id}
              emptyMessage="No items extracted from this invoice."
            />
          </Card>

          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleProcess} loading={processMutation.isPending}>
              Process & Add to Stock
            </Button>
            {invoice.file_path && (
              <a
                href={`/api/v1/invoices/${invoice.id}/download`}
                download
                className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Download Original
              </a>
            )}
            {invoice.status === "processed" && (
              <a
                href={`/api/v1/invoices/${invoice.id}/export-csv`}
                download
                className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <DocumentTextIcon className="h-4 w-4" />
                Export Items CSV
              </a>
            )}
            <Button variant="ghost" onClick={() => navigate("/inventory/invoices")}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
