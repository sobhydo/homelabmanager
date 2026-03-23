import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { useInvoices } from "../../api/invoices";
import type { Invoice } from "../../types/bom";
import Table, { type Column } from "../../components/ui/table";
import Button from "../../components/ui/button";
import Pagination from "../../components/ui/Pagination";
import StatusBadge from "../../components/shared/StatusBadge";

export default function InvoiceHistory() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInvoices({ page, page_size: 20 });

  const columns: Column<Invoice>[] = [
    {
      key: "file_path",
      header: "File",
      render: (item) => (
        <span className="font-medium text-foreground">{item.file_path || "-"}</span>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (item) => (
        <span className="text-foreground">{item.supplier || "-"}</span>
      ),
    },
    {
      key: "invoice_number",
      header: "Invoice #",
      render: (item) => (
        <span className="text-muted-foreground font-mono text-xs">
          {item.invoice_number || "-"}
        </span>
      ),
    },
    {
      key: "total_amount",
      header: "Total",
      render: (item) => (
        <span className="text-foreground font-medium">
          {item.total_amount != null
            ? `${item.currency || "$"}${item.total_amount.toFixed(2)}`
            : "-"}
        </span>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (item) => (
        <span className="text-foreground">{item.items?.length || 0}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "created_at",
      header: "Uploaded",
      render: (item) => (
        <span className="text-muted-foreground text-sm">
          {format(new Date(item.created_at), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item) => (
        <div className="flex items-center gap-1 justify-end">
          {item.file_path && (
            <a
              href={`/api/v1/invoices/${item.id}/download`}
              download
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Download original file"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </a>
          )}
          {item.status === "processed" && (
            <a
              href={`/api/v1/invoices/${item.id}/export-csv`}
              download
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Export items as CSV"
            >
              <DocumentTextIcon className="h-4 w-4" />
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Invoice History</h1>
          <p className="text-sm text-muted-foreground">
            Uploaded invoices with AI-extracted component data.
          </p>
        </div>
        <Button onClick={() => navigate("/inventory/invoices/upload")}>
          <PlusIcon className="h-4 w-4" />
          Upload Invoice
        </Button>
      </div>

      <Table
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        rowKey={(item) => item.id}
        emptyMessage="No invoices uploaded yet."
      />

      {data && (
        <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
      )}
    </div>
  );
}
